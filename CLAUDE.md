# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**Firelock** is a web tool for firefighters, emergency responders, early-warning
teams, land managers and scientists: a **harmonized burning activity calendar**
built from satellite active-fire hotspots. The app name shown in the browser tab
and header is "Firelock"; the favicon is `space-app/public/favicon.svg`.

- MODIS (Terra/Aqua, 2000s to present) and VIIRS hotspot records from NASA FIRMS
  cannot be compared directly (different resolution, sensitivity, overpass
  times). The goal is to harmonize them into one consistent time series, so the
  sensor of origin no longer matters.
- The web app takes that harmonized data and lets the user pick an area of
  interest and a date range, then shows fire history: a calendar of hotspot
  counts per month/year with accessible color ramps, comparison of the current
  month against the historical median, anomalies against multi-year averages,
  and a CSV download of the hotspots found.
- The base UI is a Google Maps-like map (roads, buildings, labels). Fires will be
  drawn on top of it as layers.

## Current state

Work proceeds feature by feature, one feature at a time. Done so far:

1. Base map: full-width MapLibre map (OpenFreeMap `liberty` style) that turns
   into a globe when zoomed far out.
2. Search bar with place-name autocomplete (Photon geocoder).
3. Fixed header with the logo, the "Firelock" name, the search bar (map view
   only) and the language picker. There is one view, the map.

4. Freehand area selection: a pencil button on the map draws a closed
   shape that becomes the selected area (`selection` state in
   `layouts/AppLayout.tsx`, GeoJSON polygon). Drawing needs zoom >=
   `DRAW_MIN_ZOOM`.
5. URL routing (`/map`, 404) and English UI strings through
   i18next (`src/locales/eng.ts`); see `space-app/docs/routing-i18n.md`. All
   user-visible text must go through `t()`.
   Header language picker (`LanguageSelect`) with eight languages (English,
   Romanian, Hungarian, German, French, Spanish, Chinese, Hindi), each fully
   translated (UI, statistics, country names via `Intl.DisplayNames`), flags from
   `flag-icons`, lazy-loaded dictionaries; the choice is stored in `localStorage`.
7. Time period strip at the bottom of the screen (`TimelineBar`): ONE slider over every
   month that has fire tiles (no year picker; year marks under the track); the
   map always shows one month. The months come from the tile server's folder
   listing (`useFirePeriods`), `period` (`{ year, month }`) lives in
   `layouts/AppLayout.tsx`.
8. Fire layer: the fires of the selected month from per-month PMTiles files
   (`tile-server/data/fires_<year>_<MM>.pmtiles`, git-ignored, served by the
   nginx container in `tile-server/` at `VITE_TILE_BASE_URL`, built by
   `tiles/build_fire_tiles.py`; a new file shows up in the slider by itself).
   One circle per fire (real size, overlaps left as they are); zoomed out only
   the strong fires (FRP) show, weaker ones grow in while zooming closer.
   Years 2002 to 2025 so far (about 7 GB in `tile-server/data`; 2002-2011 are MODIS only); more are added as the data team delivers
   `fire_pixels_<year>.csv`.
9. Statistics panel (`StatsPanel`): a tab on the right edge, halfway down,
   slides out a panel over the map (the map does not move; the zoom and pencil
   buttons go with it): change against the previous month, last year and the
   average, a seasonal chart (this year against the average of all years), fires
   per day (a bar picks a day), the biggest fire with its place ("Show on map"
   flies there and puts a labelled ring on it that pulses twice and stays until you touch the map), strength and satellite split. The numbers come from `tile-server/data/fires_<year>.json`,
   written by `tiles/build_fire_tiles.py` (`--stats-only` rewrites just them).
10. Future months: the slider continues past the last observed month into the
   months with a `tile-server/data/forecast_<year>_<MM>.pmtiles` file (same format
   as the observed files), colored and labelled "Future", with a banner saying it
   is an estimate (`ForecastBanner`). 2026-2027 so far, from the Chronos-2 forecast
   in `predictions/` (see Data pipeline).

Planned next: selecting an area by latitude/longitude, FIRMS data
harmonization, statistics for a selected area, CSV export.

## Workflow: planning chat and implementing agent

The team works with two separate Claude sessions:

- **Planning chat** (a Claude chat/desktop session): the user discusses ideas
  and designs features there, and gets a ready-to-paste prompt for each feature.
  The planning chat does **not** edit source code; it plans, answers questions
  and writes prompts. It may edit `CLAUDE.md` when the workflow or conventions
  change.
