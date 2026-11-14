# Routing and localization

The declarative React Router tree in `src/router/AppRouter.tsx` uses shared paths
from `src/constants/routes.constants.ts`. `/` redirects to `/map` with history
replacement, `/calendar` shows the placeholder, and unknown paths show a 404.
The shared layout keeps the map mounted across navigation; it resizes when
shown again. Map position is not persisted across reloads.

To add a page, add its path to the route constants, add a route and component,
and add a `NavLink` and translated label in the header if it needs navigation.
Add its translated document title to the layout as well. Paths remain independent
of language. Future shareable AOI, period and sensor filters are expected in URL
query parameters; no parameter schema is implemented yet.

English is `src/locales/eng.ts`, registered under the standard `en` code in
`src/i18n/index.ts`. Add semantic keys there and use `useTranslation()` in
components; i18next's type augmentation derives valid keys from this dictionary.
For Hungarian, create `hun.ts` with an object declared using `satisfies
Translation` (import the type from `eng.ts`), then register it as `hu` in the
resources. The type checks the same keys while allowing different string values.
Once a selector is needed, call `i18n.changeLanguage('hu')` from it; the document
language and rendered translations update. Only English is registered today.
Language and time zone are independent: future observation dates must follow the
project's UTC rules. Photon currently requests English place names.

MapLibre UI labels are provided through its `locale` option. Changing language
recreates the map to apply these labels; route navigation does not. Map labels
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
