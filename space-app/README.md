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

Everything runs in the browser; no external service is involved and nothing
about the drawn area leaves the browser.

## External services

The app calls these third-party services directly from the browser. None of
them needs an API key.

| Service                                      | Used for                                      | Endpoint                                                 | Notes                                                                                                                                        |
| -------------------------------------------- | --------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [OpenFreeMap](https://openfreemap.org/)      | Base map: vector tiles, style, fonts, sprites | `https://tiles.openfreemap.org/styles/liberty`           | Free, no key or request limit; no uptime guarantee. Self-host or switch provider for production.                                             |
| [Photon](https://photon.komoot.io/) (Komoot) | Search bar place-name autocomplete            | `https://photon.komoot.io/api/?q=<text>&limit=6&lang=en` | Built for search-as-you-type; public instance is for light use. Requests are debounced (250 ms, 2+ characters). Self-host for heavy traffic. |

The text typed in the search bar is sent to Photon. OpenStreetMap data is used
by both services and requires the attribution already shown on the map.
