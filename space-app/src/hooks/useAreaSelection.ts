import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type {
  Feature,
  FeatureCollection,
  Geometry,
  Polygon,
  Position,
} from 'geojson'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import { COLOR_PALETTE } from '../constants/colorpallette.constatns'
import { BORDER_WIDTH, OPACITY } from '../constants/design.constants'
import { DRAW_MIN_ZOOM, INITIAL_ZOOM, LASSO } from '../constants/map.constants'
import { counterClockwise } from '../services/geo'
import { closeStroke } from '../services/lasso'
import type { Point } from '../services/lasso'

const SELECTION_SOURCE = 'area-selection'
const SELECTION_FILL_LAYER = 'area-selection-fill'
const SELECTION_OUTLINE_LAYER = 'area-selection-outline'
const STROKE_SOURCE = 'area-selection-stroke'
const STROKE_LAYER = 'area-selection-stroke-line'

const OUTLINE_WIDTH = parseFloat(BORDER_WIDTH.strong)
const FILL_OPACITY = Number(OPACITY['selection-fill'])

/** Keys of the `draw` translations the hook can show. */
export type DrawMessage = 'closeShape'

/** Drawing is only allowed when zoomed in far enough. */
function canDrawAtZoom(zoom: number): boolean {
  return zoom >= DRAW_MIN_ZOOM
}

/** False once the map has been removed or replaced (e.g. on unmount). */
function isLive(
  mapRef: RefObject<MapLibreMap | null>,
  map: MapLibreMap,
): boolean {
  return mapRef.current === map
}

function collection(geometry: Geometry | null): FeatureCollection {
  const features: Feature[] =
    geometry === null ? [] : [{ type: 'Feature', properties: {}, geometry }]
  return { type: 'FeatureCollection', features }
}

function setSourceData(
  map: MapLibreMap,
  sourceId: string,
  geometry: Geometry | null,
): void {
  void map.getSource<GeoJSONSource>(sourceId)?.setData(collection(geometry))
}

/** Adds the selection and live-stroke sources/layers (again after a style reload). */
function ensureLayers(map: MapLibreMap, selection: Polygon | null): void {
  if (map.getSource(SELECTION_SOURCE) === undefined) {
    map.addSource(SELECTION_SOURCE, {
      type: 'geojson',
      data: collection(selection),
    })
  }
  if (map.getSource(STROKE_SOURCE) === undefined) {
    map.addSource(STROKE_SOURCE, { type: 'geojson', data: collection(null) })
  }
  if (map.getLayer(SELECTION_FILL_LAYER) === undefined) {
    map.addLayer({
      id: SELECTION_FILL_LAYER,
      type: 'fill',
      source: SELECTION_SOURCE,
      paint: {
        'fill-color': COLOR_PALETTE.selection,
        'fill-opacity': FILL_OPACITY,
      },
    })
  }
  if (map.getLayer(SELECTION_OUTLINE_LAYER) === undefined) {
    map.addLayer({
      id: SELECTION_OUTLINE_LAYER,
      type: 'line',
      source: SELECTION_SOURCE,
      layout: { 'line-join': 'round' },
      paint: {
        'line-color': COLOR_PALETTE['selection-outline'],
        'line-width': OUTLINE_WIDTH,
      },
    })
  }
  if (map.getLayer(STROKE_LAYER) === undefined) {
    map.addLayer({
      id: STROKE_LAYER,
      type: 'line',
      source: STROKE_SOURCE,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': COLOR_PALETTE['selection-outline'],
        'line-width': OUTLINE_WIDTH,
        'line-dasharray': [2, 1.5],
      },
    })
  }
}

/** Screen pixel -> [lng, lat]; always goes through the map's projection. */
function unprojectPoint(map: MapLibreMap, point: Point): Position {
  const lngLat = map.unproject([point.x, point.y])
  return [lngLat.lng, lngLat.lat]
}

function isFinitePosition(position: Position): boolean {
  return position.every((value) => Number.isFinite(value))
}

