// Place-name autocomplete using Photon (https://photon.komoot.io), a free
// OpenStreetMap-based geocoder built for search-as-you-type. No API key needed;
// the public instance is meant for light, fair use, so callers must debounce.

const PHOTON_URL = 'https://photon.komoot.io/api/'
const MAX_SUGGESTIONS = 6

export interface Place {
  /** Full readable label, e.g. "Cluj-Napoca, Cluj, Romania". */
  label: string
  lng: number
  lat: number
  /** [west, south, east, north] when the place has an extent. */
  bounds: [number, number, number, number] | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

function buildLabel(props: Record<string, unknown>): string {
  const parts = [
    text(props['name']) ?? text(props['street']),
    text(props['city']),
    text(props['state']) ?? text(props['county']),
    text(props['country']),
  ].filter((part): part is string => part !== null)
  return [...new Set(parts)].join(', ')
}

function parseBounds(extent: unknown): Place['bounds'] {
  // Photon extent order: [west, north, east, south]
  if (!Array.isArray(extent) || extent.length !== 4) {
    return null
  }
  const [west, north, east, south] = extent.map(Number)
  if (
    west === undefined ||
    north === undefined ||
    east === undefined ||
    south === undefined ||
    [west, north, east, south].some(Number.isNaN)
  ) {
    return null
  }
  return [west, south, east, north]
}

function parseFeature(feature: unknown): Place | null {
  if (!isRecord(feature)) {
    return null
  }
  const props = feature['properties']
  const geometry = feature['geometry']
  if (!isRecord(props) || !isRecord(geometry)) {
    return null
  }
  const coordinates = geometry['coordinates']
  if (!Array.isArray(coordinates)) {
    return null
  }
  const [lng, lat] = coordinates.map(Number)
  const label = buildLabel(props)
  if (
    lng === undefined ||
    lat === undefined ||
    Number.isNaN(lng) ||
    Number.isNaN(lat) ||
    label === ''
  ) {
    return null
  }
  return { label, lng, lat, bounds: parseBounds(props['extent']) }
}

/** Returns place suggestions for a partially typed `query`. */
export async function suggestPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<Place[]> {
  const url = new URL(PHOTON_URL)
  url.searchParams.set('q', query)
  url.searchParams.set('limit', String(MAX_SUGGESTIONS))
  url.searchParams.set('lang', 'en')

  const response = await fetch(url, signal ? { signal } : {})
  if (!response.ok) {
    throw new Error(`Search failed (${String(response.status)})`)
  }

  const data: unknown = await response.json()
  if (!isRecord(data) || !Array.isArray(data['features'])) {
    return []
  }
  const seen = new Set<string>()
  return data['features'].map(parseFeature).filter((place): place is Place => {
    // Photon can return the same place twice (e.g. node and relation).
    if (place === null || seen.has(place.label)) {
      return false
    }
    seen.add(place.label)
    return true
  })
}
