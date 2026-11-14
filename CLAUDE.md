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
   only) and a Map / Calendar view switch. The calendar view is an empty
   placeholder for now; the map stays mounted (hidden) while it is shown.

Planned next: area-of-interest selection (draw or lat/lon), FIRMS data
harmonization, hotspot layers, the calendar and charts, CSV export.

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
- `space-app/src/App.tsx`: holds the current view (map or calendar) and the
  searched place, and renders `Header`, `BaseMap` and `CalendarView`.
- `space-app/src/components/`: React components, each with its own `.css` file.
- `space-app/src/services/`: calls to external APIs and data parsing.
- `space-app/src/constants/`: design tokens and the color palette.
- `space-app/docs/design-system.md`: the design system guide. Read it before
  writing any UI.

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
