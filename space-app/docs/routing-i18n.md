# Routing and localization

The declarative React Router tree in `src/router/AppRouter.tsx` uses shared paths
from `src/constants/routes.constants.ts`. `/` redirects to `/map` with history
replacement, and unknown paths show a 404. The only view is the map.
The shared layout keeps the map mounted; it resizes when shown again. Map position is not persisted across reloads.

To add a page, add its path to the route constants, add a route and component,
and add a `NavLink` and translated label in the header if it needs navigation.
The document title is the same on every page (just the app name), so it needs
no translation. Paths remain independent
of language. Future shareable AOI, period and sensor filters are expected in URL
query parameters; no parameter schema is implemented yet.

English is `src/locales/eng.ts`, registered under the standard `en` code in
`src/i18n/index.ts`. Add semantic keys there and use `useTranslation()` in
components; i18next's type augmentation derives valid keys from this dictionary.
English is `src/locales/eng.ts` and is always bundled. Eight languages (en, ro, hu,
de, fr, es, zh, hi) are listed in `src/constants/languages.constants.ts`; every other
dictionary lives in `src/locales/<code>.ts` (a default export declared with
`satisfies Translation`: it must have every key of the English one, so a missing
translation is a type error) and is loaded on demand by `setLanguage()` in
`src/i18n/index.ts`. To add a language, create the
locale file, add an entry (flag = a code from `flag-icons`, `dir` = `ltr` or
`rtl`) to `LANGUAGES`, and it appears in the header's `LanguageSelect`. The
choice is stored in `localStorage` under `firelock.language`, and the document
`lang` and `dir` follow it. A new key must be translated in all eight dictionaries.
Language and time zone are independent: future observation dates must follow the
project's UTC rules. Photon currently requests English place names.

MapLibre UI labels are provided through its `locale` option. MapLibre reads them only
when the map is created, so the map is created once and its control labels are
updated in `BaseMap.tsx` when the language changes. Map labels
inside the external OpenFreeMap style and tiles are not translated by i18next.
The style and its source data determine which languages are available. External
attribution remains supplied by the map provider.

Browser routing requires hosting to serve `index.html` for application routes,
including direct requests and refreshes. Vite provides this fallback locally;
no deployment platform configuration was found in this repository. Verify the
fallback on the actual host before deployment.

References: [React Router declarative routing](https://reactrouter.com/start/declarative/routing),
[i18next TypeScript](https://www.i18next.com/overview/typescript), and
[MapLibre map options](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MapOptions/).
