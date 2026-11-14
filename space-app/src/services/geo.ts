import type { Polygon, Position } from 'geojson'

// Mean Earth radius (IUGG), km.
const EARTH_RADIUS_KM = 6371.0088

export type BBox = [west: number, south: number, east: number, north: number]

export interface SelectionInfo {
  bbox: BBox
  areaKm2: number
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

/** Signed shoelace sum in lng/lat; positive = counter-clockwise. */
function signedRingSum(ring: readonly Position[]): number {
  let sum = 0
  for (let index = 0; index + 1 < ring.length; index += 1) {
    const a = ring[index]
    const b = ring[index + 1]
    if (a !== undefined && b !== undefined) {
      sum += (a[0] ?? 0) * (b[1] ?? 0) - (b[0] ?? 0) * (a[1] ?? 0)
    }
  }
  return sum
}

/** RFC 7946: exterior rings are counter-clockwise. Input must be closed. */
export function counterClockwise(ring: Position[]): Position[] {
  return signedRingSum(ring) < 0 ? [...ring].reverse() : ring
}

/**
 * Approximate area of a ring on a sphere (km²), small-polygon formula
 * R²/2 * |sum((lng2 - lng1) * (2 + sin(lat1) + sin(lat2)))|.
 * Accurate to well under 1% for areas up to a few hundred thousand km².
 */
export function ringAreaKm2(ring: readonly Position[]): number {
  let sum = 0
  for (let index = 0; index + 1 < ring.length; index += 1) {
    const a = ring[index]
    const b = ring[index + 1]
    if (a === undefined || b === undefined) {
      continue
    }
    const [lng1 = 0, lat1 = 0] = a
    const [lng2 = 0, lat2 = 0] = b
    sum +=
      toRadians(lng2 - lng1) *
      (2 + Math.sin(toRadians(lat1)) + Math.sin(toRadians(lat2)))
  }
  return Math.abs((sum * EARTH_RADIUS_KM * EARTH_RADIUS_KM) / 2)
}

/** Bounding box and approximate area of the polygon's exterior ring. */
export function selectionInfo(polygon: Polygon): SelectionInfo | null {
  const ring = polygon.coordinates[0]
  if (ring === undefined || ring.length < 4) {
    return null
  }
  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity
  for (const [lng = 0, lat = 0] of ring) {
    west = Math.min(west, lng)
    east = Math.max(east, lng)
    south = Math.min(south, lat)
    north = Math.max(north, lat)
  }
  return { bbox: [west, south, east, north], areaKm2: ringAreaKm2(ring) }
}

export function formatAreaKm2(areaKm2: number): string {
  if (areaKm2 < 1) {
    return `${areaKm2.toFixed(2)} km²`
  }
  if (areaKm2 < 100) {
    return `${areaKm2.toFixed(1)} km²`
  }
  return `${Math.round(areaKm2).toLocaleString('en')} km²`
}
