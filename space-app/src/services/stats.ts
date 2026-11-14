import { FIRE_TILE_BASE_URL } from '../constants/fires.constants'

/** The strongest fire of a month. */
export interface BiggestFire {
  /** Fire radiative power, MW. */
  frp: number
  radiusKm: number
  lat: number
  lng: number
  /** Day of the month, 1 to 31. */
  day: number
  /** Nearest named place, or null when unknown. */
  place: FirePlace | null
}

/** A place from the geocoder: the name and region are as the geocoder knows them (English). */
export interface FirePlace {
  name: string | null
  region: string | null
  /** ISO 3166 country code, so the country can be written in the language of the UI. */
  countryCode: string | null
  /** The country as the geocoder wrote it, for when the code is missing. */
  countryName: string | null
}

/** A biggest fire to point out on the map, with the month it belongs to. */
export interface FireHighlight {
  fire: BiggestFire
  year: number
  month: number
}

/** The numbers of the statistics panel for one month (written by tiles/build_fire_tiles.py). */
export interface MonthStats {
  fires: number
  /** Sum of the fire radiative power of all fires, MW. */
  frp: number
  /** Fires per day of the month, day 1 first. */
  days: readonly number[]
  /** Fires under 20 MW, 20 to 100, 100 to 500 and over 500. */
  strength: readonly number[]
  /** Fires seen by MODIS only, by both sensors and by VIIRS only. */
  sensors: readonly number[]
  biggest: BiggestFire | null
}

const MONTHS_PER_YEAR = 12
const STRENGTH_CLASSES = 4
const SENSOR_CLASSES = 3

/** Key of a month in a statistics map. */
export function statsKey(year: number, month: number): string {
  return `${String(year)}-${String(month)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function counts(value: unknown, length?: number): number[] | null {
  if (!Array.isArray(value)) {
    return null
  }
  const items: unknown[] = value
  if (
    (length !== undefined && items.length !== length) ||
    !items.every(isCount)
  ) {
    return null
  }
  return items
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

function parsePlace(value: unknown): FirePlace | null {
  if (!isRecord(value)) {
    return null
  }
  return {
    name: text(value['name']),
    region: text(value['region']),
    countryCode: text(value['country']),
    countryName: text(value['countryName']),
  }
}

function parseBiggest(value: unknown): BiggestFire | null {
  if (!isRecord(value)) {
    return null
  }
  const frp = finite(value['frp'])
  const radiusKm = finite(value['r'])
  const lat = finite(value['lat'])
  const lng = finite(value['lon'])
  const day = finite(value['day'])
  if (
    frp === null ||
    radiusKm === null ||
    lat === null ||
    lng === null ||
    day === null
  ) {
    return null
  }
  return {
    frp,
    radiusKm,
    lat,
    lng,
    day,
    place: parsePlace(value['place']),
  }
}

function parseMonth(value: unknown): MonthStats | null {
  if (!isRecord(value)) {
    return null
  }
  const fires = value['fires']
  const frp = value['frp']
  const days = counts(value['days'])
  const strength = counts(value['strength'], STRENGTH_CLASSES)
  const sensors = counts(value['sensors'], SENSOR_CLASSES)
  if (
    !isCount(fires) ||
    !isCount(frp) ||
    days === null ||
    strength === null ||
    sensors === null
  ) {
    return null
  }
  return {
    fires,
    frp,
    days,
    strength,
    sensors,
    biggest: parseBiggest(value['biggest']),
  }
}

/** The statistics of every month of one year that the tile server has (month 1 to 12). */
export async function fetchYearStats(
  year: number,
  signal: AbortSignal,
): Promise<Map<number, MonthStats>> {
  const response = await fetch(
    `${FIRE_TILE_BASE_URL}/fires_${String(year)}.json`,
    // Ask the server whether the file changed (it is rewritten when the data is rebuilt).
    { signal, cache: 'no-cache' },
  )
  if (!response.ok) {
    throw new Error(`Tile server answered ${String(response.status)}`)
  }
  const data: unknown = await response.json()
  const months = new Map<number, MonthStats>()
  if (!isRecord(data)) {
    return months
  }
  for (const [key, value] of Object.entries(data)) {
    const month = Number(key)
    const parsed = parseMonth(value)
    if (month >= 1 && month <= MONTHS_PER_YEAR && parsed !== null) {
      months.set(month, parsed)
    }
  }
  return months
}

/** How much `current` differs from `base` as a ratio (0.1 = 10 % more); null without a base. */
export function relativeChange(
  current: number,
  base: number | undefined,
): number | null {
  return base === undefined || base === 0 ? null : current / base - 1
}
