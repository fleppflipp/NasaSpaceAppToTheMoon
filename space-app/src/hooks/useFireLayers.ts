import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { VectorTileSource } from 'maplibre-gl'
import type { ExpressionSpecification, Map as MapLibreMap } from 'maplibre-gl'
import { COLOR_PALETTE } from '../constants/colorpallette.constatns'
import {
  FIRE_AREAS_LAYER,
  FIRE_AREAS_MIN_ZOOM,
  FIRE_FILL_OPACITY,
  FIRE_FRP_STOPS,
  FIRE_MIN_RADIUS_PX,
  FIRE_OUTLINE_OPACITY,
  FIRE_OUTLINE_WIDTH_PX,
  FIRE_POINTS_LAYER,
  METRES_PER_PIXEL_AT_ZOOM_0,
} from '../constants/fires.constants'
import {
  fireTileUrl,
  hasFireData,
  registerPmtilesProtocol,
} from '../services/fireTiles'
import type { Period } from '../services/period'
import { fireDay } from '../services/period'

registerPmtilesProtocol()

const SOURCE = 'fires'
const POINTS = 'fires-points'
const AREAS = 'fires-areas'
const OUTLINE = 'fires-areas-outline'
const LAYERS = [POINTS, AREAS, OUTLINE]
const DAILY_SOURCE = 'fires-daily'
const DAILY_POINTS = 'fires-daily-points'

/** Pixels per kilometre at zoom 0; it doubles with every zoom level. */
const PX_PER_KM_AT_ZOOM_0 = 1000 / METRES_PER_PIXEL_AT_ZOOM_0
const MAX_ZOOM = 24

/** Dot radius: the fire's real radius (`r`, km) at this zoom, but never tiny. */
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

/** Color by the fire radiative power `f` (MW; for a polygon the largest of its fires). */
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

/** Fires are drawn under the map labels, so place names stay readable. */
function firstSymbolLayerId(map: MapLibreMap): string | undefined {
  return map.getStyle().layers.find((layer) => layer.type === 'symbol')?.id
}

function setVisibility(map: MapLibreMap, visible: boolean): void {
  for (const id of LAYERS) {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')
    }
  }
}

/**
 * Shows the fires of the period: one weekly tile file is the source; changing
 * the week points the source at another file. Below the area zoom the fires
 * are dots, from it on they are the merged polygons.
 */
function showPeriod(map: MapLibreMap, period: Period): void {
  if (map.getLayer(DAILY_POINTS)) {
    map.setLayoutProperty(DAILY_POINTS, 'visibility', 'none')
  }
  if (!hasFireData(period)) {
    setVisibility(map, false)
    return
  }
  const url = fireTileUrl(period)
  const day = fireDay(period)
  if (day !== null) {
    setVisibility(map, false)
    const dailySource = map.getSource(DAILY_SOURCE)
    if (dailySource === undefined) {
      // Points only exist through z9. Overscale those tiles for daily detail;
      // weekly merged polygons cannot accurately represent a single day.
      map.addSource(DAILY_SOURCE, {
        type: 'vector',
        url,
        maxzoom: FIRE_AREAS_MIN_ZOOM - 1,
      })
    } else if (
      dailySource instanceof VectorTileSource &&
      dailySource.url !== url
    ) {
      dailySource.setUrl(url)
    }
    if (!map.getLayer(DAILY_POINTS)) {
      map.addLayer(
        {
          id: DAILY_POINTS,
          type: 'circle',
          source: DAILY_SOURCE,
          'source-layer': FIRE_POINTS_LAYER,
          paint: {
            'circle-radius': RADIUS,
            'circle-color': COLOR,
            'circle-opacity': FIRE_FILL_OPACITY + 0.1,
          },
        },
        firstSymbolLayerId(map),
      )
    }
    map.setFilter(DAILY_POINTS, ['==', ['get', 'day'], day])
    map.setLayoutProperty(DAILY_POINTS, 'visibility', 'visible')
    return
  }
  const source = map.getSource(SOURCE)
  if (source === undefined) {
    map.addSource(SOURCE, { type: 'vector', url })
  } else if (source instanceof VectorTileSource && source.url !== url) {
    source.setUrl(url)
  }

  if (!map.getLayer(POINTS)) {
    const before = firstSymbolLayerId(map)
    map.addLayer(
      {
        id: POINTS,
        type: 'circle',
        source: SOURCE,
        'source-layer': FIRE_POINTS_LAYER,
        maxzoom: FIRE_AREAS_MIN_ZOOM,
        paint: {
          'circle-radius': RADIUS,
          'circle-color': COLOR,
          'circle-opacity': FIRE_FILL_OPACITY + 0.1,
        },
      },
      before,
    )
    map.addLayer(
      {
        id: AREAS,
        type: 'fill',
        source: SOURCE,
        'source-layer': FIRE_AREAS_LAYER,
        minzoom: FIRE_AREAS_MIN_ZOOM,
        paint: { 'fill-color': COLOR, 'fill-opacity': FIRE_FILL_OPACITY },
      },
      before,
    )
    map.addLayer(
      {
        id: OUTLINE,
        type: 'line',
        source: SOURCE,
        'source-layer': FIRE_AREAS_LAYER,
        minzoom: FIRE_AREAS_MIN_ZOOM,
        paint: {
          'line-color': COLOR_PALETTE['fire-outline'],
          'line-opacity': FIRE_OUTLINE_OPACITY,
          'line-width': FIRE_OUTLINE_WIDTH_PX,
        },
      },
      before,
    )
  }
  setVisibility(map, true)
}

/**
 * Draws the fires of the week in the period. Returns whether the period has
 * any fire data at all.
 */
export function useFireLayers(
  mapRef: RefObject<MapLibreMap | null>,
  period: Period,
): { hasData: boolean } {
  const periodRef = useRef(period)
  // Layers can only be changed once the style has loaded.
  const styleReadyRef = useRef(false)

  // Layers (re)appear after every style load.
  useEffect(() => {
    const map = mapRef.current
    if (map === null) {
      return
    }
    const handleStyleLoad = () => {
      styleReadyRef.current = true
      showPeriod(map, periodRef.current)
    }
    map.on('style.load', handleStyleLoad)
    if (map.isStyleLoaded()) {
      handleStyleLoad()
    }
    return () => {
      map.off('style.load', handleStyleLoad)
      styleReadyRef.current = false
    }
  }, [mapRef])

  // The period changed: point the source at the new week.
  useEffect(() => {
    periodRef.current = period
    const map = mapRef.current
    if (map !== null && styleReadyRef.current) {
      showPeriod(map, period)
    }
  }, [mapRef, period])

  return { hasData: hasFireData(period) }
}
