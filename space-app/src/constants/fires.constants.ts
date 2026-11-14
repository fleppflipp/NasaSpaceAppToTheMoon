/**
 * Years that have a fire tile file in `public/tiles/fires_<year>.pmtiles`
 * (built by `tiles/build_fire_tiles.py`, not stored in git). Add a year here
 * when its file exists; years outside the list show no fires.
 */
export const FIRE_TILE_YEARS: readonly number[] = [2012]

/** Folder (served by the app) and layer name inside every fire PMTiles file. */
export const FIRE_TILE_FOLDER = '/tiles'
export const FIRE_SOURCE_LAYER = 'fires'

/** Fire circles grow with the map; this is the smallest they are drawn (px). */
export const FIRE_MIN_RADIUS_PX = 2.5

/** Metres per pixel at zoom 0 on the equator, for sizing circles in kilometres. */
export const METRES_PER_PIXEL_AT_ZOOM_0 = 156543.03

/** FRP (megawatts) at which the color ramp changes. */
export const FIRE_FRP_STOPS = [0, 20, 100, 500] as const
