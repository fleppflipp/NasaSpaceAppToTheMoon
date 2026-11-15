# Fire cause service

A small Python API (FastAPI) that guesses the **likely cause** of the fires inside an area drawn
in the web app, and shows the evidence behind the guess. The app's cause panel calls it.

## How it works

`POST /api/fire-cause` with `{ "area": <GeoJSON Polygon>, "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD" }`:

1. **Fires**: the fires whose centre lies inside the area in those days. With `FIRE_DATA_URL`
   set, they come from the tile server: `fire_pixels_<year>.csv` (the all-countries pixel file
   the map tiles are built from) is downloaded once per year into `cache/fire_pixels/` and turned
   into one row per fire exactly like `tiles/build_fire_tiles.py` does (centre = mean pixel
   centre, radius holds every pixel, FRP = pixels summed per pass, then averaged over passes), so
   the panel shows the same fires as the map. Every 10 minutes at most the service asks the
   server whether the file changed (ETag, size, date) and downloads it again if so; all years
   are downloaded in the background when the service starts. If the server cannot be reached,
   the copy already downloaded is used; with no copy the answer is `503 fireDataUnavailable`
   (never "no fires"). Without `FIRE_DATA_URL`, the local `fire_clusters_<year>_<Country>.csv`
   files of `fire_calendar.py` are read instead (one parquet per year in `cache/parquet/`).
2. **Place names**: Photon reverse geocoding at the fires gives the nearest town, nearby
   villages, the county and the country, and from the country the search language.
3. **Land use**: OpenStreetMap (Overpass API): which mapped areas contain the 5 strongest fires
   (farmland, grassland, forest, landfill, industrial...) and which landfills, airports or
   industrial sites lie within 1 km.
4. **Same spot in other years**: fires within 1 km in the other years of the data.
5. **Web search**: up to 8 queries in the local language and in English
   (`un incendiu Cluj-Napoca 2012`, `fire Cluj-Napoca March 2012`, ...; the local words are
   the `query_words` of `rules/en.yaml`, machine-translated once per language) through a self-hosted
   **degoog**, limited to 3 days before to 30 days after the fires.
6. **Translation**: the language of each title and snippet is detected, and each one is
   translated to English from its own language by a self-hosted
   **LibreTranslate**, so the rules exist only in English.
7. **Filter**: a result counts only if it names one of the places, contains a fire word, and
   does not name only other years.
8. **Keyword rules** (`rules/en.yaml`): phrases give points to a cause (title matches double,
   negated matches skipped, at most 6 points per result, one domain counts once). Context rules
   add points from steps 3 and 4, the season and the fire size. The winner and a confidence
   (`high`, `medium`, `low`, `none`) come with the reasons as codes, which the app translates.

9. **Photo from the scene**: the cover photo (`og:image`) of the best of the top 5 matching
   articles, if one has a real photo that loads (site logos, placeholders and dead links are skipped). There is never a
   stock picture: without such an article the answer has no photo. Satellite images were tried
   and left out: at 250 to 375 m per pixel the fires cannot be seen.

Every outside service is optional: when one fails, the answer still comes, with a code in
`warnings` (`placesUnavailable`, `landUseUnavailable`, `searchUnavailable`, `searchSkipped`,
`translationUnavailable`).

Other endpoints: `POST /api/fires` (step 1 only, same body; used for the panel's summary),
`GET /api/image/<id>` (the photo of step 9) and `GET /health`. Bad input answers `400 {"error": "invalidArea" | "areaTooLarge" | "invalidDates"}`
(areas up to 25,000 km², date ranges up to 31 days).

## Run with Docker (all three services)

```sh
cd cause-service
cp .env.example .env        # set DEGOOG_SETTINGS_PASSWORDS
docker compose up -d
```

Then, once:

1. Open http://localhost:4444, unlock settings with the password, and install search engines
   from the **Store** (degoog ships with none). DuckDuckGo, Brave and Wikipedia work well; avoid
   Google, which blocks scrapers.
2. LibreTranslate downloads its language models on the first start (several GB for the default
   list in `LT_LANGUAGES`; it can take a while). Check with `curl http://localhost:5000/languages`.

To add a language to LibreTranslate later, add it to `LT_LANGUAGES` in `.env`, then (models are
only downloaded on the first start):

```sh
docker compose up -d libretranslate
docker exec firelock-libretranslate /app/venv/bin/python /app/scripts/install_models.py --load_only_lang_codes "en,ro,hu,es"
docker restart firelock-libretranslate
```

degoog and LibreTranslate listen only on this machine (`127.0.0.1`). Only the cause API
(port 8090) is reachable from the network.

## Run without Docker (development)

```sh
cd cause-service
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements-dev.txt     # Windows; .venv/bin/python elsewhere
.venv/Scripts/python -m uvicorn firecause.app:app --port 8090
.venv/Scripts/python -m pytest                                    # tests, no network needed
```

degoog and LibreTranslate are then expected at `DEGOOG_URL` and `LIBRETRANSLATE_URL`
(defaults `http://localhost:4444` and `http://localhost:5000`).

## Settings (environment variables)

| Variable | Default | Meaning |
| --- | --- | --- |
| `FIRE_DATA_URL` | empty | Tile server folder with `fire_pixels_<year>.csv`, e.g. `http://10.62.232.178:8080/tiles` |
| `FIRE_CLUSTERS_DIR` | `../new_outputs/fire_clusters` | Input fires when `FIRE_DATA_URL` is empty |
| `DEGOOG_URL`, `DEGOOG_API_KEY`, `DEGOOG_ENGINES` | `http://localhost:4444`, empty, empty | degoog instance, its API key, engine ids to ask (empty = all enabled) |
| `LIBRETRANSLATE_URL`, `LIBRETRANSLATE_API_KEY` | `http://localhost:5000`, empty | LibreTranslate |
| `PHOTON_URL` | `https://photon.komoot.io` | Reverse geocoding |
| `OVERPASS_URL` | `https://overpass-api.de/api/interpreter` | OpenStreetMap land use |
| `CAUSE_CACHE_PATH` | `cache/cause_cache.sqlite` | Cache of every outside answer |
| `CAUSE_CORS_ORIGINS` | `http://localhost:5173,http://localhost:5174` | Web app origins allowed to call the API |

## Changing the rules

Edit `rules/en.yaml` (English only; the file explains the format) and restart the service.
`tests/test_rules.py` shows the expected behaviour. Before trusting a change, check it on fires
whose cause is known.

## Privacy and limits

- What leaves the machine: fire coordinates (to Photon and Overpass) and place names, dates and
  fire words (to the search engines, through degoog). Nothing about the user.
- Photos: the service downloads the article page and its photo itself, and the browser gets the
  photo from `/api/image/<id>`, so news sites never see the user. Only ids the service handed out
  can be fetched (not an open proxy), every request and redirect must go to a public address
  (no localhost or private network), pages are limited to 1.5 MB and photos to 5 MB and to
  JPEG, PNG, WebP or GIF. The photo belongs to the news site: the app credits and links it.
- Photon and Overpass are free public services for light use; the cache keeps repeat requests
  away from them. Overpass can take 30 to 60 seconds per area.
- Most small fires (field and grass burning) are never in the news, so for them the answer
  rests on land use and season, with `medium` or `low` confidence.
- degoog is AGPL-3.0 and runs unmodified in its own container. It is in beta, and engines can
  rate-limit or block it (they then return no results, and `searchUnavailable` appears only
  when every query failed).
