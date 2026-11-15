# Space App

React, TypeScript, and Vite.

Shared colors, spacing, typography, and component sizing are documented in
[the design system guide](docs/design-system.md).

## Development and checks

Run these commands from the `space-app` directory:

```sh
npm ci
npm run dev
```

Run all checks before committing:

```sh
npm run check
```

This checks TypeScript types, ESLint rules, and Prettier formatting in sequence.
Any type error, lint error, lint warning, or formatting difference makes it fail.
The checks do not modify files.

| Command                | Purpose                                                               |
| ---------------------- | --------------------------------------------------------------------- |
| `npm run typecheck`    | Check application and Vite configuration types without emitting files |
| `npm run lint`         | Run ESLint with zero allowed warnings                                 |
| `npm run lint:fix`     | Apply available ESLint fixes                                          |
| `npm run format:check` | Check formatting                                                      |
| `npm run format`       | Format files with Prettier                                            |
| `npm run build`        | Check types and create the production bundle                          |
| `npm run preview`      | Preview the production bundle                                         |

TypeScript enables `strict`, checks indexed access and optional properties,
and rejects unused variables, missing return paths, and switch fallthrough.
ESLint uses the `strictTypeChecked` and `stylisticTypeChecked` presets,
React Hooks and Fast Refresh rules, and exhaustive switch checks.
Prettier handles formatting; `eslint-config-prettier` prevents conflicting
ESLint formatting rules.

Use `.ts` and `.tsx` for application source files in `src/`.

On Windows PowerShell, if execution policy blocks `npm.ps1`, use `npm.cmd`
instead of `npm`, for example `npm.cmd run check`.

## App layout

The app is called **FireLock**. The shared layout renders a fixed header
(`src/components/Header.tsx`) with the logo and name, the place search bar in
the middle and the language picker on the right. There is one view, the map
(`/map`; `/` redirects there, unknown paths show a 404). The favicon is
`public/favicon.svg`.

See [routing and localization](docs/routing-i18n.md) for extension and
deployment instructions.

## Fire layer

The map shows the fires of **one month** at a time, every fire as a see-through
circle (`src/hooks/useFireLayers.ts`); overlapping circles are left as they are.
The circle is the fire's real size in kilometres (a small pixel floor only while
zoomed far out, fading away by zoom 12), so it grows smoothly with the zoom and
never jumps. The color follows the fire radiative power (FRP): yellow to dark red
(tokens `fire-*` in the palette). **Zoomed out only the strong fires are drawn**;
the weaker ones grow in from radius 0 while zooming closer (limits in
`FIRE_MIN_FRP_BY_ZOOM` in `fires.constants.ts`: 100 MW at zoom 0-3, down to every
fire from zoom 9). It is done in the style only, so the tiles hold every fire.
The layer sits under the map labels. The map loads a month only after the slider
has rested on it for 200 ms (`FIRE_PERIOD_DEBOUNCE_MS`), so dragging fast does not
start a tile file per step. Months without data are not on the slider;
if there is none at all, the map says so.

### How the PMTiles work, where they run and how others connect