- **Implementing agent** (Claude Code in the terminal, working in the
  background): receives the prompt and implements the feature in this repo. If
  you are reading this as the implementing agent, the rules below apply to you.

Rules for the implementing agent:

- Treat the prompt as the full specification. Read this file, `space-app/README.md`
  and `space-app/docs/design-system.md` first, then look at the existing code
  before writing anything. Stay within the scope of the prompt.
- Work autonomously. Do not stop to ask questions that a sensible default can
  answer; make the decision, and list it in the final report. Only stop and ask
  when the prompt is contradictory or a choice is hard to undo (for example a
  new paid service or a big dependency).
- Follow all agreements and conventions in this file. The standing git rule
  applies: do not use git to change anything.
- Before finishing: run the checks (see "Checks"), update `space-app/README.md`
  for the feature, and update "Current state" and "Repository layout" in this
  file.
- Finish with a short report in Hungarian: what was built, which files were
  added or changed, the result of the checks, decisions you made on your own,
  anything not verified (for example "not checked visually in a browser"), and
  open questions or suggested next steps.

## Working agreements

- **Do not use git to change anything. This is a standing rule: the user does
  not have to repeat it in every message.** Never run `git add`, `commit`,
  `push`, `pull`, `merge`, `rebase`, `reset`, `stash`, `checkout`/`switch` or
  create/delete branches, and never open pull requests. Stay on the current
  branch and leave all changes in the working tree; say what changed. Read-only
  commands (`git status`, `git diff`, `git log`) are fine. An explicit request
  for one git action in a message covers only that action, not later ones.
