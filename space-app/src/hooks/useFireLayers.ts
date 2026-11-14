import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type {
  ExpressionSpecification,
  FilterSpecification,
  Map as MapLibreMap,
} from 'maplibre-gl'
import { COLOR_PALETTE } from '../constants/colorpallette.constatns'
import {
  FIRE_FRP_STOPS,
  FIRE_MIN_RADIUS_PX,
  FIRE_SOURCE_LAYER,
  FIRE_TILE_YEARS,
  METRES_PER_PIXEL_AT_ZOOM_0,
} from '../constants/fires.constants'
import {
  fireTileUrl,
  fireYearsInPeriod,
  registerPmtilesProtocol,
} from '../services/fireTiles'
import { periodDayRange } from '../services/period'
import type { Period } from '../services/period'

registerPmtilesProtocol()

const sourceId = (year: number) => `fires-${String(year)}`
const layerId = (year: number) => `fires-${String(year)}-circles`

/** Pixels per kilometre at zoom 0; it doubles with every zoom level. */
const PX_PER_KM_AT_ZOOM_0 = 1000 / METRES_PER_PIXEL_AT_ZOOM_0
const MAX_ZOOM = 24

/** Circle radius: the fire's real radius (`r`, km) at this zoom, but never tiny. */
const RADIUS: ExpressionSpecification = [
  'interpolate',
  ['exponential', 2],
  ['zoom'],
  0,
  ['+', FIRE_MIN_RADIUS_PX, ['*', ['get', 'r'], PX_PER_KM_AT_ZOOM_0]],
  MAX_ZOOM,
  [
    '+',
    FIRE_MIN_RADIUS_PX,
    ['*', ['get', 'r'], PX_PER_KM_AT_ZOOM_0 * 2 ** MAX_ZOOM],
  ],
]

/** Color by the fire's radiative power `f` (MW). */
const COLOR: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['get', 'f'],
  FIRE_FRP_STOPS[0],
  COLOR_PALETTE['fire-low'],
  FIRE_FRP_STOPS[1],
  COLOR_PALETTE['fire-mid'],
  FIRE_FRP_STOPS[2],
  COLOR_PALETTE['fire-high'],
  FIRE_FRP_STOPS[3],
  COLOR_PALETTE['fire-extreme'],
]

/** Keeps the fires whose `day` (days since 2000-01-01) is inside the period. */
function periodFilter(period: Period): FilterSpecification {
  const { startDay, endDay } = periodDayRange(period)
  return [
    'all',
    ['>=', ['get', 'day'], startDay],
    ['<=', ['get', 'day'], endDay],
  ]
}

/** Fires are drawn under the map labels, so place names stay readable. */
function firstSymbolLayerId(map: MapLibreMap): string | undefined {
  return map.getStyle().layers.find((layer) => layer.type === 'symbol')?.id
}

function ensureLayers(map: MapLibreMap, period: Period): void {
  const filter = periodFilter(period)
  const visible = new Set(fireYearsInPeriod(period))
  for (const year of FIRE_TILE_YEARS) {
    if (!map.getSource(sourceId(year))) {
      map.addSource(sourceId(year), {
        type: 'vector',
        url: fireTileUrl(year),
      })
    }
    if (!map.getLayer(layerId(year))) {
      map.addLayer(
        {
          id: layerId(year),
          type: 'circle',
          source: sourceId(year),
          'source-layer': FIRE_SOURCE_LAYER,
          filter,
          layout: { visibility: visible.has(year) ? 'visible' : 'none' },
          paint: {
            'circle-radius': RADIUS,
            'circle-color': COLOR,
            'circle-opacity': 0.75,
            'circle-stroke-width': 0.5,
            'circle-stroke-color': COLOR_PALETTE['fire-outline'],
          },
        },
        firstSymbolLayerId(map),
      )
    }
  }
}

function applyPeriod(map: MapLibreMap, period: Period): void {
  const filter = periodFilter(period)
  const visible = new Set(fireYearsInPeriod(period))
  for (const year of FIRE_TILE_YEARS) {
    if (map.getLayer(layerId(year))) {
      map.setFilter(layerId(year), filter)
      map.setLayoutProperty(
        layerId(year),
        'visibility',
        visible.has(year) ? 'visible' : 'none',
      )
    }
  }
}

/**
 * Draws the fires of the years that have tile files and keeps only the ones
 * inside the period. Returns whether the period has any fire data at all.
 */
export function useFireLayers(
  mapRef: RefObject<MapLibreMap | null>,
  period: Period,
): { hasData: boolean } {
  const periodRef = useRef(period)

  // Layers (re)appear after every style load.
  useEffect(() => {
    const map = mapRef.current
    if (map === null) {
      return
    }
    const handleStyleLoad = () => {
      ensureLayers(map, periodRef.current)
    }
    map.on('style.load', handleStyleLoad)
    if (map.isStyleLoaded()) {
      handleStyleLoad()
    }
    return () => {
      map.off('style.load', handleStyleLoad)
    }
  }, [mapRef])

  // The period changed: filter the layers and hide years outside of it.
  useEffect(() => {
    periodRef.current = period
    const map = mapRef.current
    if (map !== null) {
      // Layers that are not there yet get the period when they are added.
      applyPeriod(map, period)
    }
  }, [mapRef, period])

  return { hasData: fireYearsInPeriod(period).length > 0 }
}