The data is static files, one PMTiles file per month:
`tile-server/data/fires_<year>_<MM>.pmtiles` (`MM` = 01 to 12), plus
`fires_<year>.json` with the numbers of the statistics panel per month (see
"Statistics"). They are big, local and git-ignored.
A small **nginx tile server** (Docker, folder `tile-server/`, see its README)
serves that folder on port 8080 with HTTP range requests and CORS for any origin,
so the browser reads only the pieces it needs: the `pmtiles` package registers a
`pmtiles://` protocol in MapLibre, the source URL is
`pmtiles://http://localhost:8080/tiles/fires_2012_07.pmtiles`, and changing the
month just points the source at another file. Start it with
`cd tile-server && docker compose up -d`. The app finds the server through
`VITE_TILE_BASE_URL` (default `http://localhost:8080/tiles`, see `.env.example`;
set it in `.env.local` to use a teammate's server). The tiles are not part of
`dist/`.

Inside a file the layer `fires` holds the points (zoom 0-9; props `day` = days
since 2000-01-01, `s` = 0 MODIS only / 1 both / 2 VIIRS only, `f` = FRP in MW, `r`
= radius in km). The app overscales them above zoom 9. Every fire has a tippecanoe
`minzoom` from its FRP (100 MW and up from zoom 0, down to the weakest from zoom
8), matching `FIRE_MIN_FRP_BY_ZOOM` in the app, so the sparse low-zoom tiles hold
the strong fires and none of them is thinned away.

Other people can connect to them in these ways:

- On the same network, they set `VITE_TILE_BASE_URL=http://<your-ip>:8080/tiles`
  (allow port 8080 in the Windows firewall for private networks) and run their own
  `npm run dev`, or they run the same compose with a copy of `tile-server/data`.
- Another web app needs the `pmtiles` protocol, a vector source
  `pmtiles://http://<your-ip>:8080/tiles/fires_2012_07.pmtiles` and the layers
  above; CORS is already open.
- QGIS (3.32 or newer, untested here) or the `pmtiles` command line tool
  (`pmtiles show`) can open a file by its URL.
- From the internet only through a tunnel or by copying the files to a static host
  with range requests (not set up).

### Building the files

`tiles/build_fire_tiles.py` makes the 12 monthly files of one year from its
`fire_pixels_<year>.csv` (needs the Python packages `duckdb`, `numpy`, `pyarrow`
and `tippecanoe`; on Windows tippecanoe runs inside WSL):

```sh
python tiles/build_fire_tiles.py --pixels <fire_pixels_2012.csv> --year 2012   --work-dir <big temp folder> --out tile-server/data
```

DuckDB builds one row per daily fire, one point per fire is written per month with
its `minzoom`, tippecanoe writes the tiles (with `-r1`, otherwise tippecanoe's
default drop rate removes nearly all dots when zoomed out). One year (about 8
million fires) takes a few minutes; a month file is about 30 MB. There is nothing to
register: the app lists the files of the tile server, so a new month appears on the
slider by itself.
Rows whose local date falls outside the year (an edge effect of the yearly files)
are put into the first or last day of the year.

## Time period

A full-width strip at the bottom of the screen (`src/components/TimelineBar.tsx`; the
map ends above it) has **one slider** over
every month that has fire tiles (2002 to 2025 once all data exists; months without
data are skipped), with a mark and a label at the start of each year. The summary
shows the month in the active language. The list of months comes from the tile
server's folder listing (`src/hooks/useFirePeriods.ts`, nginx `autoindex_format
json`). The period is held in `AppLayout.tsx` as `{ year, month }`
(`src/services/period.ts`); it starts on the month closest to July in the latest
year that has data. All dates are UTC regardless of the display language. No external service.

### Future months (forecast)

The slider runs on past the last observed month into the months that have a
`forecast_<year>_<MM>.pmtiles` file in the same tile folder. That part of the track
has its own color with a "Future" label where it starts; while a future month is
shown, a banner (`ForecastBanner`) says the dots are an estimate, not observed
data, and the statistics panel only shows a note. The files have exactly the format
of the observed ones and are drawn by the same layers. They come from the
Chronos-2 forecast in `predictions/` (expected fires and FRP per 0.5° cell and
month, `forecast/forecast_fires.py`, one file per country after
`forecast/split_forecast_by_country.py`); `tiles/build_forecast_tiles.py` draws
that many real past fires of the same cell and calendar month (last 3 observed
years), scales their FRP to the forecast, and writes the files with
`tiles/pmtiles_points.py` (pure Python, no tippecanoe):

```sh
python tiles/build_forecast_tiles.py   # predictions/ -> tile-server/data/forecast_*.pmtiles
```

## Statistics

A tab on the right edge of the screen, halfway down (below the zoom and pencil
buttons; an arrow that points left), slides out a panel of statistics for the
shown month (`src/components/StatsPanel.tsx`, 23 rem wide,
`--layout-stats-width`). The arrow turns to point right; pressing it again
slides the panel back. The map does not move or resize: the panel covers it, and
only the zoom and pencil buttons go with the panel's edge. While it is closed the
panel is `inert`, so it cannot be reached with the keyboard.

It shows: fires and total power (FRP) against the previous month; the fires
against the same month a year earlier and against the average of that month in
the earlier years; a chart of the fires per month of the year against the average of
all years, with the shown month marked (`StatsSeasonChart.tsx`, plain SVG);
the fires per day (`StatsDays.tsx`); the biggest fire with its place; how the
fires split by strength (under 20, 20 to 100, 100 to 500, over 500 MW) and by
satellite (MODIS only, both, VIIRS only; VIIRS sees smaller fires, so counts
compare best between months with the same mix).

Moving the slider updates the panel with the same 200 ms delay as the map's tiles
(`useDebouncedValue`). A bar of the daily chart picks that day: it sets an optional
`day` (1 to 31) in the shared period, shows the date in the timeline summary and
filters the fire points by their `day` property (days since 2000-01-01); a click
on the same bar, "Show the whole month" or the slider goes back to the month.
"Show on map" flies to the biggest fire (`fitBounds` around its radius, centred
in the part of the map the panel does not cover) and puts a **marker** on it: a
light ring with a dark edge that pulses twice and then stays, with a label like "38,613 MW
· Jul 3" (`src/hooks/useFireMarker.ts`, a MapLibre marker that is a button). It
points the fire out among the many overlapping circles. It goes away when you touch
the map (click, drag, scroll or zoom by hand; the app's own flight to the fire
does not count), press the marker, change the month or search for a place.

The numbers are not computed in the browser: `tiles/build_fire_tiles.py` writes
them per month into `tile-server/data/fires_<year>.json` (fires, frp, days,
strength, sensors, biggest; the format is in the script's header), and the app
reads those files (`src/services/stats.ts`, `useYearStats`; validated, a missing
year is skipped). `python tiles/build_fire_tiles.py ... --stats-only` rewrites just
these files in seconds from the fire parquet, without tiles. The place of the
biggest fire comes from the Photon geocoder's reverse lookup (nearest named place
within 100 km; name and region in English, the country as an ISO code) once at
build time; `--no-places` skips it. No new
library.

## Language

A language picker sits at the right end of the header
(`src/components/LanguageSelect.tsx`). It shows the flag and
code of the current language; clicking opens a scrollable list with flag, code
and the language's own name, and the field can also be typed into: a code
(`ro`), a language name (English or native) or a country name finds it, arrows
and Enter select, Escape closes. Flags are SVGs from the `flag-icons` package
(MIT), loaded lazily; emoji flags do not render on Windows.

`src/constants/languages.constants.ts` lists the **eight languages** of the app:
English, Romanian, Hungarian, German, French, Spanish, Chinese (simplified) and
Hindi. Every one is translated completely: the interface, the statistics panel and
the country of the biggest fire (written from its ISO code with
`Intl.DisplayNames`; the place name and region next to it stay as the geocoder
knows them, in English). Each has a dictionary in `src/locales/<code>.ts`, declared
with `satisfies Translation`, so a missing key is a type error. English is bundled;
the others load when chosen. The translations were written by an AI assistant and
have not been reviewed by native speakers; fix wording by editing the locale file.
The document `dir` follows the language entry (`ltr` for all eight; the CSS uses
logical properties, so a right-to-left language can be added again).

The choice is saved in `localStorage` and restored on the next visit; on the first
visit the browser language is used when supported, otherwise English. Switching
language updates all text, the document `lang`/`dir` and the MapLibre control
labels without recreating the map, so position and the selected area are kept.
No external service (the flags are bundled files).

## Map

`src/components/BaseMap.tsx` renders the base map of the tool: a full-width,
Google Maps-like street map showing roads, buildings and labels, built with
[MapLibre GL JS](https://maplibre.org/). It uses the free
[OpenFreeMap](https://openfreemap.org/) `liberty` vector style (OpenStreetMap
data, no API key), so the map only downloads the vector tiles for the visible
area. Zooming far out turns it into a globe (MapLibre `globe` projection);
zooming in blends it back into a flat map. Rotation and pitch are disabled.
A **globe button** (`src/components/HomeControl.tsx`) in the top-left corner,
under the header, flies the map back to the view it has when the page loads: the whole Earth as a
globe, seen from afar (`INITIAL_CENTER` and `INITIAL_ZOOM` in
`constants/map.constants.ts`) and hides the
fire marker. The browser tab always says just "FireLock" (the title is set in
`AppLayout.tsx`, not per page).
Fire hotspots are drawn as layers on top of this map.

## Search

`src/components/SearchBar.tsx` is the header's search box with place-name autocomplete:
typing "cluj" suggests "Cluj-Napoca, Cluj, Romania" and similar places.
Picking a suggestion (click, arrow keys + Enter) flies the map there. Requests
are debounced and go through `src/services/places.ts`, which queries the free
[Photon](https://photon.komoot.io/) geocoder (OpenStreetMap data, no API key).
The public Photon instance is meant for light use; self-host it for heavy traffic.

## Area selection

The pencil button (top-right, below the zoom buttons) lets the user draw any
freehand shape on the map to select an area of interest. It is a MapLibre
control hosting `src/components/DrawControl.tsx`; the logic lives in
`src/hooks/useAreaSelection.ts`, the geometry in `src/services/lasso.ts`
(stroke to closed ring, no dependencies) and `src/services/geo.ts` (bounding
box, spherical area, formatting).

- **Zoom limit**: drawing is only allowed at or above `DRAW_MIN_ZOOM` (currently
  8, in `src/constants/map.constants.ts`), so a whole continent cannot be
  circled. Below it the button is disabled and shows "Zoom in to select an
  area"; it re-enables live while zooming, and zooming out below the limit
  leaves draw mode.
- **Drawing**: in draw mode the cursor is a crosshair, drag-pan and double-click
  zoom are off (restored afterwards), and mouse, pen and touch work through
  pointer events. Points closer than 3 px are skipped; the live stroke is a
  dashed line. Escape or the button cancels.
  Moving or zooming the map during a stroke drops the stroke.
- **Closing rules** (all in screen pixels, then converted with
  `map.unproject`, so the globe projection is handled by MapLibre): a stroke
  counts as closed when it crosses itself (the enclosed loop is kept and the
  tail is cut off) or when its end is within 24 px of its start (end is joined
  to start). Of all candidate loops only simple rings (no remaining crossings)
  of at least 400 px² qualify, and the largest wins. Otherwise the stroke is
  discarded with the message "Close the shape to select an area". The result
  is a valid closed GeoJSON `Polygon` (counter-clockwise, first position equals
  last, at least 4 positions). The limits are in `LASSO` in the same constants
  file.
- **Selection**: only one at a time; drawing a new one replaces it, the X button
  removes it. It is drawn as a translucent red fill with a solid darker red
  2 px outline (tokens `--color-selection`, `--color-selection-outline`,
  `--opacity-selection-fill`; the layers are re-added after a style reload) and
  a small "Selected area: N km²" readout shows the approximate spherical area.
- **State for later features**: `src/layouts/AppLayout.tsx` owns `selection: Polygon | null` and
  passes `selection` / `onSelectionChange` to `BaseMap`. `selectionInfo()` in
  `src/services/geo.ts` returns its bounding box and area.

Everything runs in the browser; no external service is involved and nothing
about the drawn area leaves the browser.

## External services

The app calls these third-party services directly from the browser. None of
them needs an API key.

| Service                                      | Used for                                      | Endpoint                                                 | Notes                                                                                                                                        |
| -------------------------------------------- | --------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [OpenFreeMap](https://openfreemap.org/)      | Base map: vector tiles, style, fonts, sprites | `https://tiles.openfreemap.org/styles/liberty`           | Free, no key or request limit; no uptime guarantee. Self-host or switch provider for production.                                             |
| [Photon](https://photon.komoot.io/) (Komoot) | Search bar place-name autocomplete            | `https://photon.komoot.io/api/?q=<text>&limit=6&lang=en` | Built for search-as-you-type; public instance is for light use. Requests are debounced (250 ms, 2+ characters). Self-host for heavy traffic. |

The text typed in the search bar is sent to Photon. The tile build script also
asks Photon, once per month at build time, for the place name of the biggest fire
(only its coordinates are sent).
OpenStreetMap data is used
by both services and requires a credit on the map. It stays (the licences of
OpenStreetMap and OpenMapTiles need it), but collapsed: only the (i) button in the
bottom-right corner is shown, and pressing it opens the text.
