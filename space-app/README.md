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

The app is called **FireLock**. `src/App.tsx` renders a fixed header
(`src/components/Header.tsx`) with the logo and name, the place search bar in
the middle, and a **Map / Calendar** switch on the right. The switch toggles
between the map view and the calendar view (`CalendarView.tsx`, currently an
empty placeholder). The map stays mounted while the calendar is shown, so its
position is kept, and the search bar is only shown in the map view. The favicon
is `public/favicon.svg`.

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

## External services

The app calls these third-party services directly from the browser. None of
them needs an API key.

| Service                                      | Used for                                      | Endpoint                                                 | Notes                                                                                                                                        |
| -------------------------------------------- | --------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [OpenFreeMap](https://openfreemap.org/)      | Base map: vector tiles, style, fonts, sprites | `https://tiles.openfreemap.org/styles/liberty`           | Free, no key or request limit; no uptime guarantee. Self-host or switch provider for production.                                             |
| [Photon](https://photon.komoot.io/) (Komoot) | Search bar place-name autocomplete            | `https://photon.komoot.io/api/?q=<text>&limit=6&lang=en` | Built for search-as-you-type; public instance is for light use. Requests are debounced (250 ms, 2+ characters). Self-host for heavy traffic. |

The text typed in the search bar is sent to Photon. OpenStreetMap data is used
by both services and requires the attribution already shown on the map.
