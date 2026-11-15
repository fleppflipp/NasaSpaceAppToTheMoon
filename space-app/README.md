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
the middle, and a **Map / Calendar** switch on the right. The switch toggles
between the map view and the calendar view (`CalendarView.tsx`, currently an
empty placeholder). Navigation uses URL routes. The map stays mounted while the calendar is shown, so its
position is kept, and the search bar is only shown in the map view. The favicon
is `public/favicon.svg`.

See [routing and localization](docs/routing-i18n.md) for extension and
deployment instructions.

## Fire layer

The map shows the fires of **one week** at a time. Zoomed out, every fire is a
dot; from zoom 10 on, fires that overlap are merged into one **common polygon**
(`src/hooks/useFireLayers.ts`). Polygons are flat, see-through fills with a faint
outline, like the forest patches of a topographic map, colored by the strongest
fire radiative power (FRP) inside: yellow to dark red (tokens `fire-*` in the
palette). The layers sit under the map labels. Years or weeks without data show
no fires, and the map says so.

### How the PMTiles work, where they run and how others connect

The data is static files, one PMTiles file per week:
`tile-server/data/fires_<year>_w<NN>.pmtiles` (`NN` = 00 to 52), plus
`fires_<year>.json` with the counts per week. They are big, local and git-ignored.
A small **nginx tile server** (Docker, folder `tile-server/`, see its README)
serves that folder on port 8080 with HTTP range requests and CORS for any origin,
so the browser reads only the pieces it needs: the `pmtiles` package registers a
`pmtiles://` protocol in MapLibre, the source URL is
`pmtiles://http://localhost:8080/tiles/fires_2012_w30.pmtiles`, and changing the
week just points the source at another file. Start it with
`cd tile-server && docker compose up -d`. The app finds the server through
`VITE_TILE_BASE_URL` (default `http://localhost:8080/tiles`, see `.env.example`;
set it in `.env.local` to use a teammate's server). The tiles are not part of
`dist/`.

Inside a file there are two layers: `fires` (points, zoom 0-9; props `day` = days
since 2000-01-01, `s` = 0 MODIS only / 1 both / 2 VIIRS only, `f` = FRP in MW, `r`
= radius in km) and `areas` (polygons, zoom 10-12; props `f` = largest FRP, `n` =
fires merged, `s`, `d0`/`d1` = first and last day). The overview dots are thinned
where they are dense; polygons are not.

Other people can connect to them in these ways:

- On the same network, they set `VITE_TILE_BASE_URL=http://<your-ip>:8080/tiles`
  (allow port 8080 in the Windows firewall for private networks) and run their own
  `npm run dev`, or they run the same compose with a copy of `tile-server/data`.
- Another web app needs the `pmtiles` protocol, a vector source
  `pmtiles://http://<your-ip>:8080/tiles/fires_2012_w30.pmtiles` and the layers
  above; CORS is already open.
- QGIS (3.32 or newer, untested here) or the `pmtiles` command line tool
  (`pmtiles show`) can open a file by its URL.
- From the internet only through a tunnel or by copying the files to a static host
  with range requests (not set up).

### Building the files

`tiles/build_fire_tiles.py` makes the 53 weekly files of one year from its
`fire_pixels_<year>.csv` (needs the Python packages `duckdb`, `numpy`, `pyarrow`,
`shapely`, and `tippecanoe`; on Windows tippecanoe runs inside WSL):

```sh
python tiles/build_fire_tiles.py --pixels <fire_pixels_2012.csv> --year 2012   --work-dir <big temp folder> --out tile-server/data
```

DuckDB builds one row per daily fire, shapely turns every fire into a circle and
merges the overlapping ones per week, tippecanoe writes the tiles. One year
(about 8 million fires) takes about ten minutes and about 2 GB. When all weeks of a
year exist, add the year to `FIRE_TILE_YEARS` (`src/constants/fires.constants.ts`).
Rows whose local date falls outside the year (an edge effect of the yearly files)
are put into the first or last day of the year.

## Time period

A bar under the header (`src/components/TimelineBar.tsx`) picks the week: a
**year** list (the years in `FIRE_TILE_YEARS`) and **one slider** over the weeks of
that year, with a mark at each month start. Week k covers days 7k+1 to 7k+7 of the
year; the last week (52) is the one or two days that are left. The summary shows
the dates of the week in the active language. The period is held in
`AppLayout.tsx` as `{ year, week }` (`src/services/period.ts`), starts on the
latest year, week 30, and `periodDateRange()` turns it into first and last day.
All dates are UTC regardless of the display language. No external service.

## Language

A language picker sits at the right end of the header, next to the Map and
Calendar buttons (`src/components/LanguageSelect.tsx`). It shows the flag and
code of the current language; clicking opens a scrollable list with flag, code
and the language's own name, and the field can also be typed into: a code
(`ro`), a language name (English or native) or a country name finds it, arrows
and Enter select, Escape closes. Flags are SVGs from the `flag-icons` package
(MIT), loaded lazily; emoji flags do not render on Windows.

`src/constants/languages.constants.ts` lists 108 languages: the main languages of
every country in the FIRMS data folders. Each has a dictionary in
`src/locales/<code>.ts` that is loaded only when the language is chosen (English
is bundled as the fallback). Nine languages have no translation yet (empty
dictionary, they show English): Sango, Swazi, Northern Ndebele, Hiri Motu,
Chamorro, Tetum, Tongan, Fijian and Greenlandic. Most translations were written
by an AI assistant and have not been reviewed by native speakers; fix wording by
editing the locale file. Right-to-left languages (Arabic, Hebrew, Persian,
Pashto, Sorani Kurdish, Urdu, Dhivehi) set `dir="rtl"` on the document and the
layout mirrors, because the CSS uses logical properties.

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
Fire hotspots will be drawn as layers on top of this map.

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
  dashed line. Escape, the button, or switching to the calendar view cancels.
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
  `src/services/geo.ts` returns its bounding box and area. The selection
  survives switching to the calendar view and back.

Drawing runs in the browser. Once an area is selected, the fire cause panel
sends it and the week to the fire cause service (see below).

## Fire cause panel

When an area is selected, a panel opens over the top-left corner of the map
(`src/components/CausePanel.tsx`, calls in `src/services/fireCause.ts`). It
lists the fires whose centre lies inside the area in the selected week (count,
dates, total and strongest FRP), and the **Find likely cause** button asks the
fire cause service for the probable cause: one of field or stubble burning,
grass or vegetation fire, landfill or waste fire, forest fire, arson,
lightning, industrial fire, or unknown, with a confidence (high, medium, low)
and the reasons behind it (land use, season, the same spots in other years,
fire size, and links to web reports with their English translation). Under
the likely cause it shows a photo from the scene when one exists: the cover
photo of the best matching news article, credited and linked to the article,
loaded through the service (`/api/image/<id>`), never from the news site
directly. Without such an article there is no picture (never a stock photo);
a photo that fails to load is hidden.

- The service is the Python API in `../cause-service/` (see its README): it
  reads the fires from the tile server (`fire_pixels_<year>.csv`, the file the
  map tiles are built from, so the panel and the map show the same fires; or
  the local fire_calendar.py output), asks Photon (place names), OpenStreetMap
  Overpass (land use), a self-hosted degoog (web search) and a self-hosted
  LibreTranslate (translation to English), and decides with English keyword
  rules in `cause-service/rules/en.yaml`. An answer can take up to a minute.
- The app reads `VITE_CAUSE_API_URL` (default `http://localhost:8090`; see
  `.env.example`). The panel remounts when the area or the week changes.
- Answers are validated in `fireCause.ts`; unknown codes are dropped. Every
  reason, warning and error is a code translated in the `cause*` groups of
  `src/locales/eng.ts` (also in Hungarian and Romanian).
- When a service is down, the panel still answers and says which part is
  missing; when the cause service itself is down, it shows an error with a
  retry button.

## External services

The app calls these third-party services directly from the browser. None of
them needs an API key.

| Service                                      | Used for                                      | Endpoint                                                 | Notes                                                                                                                                        |
| -------------------------------------------- | --------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [OpenFreeMap](https://openfreemap.org/)      | Base map: vector tiles, style, fonts, sprites | `https://tiles.openfreemap.org/styles/liberty`           | Free, no key or request limit; no uptime guarantee. Self-host or switch provider for production.                                             |
| [Photon](https://photon.komoot.io/) (Komoot) | Search bar place-name autocomplete            | `https://photon.komoot.io/api/?q=<text>&limit=6&lang=en` | Built for search-as-you-type; public instance is for light use. Requests are debounced (250 ms, 2+ characters). Self-host for heavy traffic. |

The text typed in the search bar is sent to Photon. OpenStreetMap data is used
by both services and requires the attribution already shown on the map.

The fire cause panel calls the team's own fire cause service
(`VITE_CAUSE_API_URL`) with the drawn area and the week. That service, not the
browser, contacts Photon (reverse geocoding of the fire positions), the
OpenStreetMap Overpass API (land use at the fires), the search engines enabled
in its degoog instance (queries made of place names, the year and fire words),
and its own LibreTranslate. No key is needed except the optional degoog key;
see `../cause-service/README.md` for limits.
