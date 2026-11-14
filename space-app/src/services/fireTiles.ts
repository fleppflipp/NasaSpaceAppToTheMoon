import * as maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import { FIRE_TILE_FOLDER, FIRE_TILE_YEARS } from '../constants/fires.constants'
import { periodDateRange } from './period'
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

/** Source URL of the fire tiles of one year, relative to the running app. */
export function fireTileUrl(year: number): string {
  const file = `${FIRE_TILE_FOLDER}/fires_${String(year)}.pmtiles`
  return `pmtiles://${window.location.origin}${file}`
}

/** The years of the period that have a fire tile file. */
export function fireYearsInPeriod(period: Period): number[] {
  const { startDate, endDate } = periodDateRange(period)
  const firstYear = Number(startDate.slice(0, 4))
  const lastYear = Number(endDate.slice(0, 4))
  return FIRE_TILE_YEARS.filter((year) => year >= firstYear && year <= lastYear)
}
