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

/** The map waits this long after the last month change before loading its tiles (a dragged slider passes many months). */
export const FIRE_PERIOD_DEBOUNCE_MS = 200

/** The ring that points out a fire pulses this many times (one pulse lasts the given time), then stays still. */
export const FIRE_MARKER_PULSES = 2
export const FIRE_MARKER_PULSE_MS = 1200

/** The layer inside every monthly file: one dot per fire (zoom 0-9, overscaled above). */
export const FIRE_POINTS_LAYER = 'fires'

/** The tiles hold the dots up to this zoom; closer in, the map enlarges them. */
export const FIRE_POINTS_MAX_ZOOM = 9

/**
 * Weakest fire (FRP in MW) drawn from each zoom on, as [zoom, MW] steps. Zoomed
 * out only the strong fires show; the weaker ones grow in while zooming closer.
 */
export const FIRE_MIN_FRP_BY_ZOOM = [
  [0, 100],
  [4, 60],
  [5, 40],
  [6, 25],
  [7, 15],
  [8, 8],
  [9, 0],
] as const

/** Dots are never drawn smaller than this (px) when zoomed out; the floor fades out when zoomed in. */
export const FIRE_MIN_RADIUS_PX = 2.5

/** Metres per pixel at zoom 0 on the equator, for sizing circles in kilometres. */
export const METRES_PER_PIXEL_AT_ZOOM_0 = 156543.03

/** FRP (megawatts) at which the color ramp changes. */
export const FIRE_FRP_STOPS = [0, 20, 100, 500] as const

/** See-through fills, so overlapping fires stay readable. */
export const FIRE_FILL_OPACITY = 0.55
