import * as maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import { FIRE_TILE_BASE_URL } from '../constants/fires.constants'
import { comparePeriods } from './period'
import type { Period } from './period'

let registered = false

/** Lets MapLibre read `pmtiles://` sources (done once, before any map loads them). */
export function registerPmtilesProtocol(): void {
  if (registered) {
    return
  }
  registered = true
  const protocol = new Protocol()
  maplibregl.addProtocol('pmtiles', protocol.tile)
}

/**
 * Source URL of the fire tiles of one month, from the tile server: the observed
 * fires, or for a future month the forecast (same format, see
 * `tiles/build_forecast_tiles.py`).
 */
export function fireTileUrl({ year, month }: Period, forecast = false): string {
  const prefix = forecast ? 'forecast' : 'fires'
  const name = `${prefix}_${String(year)}_${String(month).padStart(2, '0')}.pmtiles`
  return `pmtiles://${FIRE_TILE_BASE_URL}/${name}`
}

const TILE_FILE = /^fires_(\d{4})_(\d{2})\.pmtiles$/
const FORECAST_FILE = /^forecast_(\d{4})_(\d{2})\.pmtiles$/

export interface FirePeriods {
  /** Months with observed fires (tile files), earliest first. */
  observed: Period[]
  /** Months after the last observed one that have a forecast file, earliest first. */
  future: Period[]
}

/** The month in a file name that matches `pattern`, or null. */
function periodOf(name: unknown, pattern: RegExp): Period | null {
  const match = typeof name === 'string' ? pattern.exec(name) : null
  const year = Number(match?.[1])
  const month = Number(match?.[2])
  return match !== null && month >= 1 && month <= 12 ? { year, month } : null
}

/**
 * The months that have fire tiles and the future months that have a forecast.
 * The tile server lists its folder as JSON (nginx `autoindex_format json`), so
 * a new file shows up without any change in the app. A forecast for a month
 * that is already observed is ignored.
 */
export async function fetchFirePeriods(
  signal: AbortSignal,
): Promise<FirePeriods> {
  const response = await fetch(`${FIRE_TILE_BASE_URL}/`, {
    signal,
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`Tile server answered ${String(response.status)}`)
  }
  const listing: unknown = await response.json()
  if (!Array.isArray(listing)) {
    throw new Error('Unexpected tile server listing')
  }
  const observed: Period[] = []
  const forecast: Period[] = []
  for (const entry of listing as unknown[]) {
    const name =
      typeof entry === 'object' && entry !== null && 'name' in entry
        ? entry.name
        : null
    const tile = periodOf(name, TILE_FILE)
    const predicted = periodOf(name, FORECAST_FILE)
    if (tile !== null) {
      observed.push(tile)
    } else if (predicted !== null) {
      forecast.push(predicted)
    }
  }
  observed.sort(comparePeriods)
  const lastObserved = observed[observed.length - 1]
  const future = forecast
    .filter(
      (p) => lastObserved === undefined || comparePeriods(p, lastObserved) > 0,
    )
    .sort(comparePeriods)
  return { observed, future }
}
