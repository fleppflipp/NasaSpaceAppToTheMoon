import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { Polygon } from 'geojson'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { INITIAL_ZOOM } from '../constants/map.constants'
import { useAreaSelection } from '../hooks/useAreaSelection'
import { useFireLayers } from '../hooks/useFireLayers'
import { formatAreaKm2, selectionInfo } from '../services/geo'
import type { Period } from '../services/period'
import type { Place } from '../services/places'
import DrawControl from './DrawControl'
import './BaseMap.css'

// Required with Vite so MapLibre can find its web worker.
maplibregl.setWorkerUrl(workerUrl)

// Free OpenStreetMap-based vector style (roads, buildings, labels), no API key.
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

const MAX_SEARCH_ZOOM = 15 // do not zoom in absurdly close on tiny places
const FLY_DURATION_MS = 1500

interface BaseMapProps {
  /** The map is hidden (but kept alive) while another view is shown. */
  active: boolean
  /** When this changes to a new place, the map flies there. */
  target: Place | null
  /** The selected area (a freehand-drawn polygon), or null. */
  selection: Polygon | null
  onSelectionChange: (selection: Polygon | null) => void
  /** Only fires inside this period are drawn. */
  period: Period
}

export default function BaseMap({
  active,
  target,
  selection,
  onSelectionChange,
  period,
}: BaseMapProps) {
  const { t } = useTranslation()
  // The map is created once; later language changes only relabel its controls.
  const tRef = useRef(t)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  // Host element of the draw buttons inside MapLibre's top-right control stack.
  const [controlHost] = useState(() => {
    const element = document.createElement('div')
    element.className = 'maplibregl-ctrl'
    return element
  })

  useEffect(() => {
    tRef.current = t
  }, [t])

  useEffect(() => {
    const container = containerRef.current
    if (container === null) {
      return
    }
    const translate = tRef.current

    const map = new maplibregl.Map({
      container,
      locale: {
        'Map.Title': translate('map.title'),
        'NavigationControl.ZoomIn': translate('map.zoomIn'),
        'NavigationControl.ZoomOut': translate('map.zoomOut'),
        'AttributionControl.ToggleAttribution': translate('map.attribution'),
        'AttributionControl.MapFeedback': translate('map.feedback'),
      },
      style: MAP_STYLE_URL,
      center: [19.04, 47.5],
      zoom: INITIAL_ZOOM,
      minZoom: 0,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    })
    mapRef.current = map
    map.touchZoomRotate.disableRotation()
    // Zoomed far out the map becomes a globe; zoomed in it blends into a flat map.
    map.on('style.load', () => {
      map.setProjection({ type: 'globe' })
    })
    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: false,
        visualizePitch: false,
      }),
      'top-right',
    )
    map.addControl(
      {
        onAdd: () => controlHost,
        onRemove: () => {
          controlHost.remove()
        },
      },
      'top-right',
    )
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left')

    return () => {
      mapRef.current = null
      map.remove()
    }
  }, [controlHost])

  // MapLibre only reads its UI strings at creation, so relabel the controls.
  useEffect(() => {
    const container = containerRef.current
    const map = mapRef.current
    if (container === null || map === null) {
      return
    }
    const relabel = (selector: string, label: string) => {
      const element = container.querySelector(selector)
      if (element instanceof HTMLElement) {
        element.title = label
        element.setAttribute('aria-label', label)
      }
    }
    relabel('.maplibregl-ctrl-zoom-in', t('map.zoomIn'))
    relabel('.maplibregl-ctrl-zoom-out', t('map.zoomOut'))
    relabel('.maplibregl-ctrl-attrib-button', t('map.attribution'))
    map.getCanvas().setAttribute('aria-label', t('map.title'))
  }, [t])

  useEffect(() => {
    if (active) mapRef.current?.resize()
  }, [active])

  const { canDraw, drawing, message, toggleDrawing, clearSelection } =
    useAreaSelection(mapRef, active, selection, onSelectionChange)

  const { hasData } = useFireLayers(mapRef, period)

  const info = useMemo(
    () => (selection === null ? null : selectionInfo(selection)),
    [selection],
  )

  useEffect(() => {
    const map = mapRef.current
    if (map === null || target === null) {
      return
    }
    if (target.bounds === null) {
      map.flyTo({
        center: [target.lng, target.lat],
        zoom: 12,
        duration: FLY_DURATION_MS,
      })
      return
    }
    const [west, south, east, north] = target.bounds
    map.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { maxZoom: MAX_SEARCH_ZOOM, padding: 48, duration: FLY_DURATION_MS },
    )
  }, [target])

  return (
    <div className="map-view" hidden={!active}>
      {/* MapLibre adds its own accessible "Map" region inside this container. */}
      <div ref={containerRef} className="base-map" />
      {createPortal(
        <DrawControl
          canDraw={canDraw}
          drawing={drawing}
          hasSelection={selection !== null}
          onToggle={toggleDrawing}
          onClear={clearSelection}
        />,
        controlHost,
      )}
      <div className="map-status">
        <p className="map-status__message" role="status">
          {message === null ? '' : t(`draw.${message}`)}
        </p>
        {hasData ? null : (
          <p className="map-status__message">{t('fires.noData')}</p>
        )}
        {info === null ? null : (
          <p className="map-status__readout">
            {t('draw.selectedArea', { area: formatAreaKm2(info.areaKm2) })}
          </p>
        )}
      </div>
    </div>
  )
}
