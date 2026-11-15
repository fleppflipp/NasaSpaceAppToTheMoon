# Firelock

Firelock is a web tool for firefighters, emergency responders, early-warning
teams, land managers and scientists: a **burning activity calendar** built from
NASA FIRMS satellite active-fire hotspots (MODIS Terra/Aqua and VIIRS). MODIS and
VIIRS pixels are joined into one row per fire per local solar day, so the map
shows fires, not sensor detections. The app shows one month at a time on a
globe/street map, with a statistics panel, a fire cause panel for a drawn area
and a Chronos-2 forecast of the next 24 months.

This page explains how to get **everything running from a fresh clone**: the
data pipeline that builds the map data from the raw NASA files, the servers and
the web app. Details of each part are in the READMEs linked below.

| Part | Folder | Docs |
| --- | --- | --- |
| Web app (React, TypeScript, Vite, MapLibre) | `space-app/` | [space-app/README.md](space-app/README.md) |
| Tile server (nginx, serves the PMTiles) | `tile-server/` | [tile-server/README.md](tile-server/README.md) |
| Fire cause service (Python, FastAPI) | `cause-service/` | [cause-service/README.md](cause-service/README.md) |
| Fire joining (MODIS + VIIRS -> daily fires) | `fire_calendar.py` | [new_outputs/README_fire_files_2025.txt](new_outputs/README_fire_files_2025.txt) |
| Map tiles | `tiles/` | script headers |
| Forecast (Chronos-2) | `forecast/` | script headers |
| Earlier FRP harmonization research (not needed by the app) | `src/` | script headers |
| How we used AI | | [AI_USAGE.md](AI_USAGE.md) |

## Getting started

### 0. What you need