/** Builds the GeoJSON polygon for a closed screen-space ring, or null if invalid. */
function ringToPolygon(map: MapLibreMap, ring: Point[]): Polygon | null {
  const positions = ring.map((point) => unprojectPoint(map, point))
  const first = positions[0]
  if (first === undefined || !positions.every(isFinitePosition)) {
    return null
  }
  // Keep the ring continuous but anchor it to the primary world copy.
  const shift = Math.round((first[0] ?? 0) / 360) * 360
  const shifted = positions.map(([lng = 0, lat = 0]): Position => [
    lng - shift,
    lat,
  ])
  const start = shifted[0]
  if (start === undefined) {
    return null
  }
  shifted[shifted.length - 1] = [...start] // first position == last position
  const exterior = counterClockwise(shifted)
  return exterior.length >= 4
    ? { type: 'Polygon', coordinates: [exterior] }
    : null
}

interface AreaSelection {
  /** The map is zoomed in far enough to allow drawing. */
  canDraw: boolean
  /** Draw mode is on. */
  drawing: boolean
  /** Short non-blocking message (a `draw.*` translation key), or null. */
  message: DrawMessage | null
  toggleDrawing: () => void
  clearSelection: () => void
}

/**
 * Freehand ("lasso") area selection on a MapLibre map: draw mode, live stroke,
 * closing rules, and the selection layer. The selection itself is owned by the
 * parent (`selection` / `onSelectionChange`).
 */
