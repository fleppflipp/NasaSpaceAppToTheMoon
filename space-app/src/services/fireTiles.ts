import * as maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import {
  FIRE_TILE_BASE_URL,
  FIRE_TILE_YEARS,
} from '../constants/fires.constants'
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

/** Source URL of the fire tiles of one week, from the tile server. */
export function fireTileUrl({ year, week }: Period): string {
  const name = `fires_${String(year)}_w${String(week).padStart(2, '0')}.pmtiles`
  return `pmtiles://${FIRE_TILE_BASE_URL}/${name}`
}

/** Whether there are fire tiles for the period. */
export function hasFireData(period: Period): boolean {
  return FIRE_TILE_YEARS.includes(period.year)
}
