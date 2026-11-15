import * as maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import { FIRE_TILE_BASE_URL } from '../constants/fires.constants'
import { comparePeriods } from './period'
import type { Period } from './period'

let registered = false
let dataBaseUrl = FIRE_TILE_BASE_URL

/** The source selected when the available periods were loaded. */
export function fireDataBaseUrl(): string {
  return dataBaseUrl
}

/** Lets MapLibre read `pmtiles://` sources (done once, before any map loads them). */
export function registerPmtilesProtocol(): void {
  if (registered) {
    return
  }
  registered = true
  const protocol = new Protocol()
  maplibregl.addProtocol('pmtiles', protocol.tile)
}

/** Source URL of the fire tiles of one month, from the tile server. */
export function fireTileUrl({ year, month }: Period): string {
  const name = `fires_${String(year)}_${String(month).padStart(2, '0')}.pmtiles`
  return `pmtiles://${dataBaseUrl}/${name}`
}

const TILE_FILE = /^fires_(\d{4})_(\d{2})\.pmtiles$/

/**
 * The months that have fire tiles, earliest first. The tile server lists its
 * folder as JSON (nginx `autoindex_format json`), so a new file shows up
 * without any change in the app.
 */
export async function fetchFirePeriods(signal: AbortSignal): Promise<Period[]> {
  try {
    const periods = await fetchPeriodsFrom(FIRE_TILE_BASE_URL, signal)
    dataBaseUrl = FIRE_TILE_BASE_URL
    return periods
  } catch (error) {
    if (signal.aborted) throw error
    const localBaseUrl = new URL(
      'local-fire-data',
      document.baseURI,
    ).href.replace(/\/$/, '')
    const periods = await fetchPeriodsFrom(localBaseUrl, signal)
    dataBaseUrl = localBaseUrl
    return periods
  }
}

async function fetchPeriodsFrom(
  baseUrl: string,
  signal: AbortSignal,
): Promise<Period[]> {
  const response = await fetch(`${baseUrl}/`, {
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
  const periods: Period[] = []
  for (const entry of listing as unknown[]) {
    const name =
      typeof entry === 'object' && entry !== null && 'name' in entry
        ? entry.name
        : null
    const match = typeof name === 'string' ? TILE_FILE.exec(name) : null
    const year = Number(match?.[1])
    const month = Number(match?.[2])
    if (match !== null && month >= 1 && month <= 12) {
      periods.push({ year, month })
    }
  }
  return periods.sort(comparePeriods)
}