export function useAreaSelection(
  mapRef: RefObject<MapLibreMap | null>,
  active: boolean,
  selection: Polygon | null,
  onSelectionChange: (selection: Polygon | null) => void,
): AreaSelection {
  const [canDraw, setCanDraw] = useState(canDrawAtZoom(INITIAL_ZOOM))
  const [drawing, setDrawing] = useState(false)
  const [message, setMessage] = useState<DrawMessage | null>(null)

  const selectionRef = useRef(selection)
  const onChangeRef = useRef(onSelectionChange)
  const messageTimerRef = useRef<number | undefined>(undefined)

  // Another view is shown: leave draw mode (derived state, adjusted in render).
  if (!active && drawing) {
    setDrawing(false)
  }

  useEffect(() => {
    onChangeRef.current = onSelectionChange
  }, [onSelectionChange])

  useEffect(() => {
    return () => {
      window.clearTimeout(messageTimerRef.current)
    }
  }, [])

  // Zoom gate and layer (re)creation after style loads.
  useEffect(() => {
    const map = mapRef.current
    if (map === null) {
      return
    }
    const handleZoom = () => {
      const allowed = canDrawAtZoom(map.getZoom())
      setCanDraw(allowed)
      if (!allowed) {
        setDrawing(false)
      }
    }
    const handleStyleLoad = () => {
      ensureLayers(map, selectionRef.current)
    }
    map.on('zoom', handleZoom)
    map.on('style.load', handleStyleLoad)
    return () => {
      map.off('zoom', handleZoom)
      map.off('style.load', handleStyleLoad)
    }
  }, [mapRef])

  // Keep the selection layer in sync with the selection state.
  useEffect(() => {
    selectionRef.current = selection
    const map = mapRef.current
    if (map !== null) {
      setSourceData(map, SELECTION_SOURCE, selection)
    }
  }, [mapRef, selection])

  // Draw mode: pointer handling, cursor, and disabling of pan/double-click zoom.
  useEffect(() => {
    const map = mapRef.current
    if (map === null || !drawing) {
      return
    }
    const container = map.getCanvasContainer()
    const canvas = map.getCanvas()
    const panWasEnabled = map.dragPan.isEnabled()
    const doubleClickWasEnabled = map.doubleClickZoom.isEnabled()
    map.dragPan.disable()
    map.doubleClickZoom.disable()
    canvas.style.cursor = 'crosshair'
    container.style.touchAction = 'none'
    canvas.style.touchAction = 'none'

    let pointerId: number | null = null
    let stroke: Point[] = []
    let coordinates: Position[] = []
    let frame = 0

    const flushStroke = () => {
      frame = 0
      setSourceData(
        map,
        STROKE_SOURCE,
        coordinates.length > 1 ? { type: 'LineString', coordinates } : null,
      )
    }
    const scheduleStrokeUpdate = () => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(flushStroke)
      }
    }
    const endStroke = () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame)
        frame = 0
      }
      if (pointerId !== null && container.hasPointerCapture(pointerId)) {
        container.releasePointerCapture(pointerId)
      }
      pointerId = null
      stroke = []
      coordinates = []
      if (isLive(mapRef, map)) {
        setSourceData(map, STROKE_SOURCE, null)
      }
    }
    const toPoint = (event: PointerEvent): Point => {
      const rect = container.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }
    const showMessage = (text: DrawMessage) => {
      window.clearTimeout(messageTimerRef.current)
      setMessage(text)
      messageTimerRef.current = window.setTimeout(() => {
        setMessage(null)
      }, LASSO.messageDurationMs)
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || pointerId !== null) {
        return
      }
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return
      }
      event.preventDefault()
      const point = toPoint(event)
      pointerId = event.pointerId
      stroke = [point]
      coordinates = [unprojectPoint(map, point)]
      container.setPointerCapture(event.pointerId)
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) {
        return
      }
      const point = toPoint(event)
      const last = stroke[stroke.length - 1]
      if (
        last !== undefined &&
        Math.hypot(point.x - last.x, point.y - last.y) < LASSO.minPointSpacingPx
      ) {
        return
      }
      stroke.push(point)
      coordinates.push(unprojectPoint(map, point))
      scheduleStrokeUpdate()
    }

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) {
        return
      }
      const finished = stroke
      endStroke()
      if (finished.length < 3) {
        return // a tap, not a drawing
      }
      const ring = closeStroke(finished, {
        closeDistance: LASSO.closeDistancePx,
        minArea: LASSO.minAreaPx2,
      })
      const polygon = ring === null ? null : ringToPolygon(map, ring)
      if (polygon === null) {
        showMessage('closeShape')
        return
      }
      onChangeRef.current(polygon)
      setDrawing(false)
    }

    const handlePointerCancel = (event: PointerEvent) => {
      if (event.pointerId === pointerId) {
        endStroke()
      }
    }

    // Screen points become stale when the map moves (e.g. wheel zoom): drop the stroke.
    const handleMoveStart = () => {
      endStroke()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        endStroke()
        setDrawing(false)
      }
    }

    container.addEventListener('pointerdown', handlePointerDown)
    container.addEventListener('pointermove', handlePointerMove)
    container.addEventListener('pointerup', handlePointerUp)
    container.addEventListener('pointercancel', handlePointerCancel)
    map.on('movestart', handleMoveStart)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown)
      container.removeEventListener('pointermove', handlePointerMove)
      container.removeEventListener('pointerup', handlePointerUp)
      container.removeEventListener('pointercancel', handlePointerCancel)
      map.off('movestart', handleMoveStart)
      document.removeEventListener('keydown', handleKeyDown)
      endStroke()
      canvas.style.cursor = ''
      container.style.touchAction = ''
      canvas.style.touchAction = ''
      if (isLive(mapRef, map)) {
        if (panWasEnabled) {
          map.dragPan.enable()
        }
        if (doubleClickWasEnabled) {
          map.doubleClickZoom.enable()
        }
      }
    }
  }, [mapRef, drawing])

  const toggleDrawing = () => {
    if (drawing) {
      setDrawing(false)
    } else if (canDraw && active) {
      window.clearTimeout(messageTimerRef.current)
      setMessage(null)
      setDrawing(true)
    }
  }

  const clearSelection = () => {
    onSelectionChange(null)
  }

  return { canDraw, drawing, message, toggleDrawing, clearSelection }
}
