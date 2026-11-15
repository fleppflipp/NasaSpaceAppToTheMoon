const DEFAULT_CAUSE_API_URL = 'http://localhost:8090'
const configuredCauseApiUrl: unknown = import.meta.env['VITE_CAUSE_API_URL']

/**
 * Where the fire cause service (see `cause-service/`) runs. Set
 * `VITE_CAUSE_API_URL` in `.env.local` to use another machine's service.
 */
export const CAUSE_API_URL = (
  typeof configuredCauseApiUrl === 'string' && configuredCauseApiUrl !== ''
    ? configuredCauseApiUrl
    : DEFAULT_CAUSE_API_URL
).replace(/\/+$/, '')

/** Cause categories of the keyword rules (`cause-service/rules/en.yaml`). */
export const CAUSE_CATEGORIES = [
  'agricultural',
  'vegetation',
  'landfill',
  'wildfire',
  'arson',
  'lightning',
  'industrial',
  'unknown',
] as const

export const CAUSE_CONFIDENCES = ['high', 'medium', 'low', 'none'] as const

/** Land classes from OpenStreetMap (`cause-service/firecause/landuse.py`). */
export const LAND_CLASSES = [
  'landfill',
  'farmland',
  'grassland',
  'wetland',
  'forest',
  'industrial',
  'airport',
  'residential',
] as const

/** Reason codes the service explains its answer with. */
export const CAUSE_REASONS = [
  'webSources',
  'noWebReports',
  'landInside',
  'landNear',
  'season',
  'recurring',
  'smallFires',
  'largeFires',
  'tie',
] as const

/** Outside services that did not answer (the answer is then less complete). */
export const CAUSE_WARNINGS = [
  'placesUnavailable',
  'landUseUnavailable',
  'searchUnavailable',
  'searchSkipped',
  'translationUnavailable',
] as const

/** Errors the service answers bad requests with. */
export const CAUSE_API_ERRORS = [
  'invalidArea',
  'areaTooLarge',
  'invalidDates',
  'fireDataUnavailable',
] as const

/** How many web sources the panel lists. */
export const MAX_SHOWN_SOURCES = 6
