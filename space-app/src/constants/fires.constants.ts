/**
 * Years that have fire tiles in `tile-server/data/fires_<year>_w<NN>.pmtiles`, one
 * file per week (built by `tiles/build_fire_tiles.py`, not stored in git). Add
 * a year here once all its weeks exist; the year then appears in the picker.
 */
export const FIRE_TILE_YEARS: readonly number[] = [2012]

const DEFAULT_TILE_BASE_URL = 'http://localhost:8080/tiles'
const configuredTileBaseUrl: unknown = import.meta.env['VITE_TILE_BASE_URL']

/**
 * Where the tile server (see `tile-server/`) serves the fire PMTiles files from.
 * Set `VITE_TILE_BASE_URL` in `.env.local` to use another machine's server.
 */
export const FIRE_TILE_BASE_URL = (
  typeof configuredTileBaseUrl === 'string' && configuredTileBaseUrl !== ''
    ? configuredTileBaseUrl
    : DEFAULT_TILE_BASE_URL
).replace(/\/+$/, '')

/** The two layers inside every weekly file: overview dots and merged polygons. */
export const FIRE_POINTS_LAYER = 'fires'
export const FIRE_AREAS_LAYER = 'areas'

/** From this zoom the merged polygons are drawn instead of the dots (same as in the tiles). */
export const FIRE_AREAS_MIN_ZOOM = 10

/** Overview dots grow with the map; this is the smallest they are drawn (px). */
export const FIRE_MIN_RADIUS_PX = 2.5

/** Metres per pixel at zoom 0 on the equator, for sizing circles in kilometres. */
export const METRES_PER_PIXEL_AT_ZOOM_0 = 156543.03

/** FRP (megawatts) at which the color ramp changes. */
export const FIRE_FRP_STOPS = [0, 20, 100, 500] as const

/** Flat, see-through fills like the forest patches of a topographic map. */
export const FIRE_FILL_OPACITY = 0.55
export const FIRE_OUTLINE_OPACITY = 0.35
export const FIRE_OUTLINE_WIDTH_PX = 0.75
