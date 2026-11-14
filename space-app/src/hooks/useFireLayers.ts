import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { VectorTileSource } from 'maplibre-gl'
import type { ExpressionSpecification, Map as MapLibreMap } from 'maplibre-gl'
import { COLOR_PALETTE } from '../constants/colorpallette.constatns'
import {
  FIRE_FILL_OPACITY,
  FIRE_FRP_STOPS,
  FIRE_MIN_FRP_BY_ZOOM,
  FIRE_MIN_RADIUS_PX,
  FIRE_PERIOD_DEBOUNCE_MS,
  FIRE_POINTS_LAYER,
  FIRE_POINTS_MAX_ZOOM,
  METRES_PER_PIXEL_AT_ZOOM_0,
} from '../constants/fires.constants'
import { fireTileUrl, registerPmtilesProtocol } from '../services/fireTiles'
import { fireDay } from '../services/period'
import type { Period } from '../services/period'

registerPmtilesProtocol()

const SOURCE = 'fires'
const POINTS = 'fires-points'

/** Pixels per kilometre at zoom 0; it doubles with every zoom level. */
const PX_PER_KM_AT_ZOOM_0 = 1000 / METRES_PER_PIXEL_AT_ZOOM_0
const MAX_ZOOM = 24
/** Last zoom with its own radius step; beyond it the radius just keeps doubling. */
const LAST_STEP_ZOOM = 16
/** The minimum dot size fades out between these zooms: the real size takes over. */
const FLOOR_FADE_FROM_ZOOM = 8
const FLOOR_FADE_TO_ZOOM = 12

/** The weakest fire (MW) that is drawn at this zoom. */
function minFrpAt(zoom: number): number {
  let result = 0
  for (const [fromZoom, frp] of FIRE_MIN_FRP_BY_ZOOM) {
    if (zoom >= fromZoom) {
      result = frp
    }
  }
  return result
}

/** The smallest dot radius (px) at this zoom. */
function floorRadiusAt(zoom: number): number {
  const fade =
    (zoom - FLOOR_FADE_FROM_ZOOM) / (FLOOR_FADE_TO_ZOOM - FLOOR_FADE_FROM_ZOOM)
  return FIRE_MIN_RADIUS_PX * (1 - Math.min(Math.max(fade, 0), 1))
}

/** Radius of a dot at one zoom: 0 when the fire is too weak to show yet. */
function radiusAt(zoom: number): ExpressionSpecification {
  const real: ExpressionSpecification = [
    '*',
    ['get', 'r'],
    PX_PER_KM_AT_ZOOM_0 * 2 ** zoom,
  ]
  return [
    'case',
    ['>=', ['get', 'f'], minFrpAt(zoom)],
    ['max', floorRadiusAt(zoom), real],
    0,
  ]
}

/**
 * Dot radius: the fire's real size (`r`, km), with a small floor while zoomed
 * out. Fires weaker than the zoom's limit have radius 0, so they grow in
 * smoothly while zooming closer instead of popping up.
 */
const RADIUS: ExpressionSpecification = [
  'interpolate',
  ['exponential', 2],
  ['zoom'],
  ...Array.from({ length: LAST_STEP_ZOOM + 1 }, (_, zoom) => [
    zoom,
    radiusAt(zoom),
  ]).flat(),
  MAX_ZOOM,
  radiusAt(MAX_ZOOM),
] as ExpressionSpecification

/** Color by the fire radiative power `f` (MW). */
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

/**
 * Shows the fires of the period: one monthly tile file is the source; changing
 * the month points the source at another file. A chosen day only filters the
 * dots of that file. The tiles hold dots up to zoom 9; closer in they are
 * overscaled.
 */
function showPeriod(map: MapLibreMap, period: Period | null): void {
  if (period === null) {
    if (map.getLayer(POINTS)) {
      map.setLayoutProperty(POINTS, 'visibility', 'none')
    }
    return
  }
  const url = fireTileUrl(period)
  const source = map.getSource(SOURCE)
  if (source === undefined) {
    map.addSource(SOURCE, {
      type: 'vector',
      url,
      maxzoom: FIRE_POINTS_MAX_ZOOM,
    })
  } else if (source instanceof VectorTileSource && source.url !== url) {
    source.setUrl(url)
  }
  if (!map.getLayer(POINTS)) {
    map.addLayer(
      {
        id: POINTS,
        type: 'circle',
        source: SOURCE,
        'source-layer': FIRE_POINTS_LAYER,
        paint: {
          'circle-radius': RADIUS,
          'circle-color': COLOR,
          'circle-opacity': FIRE_FILL_OPACITY,
        },
      },
      firstSymbolLayerId(map),
    )
  }
  const day = fireDay(period)
  map.setFilter(POINTS, day === null ? null : ['==', ['get', 'day'], day])
  map.setLayoutProperty(POINTS, 'visibility', 'visible')
}

/**
 * Draws the fires of the month; nothing is drawn while there is no period.
 */
export function useFireLayers(
  mapRef: RefObject<MapLibreMap | null>,
  period: Period | null,
): void {
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

  // The period changed: point the source at the new month. While the slider is
  // dragged it passes through many months; only the one it rests on is loaded,
  // otherwise every step would start a new tile file and freeze the page.
  useEffect(() => {
    periodRef.current = period
    const map = mapRef.current
    if (map === null || !styleReadyRef.current) {
      return
    }
    const timer = window.setTimeout(() => {
      showPeriod(map, period)
    }, FIRE_PERIOD_DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
    }
  }, [mapRef, period])
}