- **Update the README for every feature.** When a feature is added or changed,
  update `space-app/README.md` in the same change: what it does, how it works in
  a few sentences, libraries used, and any external API (add it to the "External
  services" table, with the note about keys and limits). Keep it short and in
  English.
- **Update this file** when the project state, conventions or agreements change.
- Build one feature at a time. Do not add unrequested features or UI.
- Ask before adding a new dependency or external service. Prefer free services
  that need no API key, and note privacy implications (what user input leaves
  the browser).
- Do not add Tailwind, shadcn/ui or another UI framework. The team uses plain CSS
  with the shared design tokens (see below).

## Repository layout

- The app lives in `space-app/` (React 19, TypeScript, Vite). Run all npm
  commands from that folder.
- `space-app/src/App.tsx` only mounts the router. `router/AppRouter.tsx` defines
  the routes (paths in `constants/routes.constants.ts`); `layouts/AppLayout.tsx`
  holds the searched place, the selected area and the time period and renders
  `Header`, `TimelineBar`, `BaseMap`, `StatsPanel` and the routed page (`pages/NotFound.tsx`).
- `space-app/src/i18n/`, `space-app/src/locales/`: i18next setup and the English
  dictionary (`eng.ts`).
- Data pipeline (Python, repo root, not part of the web app): see below.
- `space-app/src/components/`: React components, each with its own `.css` file.
- `space-app/src/services/`: calls to external APIs, data parsing and pure
  geometry helpers (`lasso.ts`, `geo.ts`).
- `space-app/src/hooks/`: React hooks that wrap imperative libraries (the area
  selection on the map).
- `space-app/src/constants/`: design tokens, the color palette and map
  constants (`map.constants.ts`: initial zoom, `DRAW_MIN_ZOOM`, lasso limits).
- `space-app/docs/design-system.md`: the design system guide. Read it before
  writing any UI.

## Data pipeline

Python scripts that turn the raw NASA FIRMS CSVs (local only, ignored by git)
into data for the app. Outputs are local and ignored by git too.

- `fire_calendar.py`: joins MODIS (Terra/Aqua) and VIIRS (N20) pixels into one
  row per fire per local solar day (same-pass pixels that touch, and different
  passes/satellites that overlap, form one fire). Writes
  `new_outputs/fire_clusters/*.csv` (one row per fire) and
  `new_outputs/fire_pixels/*.csv` (one row per pixel) per country.
  **`new_outputs/README_fire_files_2025.txt` is the format specification**: read
  it before touching any fire data code (columns, FRP rules: never sum FRP
  across passes).
- `src/`: earlier FRP harmonization research (`harmonize_frp.py`,
  `harmonize_regional.py`, `fit_frp_distributions.py`, `cluster_viirs.py`,
  `firms_data.py`) and the HTML overview/daily viewers (`src/viz/`).
- `tiles/build_fire_tiles.py`: `fire_pixels_<year>.csv` (all countries) to 12
  monthly files `tile-server/data/fires_<year>_<MM>.pmtiles`: DuckDB builds
  one row per daily fire (centre, radius, FRP, which sensors saw it), a point
  per fire with a `minzoom` from its FRP (strong fires from zoom 0, same limits as
  the app), tippecanoe (flag `-r1`: the default drop rate would leave no dots
  when zoomed out) (in WSL on Windows) writes the tiles. Needs `duckdb`,
  `numpy`, `pyarrow`; the venv at
  `DATAirelock_workenv` has them. See the "Fire layer" section of
  `space-app/README.md` for how the PMTiles are served and used.
- `forecast/forecast_fires.py` (Chronos-2, zero-shot): expected fires and FRP
  (q10/q50/q90) per 0.5° cell and month, 24 months ahead, in
  `predictions/<year>/fire_forecast_<year>_<Country>.csv`. It was run on fires
  read back from the PMTiles (no country there, so grouped into continent boxes);
  `forecast/split_forecast_by_country.py` then gives each cell its real country
  (from `new_outputs/fire_clusters`) and writes one file per country.
- `tiles/build_forecast_tiles.py`: `predictions/` to
  `tile-server/data/forecast_<year>_<MM>.pmtiles`: per cell it draws the forecast
  number of real past fires of the same cell and calendar month (last 3 observed
  years) and scales their FRP; `tiles/pmtiles_points.py` reads and writes the
  point PMTiles in pure Python.
- Principle agreed in the planning chat: harmonize toward the coarser common
  denominator (MODIS-equivalent counts for the calendar); the map shows only real
  detections, never invented locations.

## Design system rules

- All colors, spacing, typography, sizes, radii, shadows, z-indexes and
  durations come from the tokens in `src/constants/*.ts`, published as CSS
  variables (`--space-4`, `--color-primary`, `--radius-md`, ...). Never hardcode
  these values in component CSS. If a value is missing, add a token in
  `design.constants.ts` instead of writing a literal.
- Use logical properties (`margin-inline`, `padding-block`, `inline-size`,
  `inset-inline-start`).
- Use the shared classes (`.stack`, `.cluster`, `.grid`, `.card`,
  `.form-control`) and the global `button` styling for new UI elements.
- Transitions and motion must respect `prefers-reduced-motion`.
- Colors are not final. Do not invent a new look; build on the shared tokens
  when buttons and panels are needed.

## Code conventions

- Strict TypeScript and ESLint (`strictTypeChecked`, zero warnings). No `any`,
  no `console`, curly braces on every block, `===` only, type-only imports with
  `import type`.
- Untrusted data (API responses) is typed `unknown` and validated before use.
- Prettier: no semicolons, single quotes, trailing commas, 80 columns, LF line
  endings.
- Components are function components in `.tsx`; keep files small and focused.
- **Everything user-visible is translatable.** No literal UI text in components,
  hooks or services: add a semantic key to `src/locales/eng.ts` and use
  `useTranslation()` / `t()` (hooks and services return keys or data, not
  display text). This covers button labels, `aria-label`s, `title`s, placeholders,
  error and status messages and MapLibre control labels (the document title is just
  the app name, "FireLock", on every page).
  Use `t()` interpolation instead of concatenating strings, and keep word order
  out of the code. Format numbers and dates with `Intl` using the active
  language (`i18n.language`), not a hardcoded locale such as `'en'`. Dates
  follow the project's UTC rules regardless of language. A new UI string must be
  added to `eng.ts` (the source of truth, typed) **and to all seven other
  dictionaries** in `src/locales/` (they are typed `satisfies Translation`, so a
  missing key fails the typecheck); see `space-app/docs/routing-i18n.md`.

## Checks

Run before reporting work as done, from `space-app/`:

```sh
npm run check   # typecheck + lint + format:check
npm run build
```

Windows caveat: the working copy has CRLF line endings (git `autocrlf`), so
`format:check` reports files the team never touched. Verify formatting with
`npx prettier --check --end-of-line auto .`, which must pass. Do **not** run
`prettier --write` on files you did not change: it rewrites their line endings.
When editing existing CRLF files with scripts, preserve the CRLF.

## Running the app

```sh
npm run dev -- --port 5174 --strictPort
```

The app is at http://localhost:5174. Port 5173 may be taken by another process;
do not stop processes you did not start. In PowerShell, use `npm.cmd` if script
execution is blocked.

## Language

The user chats in Hungarian. Reply to them in Hungarian. Code, comments,
commit-ready text and documentation (README, this file) are written in English.
