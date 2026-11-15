import type { Geometry } from 'geojson'

export type HotspotSensor = 'MODIS' | 'VIIRS'

export interface HotspotDetails {
  kind: 'point' | 'area'
  frp: number | null
  sensors: readonly HotspotSensor[]
  firstDay: number | null
  lastDay: number | null
  radiusKm: number | null
  eventCount: number | null
  coordinates: [number, number] | null
}

function nonNegativeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null
}

function tileDay(value: unknown): number | null {
  // Bound the encoded day before passing it to Intl / Date.
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    Math.abs(value) <= 100_000
    ? value
    : null
}

/** Tile properties are untrusted; missing values must never become zero. */
export function parseHotspot(
  properties: unknown,
  geometry: Geometry,
): HotspotDetails | null {
  if (
    typeof properties !== 'object' ||
    properties === null ||
    Array.isArray(properties) ||
    (geometry.type !== 'Point' &&
      geometry.type !== 'Polygon' &&
      geometry.type !== 'MultiPolygon')
  ) {
    return null
  }
  const props = properties as Record<string, unknown>
  const point = geometry.type === 'Point'
  const sensors: readonly HotspotSensor[] =
    props['s'] === 0
      ? ['MODIS']
      : props['s'] === 1
        ? ['MODIS', 'VIIRS']
        : props['s'] === 2
          ? ['VIIRS']
          : []
  const firstDay = tileDay(props[point ? 'day' : 'd0'])
  const lastDay = point ? firstDay : tileDay(props['d1'])
  const count = nonNegativeNumber(props['n'])
  let coordinates: [number, number] | null = null
  if (geometry.type === 'Point') {
    const [lng, lat] = geometry.coordinates
    if (
      lng !== undefined &&
      lat !== undefined &&
      Number.isFinite(lng) &&
      Number.isFinite(lat) &&
      Math.abs(lat) <= 90
    ) {
      coordinates = [((((lng + 180) % 360) + 360) % 360) - 180, lat]
    }
  }
  return {
    kind: point ? 'point' : 'area',
    frp: nonNegativeNumber(props['f']),
    sensors,
    firstDay,
    lastDay:
      firstDay !== null && lastDay !== null && lastDay < firstDay
        ? null
        : lastDay,
    radiusKm: point ? nonNegativeNumber(props['r']) : null,
    eventCount:
      !point && count !== null && Number.isInteger(count) && count > 0
        ? count
        : null,
    coordinates,
  }
}

/** Calendar encoding from the tiles, not an acquisition timestamp. */
export function hotspotDate(day: number): Date {
  return new Date(Date.UTC(2000, 0, 1 + day))
}