| Tool | Version we used | Needed for |
| --- | --- | --- |
| Git | any | cloning |
| Node.js + npm | Node 22 (20+ should work) | the web app, `csv-server/` |
| Python | 3.13 (3.11+ should work) | the data pipeline, the cause service without Docker |
| Docker Desktop (or Docker Engine + Compose) | 29 | the tile server and the fire cause service |
| tippecanoe | 2.x | building the map tiles. **Windows:** inside WSL, in a distribution named exactly `Ubuntu` (`wsl --install -d Ubuntu`, then in Ubuntu `sudo apt install tippecanoe`). Linux/macOS: install it natively (`apt install tippecanoe` / `brew install tippecanoe`, or build it from <https://github.com/felt/tippecanoe>). |

Disk and time, measured on our machines for 2002-2025: the finished tiles are
about **7 GB** (`tile-server/data/`); the raw FIRMS CSVs and the yearly pixel
files are larger, and building the tiles writes big temporary files (pass a
`--work-dir` on a disk with room). One year of tiles takes a few minutes; the
Chronos-2 forecast took about **3 hours on a CPU**. LibreTranslate (cause
service) downloads several GB of language models on its first start. No API key
is needed anywhere.

Python packages for the pipeline (a virtual environment is recommended):

```sh
python -m venv .venv
# Windows: .venv\Scripts\activate    Linux/macOS: source .venv/bin/activate
pip install -r requirements-pipeline.txt
```

`chronos-forecasting` pulls in PyTorch (CPU is enough). The model weights
(`amazon/chronos-2`) are downloaded from Hugging Face on the first forecast run.

All commands below run from the **repository root** unless stated otherwise.

### 1. Download the raw NASA FIRMS data

Get the yearly **"Download by country"** archives from the FIRMS archive
(<https://firms.modaps.eosdis.nasa.gov/country/>, free, no account needed):

- MODIS (Collection 6.1, Terra + Aqua): `modis_<year>_all_countries.zip`, for every
  year you want (we used 2002-2025).
- VIIRS S-NPP (375 m): `viirs-snpp_<year>_all_countries.zip`, from 2012 (the
  first full year of VIIRS). Years before 2012 are MODIS only.

Unzip them so the files end up in exactly this layout (the zips contain
`modis/<year>/...` and `viirs-snpp/<year>/...`; **rename `viirs-snpp/` to
`viirs/`**):

```text
modis/2025/modis_2025_Hungary.csv
modis/2025/modis_2025_Romania.csv
...
viirs/2025/viirs-snpp_2025_Hungary.csv
...
```

`modis/` and `viirs/` are git-ignored. To try the pipeline quickly, a single
year (for example 2025) is enough; the forecast needs many years to be useful.

### 2. Join MODIS and VIIRS into daily fires (`fire_calendar.py`)

Two outputs are needed:

```sh
# a) one all-country pixel file per year -> harmonized/fire_pixels_<year>.csv
#    (input of the map tiles and of the fire cause service)
python fire_calendar.py --all --all-years --layout annual-pixels --out harmonized

# b) per-country files -> new_outputs/fire_clusters/ and new_outputs/fire_pixels/
#    (used to give forecast cells their country; also a fallback for the cause service)
python fire_calendar.py --all --year 2025
```

For (b) one recent year is enough; run it for more years (`--year 2024`, ...)
if you want, every year adds countries to cells that burned only then. Use
`--year 2025` instead of `--all-years` in (a) to rebuild one year. Self-test:
`python fire_calendar.py --selftest`. The output columns and the rules (which
pixels form one fire, FRP is never summed across passes) are in
[new_outputs/README_fire_files_2025.txt](new_outputs/README_fire_files_2025.txt).

### 3. Build the map tiles (`tiles/build_fire_tiles.py`)

One run per year writes 12 files `tile-server/data/fires_<year>_<MM>.pmtiles`
and the statistics `tile-server/data/fires_<year>.json`:

```sh
python tiles/build_fire_tiles.py --pixels harmonized/fire_pixels_2025.csv --year 2025 --work-dir <big temp folder> --out tile-server/data
```

All years, PowerShell:

```powershell
foreach ($y in 2002..2025) { python tiles/build_fire_tiles.py --pixels "harmonized/fire_pixels_$y.csv" --year $y --work-dir D:/firelock_work --out tile-server/data }
```

bash:

```sh
for y in $(seq 2002 2025); do python tiles/build_fire_tiles.py --pixels harmonized/fire_pixels_$y.csv --year $y --work-dir /tmp/firelock_work --out tile-server/data; done
```

The statistics ask the free Photon geocoder once per month for the place of the
biggest fire (only its coordinates are sent); `--no-places` skips it. A new
month appears on the app's time slider by itself.

### 4. Forecast the next 24 months (`forecast/`, optional)

Needs the observed tiles of step 3 (all years 2002-2025 for good results) and
the per-country clusters of step 2b. The chain is:

```sh
# a) read the fires back out of the tiles, grouped into continent boxes
#    -> new_outputs/forecast_input/fire_clusters_<year>_<Region>.csv
python forecast/pmtiles_to_clusters.py

# b) Chronos-2 per 0.5 degree cell and month (about 3 hours on a CPU)
#    -> new_outputs/forecast_regions/<year>/fire_forecast_<year>_<Region>.csv
python forecast/forecast_fires.py --input new_outputs/forecast_input --out new_outputs/forecast_regions

# c) give every cell its real country -> predictions/<year>/fire_forecast_<year>_<Country>.csv
python forecast/split_forecast_by_country.py --raw new_outputs/forecast_regions --out predictions

# d) draw real past fires of the same cell and month as the forecast says
#    -> tile-server/data/forecast_<year>_<MM>.pmtiles (pure Python, no tippecanoe)
python tiles/build_forecast_tiles.py
```

`python forecast/forecast_fires.py --selftest` checks the time-step logic without
data; `--prepare-only` builds the series without the model. Optional quality
check (backtest: the model sees 2002-2024 and predicts 2025, compared with the
real 2025 and two simple baselines):

```sh
python forecast/forecast_fires.py --input new_outputs/forecast_input --last-date 2024-12-31 --horizon 12 --out predictions/backtest_2025
python forecast/eval_backtest.py    # -> predictions/backtest_2025/EVALUATION.txt
```

The map only ever shows real past detections: a forecast month reuses real fire
positions of earlier years and only changes how many there are and their power.

### 5. Start the tile server

```sh
cd tile-server
docker compose up -d
curl http://localhost:8080/tiles/     # JSON list of the files
```

It serves `tile-server/data/` at `http://localhost:8080/tiles` with byte ranges
and CORS. If you received a copy of `tile-server/data/` from the team, you can
skip steps 1-4 for the map; the cause service still needs fire data (step 6).

### 6. Start the fire cause service (needed for the cause panel)

```sh
cd cause-service
cp .env.example .env        # then set DEGOOG_SETTINGS_PASSWORDS to a password of your own
docker compose up -d        # cause API :8090, degoog :4444, LibreTranslate :5000
```

Then, once:

1. Open <http://localhost:4444>, unlock the settings with your password and
   install search engines from the **Store** (degoog ships with none;
   DuckDuckGo, Brave and Wikipedia work well).
2. Wait for LibreTranslate to download its models
   (`curl http://localhost:5000/languages` answers when ready).

The service reads the fires from `harmonized/fire_pixels_<year>.csv` (step 2a)
by default. To use another machine's data instead, set `FIRE_DATA_URL` in
`.env` to a tile server folder that also holds the `fire_pixels_<year>.csv`
files. Check: `curl http://localhost:8090/health`. Running it without Docker is
described in [cause-service/README.md](cause-service/README.md).

### 7. Start the web app

```sh
cd space-app
npm ci
npm run dev -- --port 5174 --strictPort
```

Open <http://localhost:5174>. The defaults expect the tile server at
`http://localhost:8080/tiles` and the cause service at `http://localhost:8090`;
to change them, copy `space-app/.env.example` to `space-app/.env.local` and edit
`VITE_TILE_BASE_URL` / `VITE_CAUSE_API_URL` (for example a teammate's
`http://<their-ip>:8080/tiles`). On Windows PowerShell use `npm.cmd` if script
execution is blocked.

Without Docker: if the tile server cannot be reached at startup, `npm run dev`
serves the observed `fires_<year>_<MM>.pmtiles` and `fires_<year>.json` files from
the repository's `data/` folder instead (copy them there). Forecast months are
only shown through the tile server.

Production build: `npm run build` (output in `space-app/dist/`, the tiles are not
part of it), preview with `npm run preview`.

### 8. Try every feature

| Feature | How to try it |
| --- | --- |
| Map and globe | Zoom far out: the map turns into a globe. The globe button (top left) flies back to the start view. |
| Place search | Type a place (for example `cluj`) in the header and pick a suggestion. |
| Language | Header picker: English, Romanian, Hungarian, German, French, Spanish, Chinese, Hindi. |
| Time slider | Bottom strip: drag over every month with data (2002-2025). |
| Fire layer | Zoomed out only strong fires show; zoom in and weaker ones grow in. Click a fire for its details. |
| Future months | Drag past December 2025: the "Future" part (2026-2027) with the forecast banner (needs step 4). |
| Statistics | Tab on the right edge: change against last month/year/average, seasonal chart, fires per day (click a bar to pick a day), biggest fire with "Show on map". |
| Area selection | Zoom in to at least zoom 8, press the pencil and draw a closed shape. |
| Fire cause | With an area selected, the panel lists its fires; press **Find likely cause** (can take up to a minute; needs step 6). |

### 9. Checks and tests

```sh
cd space-app && npm run check && npm run build      # typecheck, lint, format, bundle
python fire_calendar.py --selftest                  # from the repository root
python -m unittest discover -s tests -v
python forecast/forecast_fires.py --selftest
cd cause-service && python -m pytest                # needs requirements-dev.txt
```

On Windows the working copy may have CRLF line endings, so check the formatting
with `npx prettier --check --end-of-line auto .` in `space-app/`.

### Troubleshooting

- **The slider is empty / "no data"**: the tile server is not running or
  `tile-server/data/` has no `fires_*.pmtiles`. Check `http://localhost:8080/tiles/`.
- **`wsl` error while building tiles on Windows**: tippecanoe must be installed
  in a WSL distribution named `Ubuntu` (`wsl -l` lists them).
- **The cause panel says the service is down**: check `docker compose ps` in
  `cause-service/` and that `CAUSE_CORS_ORIGINS` contains the app's address.
- **`fireDataUnavailable` in the cause panel**: there is no
  `harmonized/fire_pixels_<year>.csv` for that year (step 2a) and no
  `FIRE_DATA_URL`.
- **No web reasons in the cause answer**: no search engine is installed in
  degoog yet (step 6.1).

## Data and privacy

All data and generated files (raw FIRMS CSVs, `harmonized/`, `new_outputs/`,
`predictions/`, `tile-server/data/`) stay local and are git-ignored; only the
code that makes them is in the repository. The browser contacts OpenFreeMap (base
map) and Photon (search text); the cause service contacts Photon, Overpass and
the search engines in its degoog instance. The full list with limits is in the
"External services" sections of [space-app/README.md](space-app/README.md) and
[cause-service/README.md](cause-service/README.md).

Fire data: NASA FIRMS (MODIS Collection 6.1 and VIIRS S-NPP 375 m active fire
products). Base map: OpenFreeMap, OpenStreetMap contributors.
