import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { Polygon } from 'geojson'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { INITIAL_CENTER, INITIAL_ZOOM } from '../constants/map.constants'
import { useAreaSelection } from '../hooks/useAreaSelection'
import { useFireLayers } from '../hooks/useFireLayers'
import { useHotspotSelection } from '../hooks/useHotspotSelection'
import { useFireMarker } from '../hooks/useFireMarker'
import type { FireMarker } from '../hooks/useFireMarker'
import { formatAreaKm2, selectionInfo } from '../services/geo'
import type { Period } from '../services/period'
import type { PeriodsStatus } from '../hooks/useFirePeriods'
import type { Place } from '../services/places'
import CausePanel from './CausePanel'
import DrawControl from './DrawControl'
import ForecastBanner from './ForecastBanner'
import HomeControl from './HomeControl'
import HotspotDetails from './HotspotDetails'
import SpaceBackdrop from './SpaceBackdrop'
import './BaseMap.css'

// Required with Vite so MapLibre can find its web worker.
maplibregl.setWorkerUrl(workerUrl)

// Free OpenStreetMap-based vector style (roads, buildings, labels), no API key.
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

const MAX_SEARCH_ZOOM = 15 // do not zoom in absurdly close on tiny places
const FLY_DURATION_MS = 1500
const VIEW_PADDING_PX = 48

/** Width in pixels of the statistics panel (its width token is in rem), at most the map's width. */
function statsPanelWidthPx(map: HTMLElement): number {
  const token = getComputedStyle(map).getPropertyValue('--layout-stats-width')
  const value = Number.parseFloat(token)
  const rootFontSize = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize,
  )
  const width = token.trim().endsWith('rem') ? value * rootFontSize : value
  return Number.isFinite(width) ? Math.min(width, map.clientWidth) : 0
}

interface BaseMapProps {
  /** The map is hidden (but kept alive) while another view is shown. */
  active: boolean
  /** The statistics panel is out: the map controls move left with it. */
  statsOpen: boolean
  /** When this changes to a new place, the map flies there. */
  target: Place | null
  /** A ring with a label that points out one fire, or null. */
  fireMarker: FireMarker | null
  onFireMarkerDismiss: () => void
  /** The selected area (a freehand-drawn polygon), or null. */
  selection: Polygon | null
  onSelectionChange: (selection: Polygon | null) => void
  /** Only fires inside this month are drawn; null when there is none to show. */
  period: Period | null
  /** `period` is a future month: its forecast is drawn instead of fires. */
  forecast: boolean
  /** Whether the list of months with fire data is loading, loaded or failed. */
  periodsStatus: PeriodsStatus
}

export default function BaseMap({
  active,
  statsOpen,
  target,
  fireMarker,
  onFireMarkerDismiss,
  selection,
  onSelectionChange,
  period,
  forecast,
  periodsStatus,
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
  // Host of the globe button, in the top-left control stack.
  const [homeHost] = useState(() => {
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
      // Added below, collapsed: the map data licences need the credit, but it
      // only has to be one press away, not on screen all the time.
      attributionControl: false,
      center: INITIAL_CENTER,
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
    map.addControl(
      {
        onAdd: () => homeHost,
        onRemove: () => {
          homeHost.remove()
        },
      },
      'top-left',
    )
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right',
    )
    // MapLibre opens the credit text as soon as the style's sources are known;
    // close it again at once, so only the (i) button is ever shown on load.
    let creditCollapsed = false
    const collapseCredit = () => {
      const credit = map.getContainer().querySelector('.maplibregl-ctrl-attrib')
      if (
        !creditCollapsed &&
        credit?.classList.contains('maplibregl-compact-show') === true
      ) {
        credit.classList.remove('maplibregl-compact-show')
        creditCollapsed = true
      }
    }
    map.on('styledata', collapseCredit)
    map.on('sourcedata', collapseCredit)
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left')

    return () => {
      mapRef.current = null
      map.remove()
    }
  }, [controlHost, homeHost])

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

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return
    const observer = new ResizeObserver(() => mapRef.current?.resize())
    observer.observe(container)
    return () => {
      observer.disconnect()
    }
  }, [])

  const { canDraw, drawing, message, toggleDrawing, clearSelection } =
    useAreaSelection(mapRef, active, selection, onSelectionChange)

  useFireLayers(mapRef, period, forecast)
  const { hotspot, closeHotspot } = useHotspotSelection(
    mapRef,
    period,
    active,
    drawing,
  )
  useFireMarker(mapRef, fireMarker, onFireMarkerDismiss)

  // The statistics panel covers the right edge of the map; places are centred
  // in the part that stays visible.
  const statsOpenRef = useRef(statsOpen)
  useEffect(() => {
    statsOpenRef.current = statsOpen
  }, [statsOpen])

  const info = useMemo(
    () => (selection === null ? null : selectionInfo(selection)),
    [selection],
  )
  // A new area or period starts the cause panel afresh (remount).
  const panelKey = useMemo(
    () =>
      selection === null || period === null
        ? ''
        : `${String(period.year)}-${String(period.month)}-${String(period.day)}-${JSON.stringify(selection.coordinates)}`,
    [selection, period],
  )

  useEffect(() => {
    const map = mapRef.current
    const container = containerRef.current
    if (map === null || container === null || target === null) {
      return
    }
    // Pixels of the map the statistics panel covers on the right.
    const covered = statsOpenRef.current ? statsPanelWidthPx(container) : 0
    if (target.bounds === null) {
      // `offset` moves the view only for this flight (camera padding would stay).
      map.flyTo({
        center: [target.lng, target.lat],
        zoom: 12,
        offset: [-covered / 2, 0],
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
      {
        maxZoom: MAX_SEARCH_ZOOM,
        padding: {
          top: VIEW_PADDING_PX,
          bottom: VIEW_PADDING_PX,
          left: VIEW_PADDING_PX,
          right: VIEW_PADDING_PX + covered,
        },
        duration: FLY_DURATION_MS,
      },
    )
  }, [target])

  return (
    <>
      <div
        className={`map-view${statsOpen ? ' map-view--stats' : ''}`}
        hidden={!active}
      >
        <SpaceBackdrop />
        {/* MapLibre adds its own accessible "Map" region inside this container. */}
        <div ref={containerRef} className="base-map" />
        {forecast && period !== null ? (
          <ForecastBanner period={period} />
        ) : null}
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
        {createPortal(
          <HomeControl
            onHome={() => {
              onFireMarkerDismiss()
              mapRef.current?.flyTo({
                center: INITIAL_CENTER,
                zoom: INITIAL_ZOOM,
                duration: FLY_DURATION_MS,
              })
            }}
          />,
          homeHost,
        )}
        {selection === null || period === null ? null : (
          <CausePanel key={panelKey} selection={selection} period={period} />
        )}
        <div className="map-status">
          <p className="map-status__message" role="status">
            {message === null ? '' : t(`draw.${message}`)}
          </p>
          {periodsStatus === 'error' ? (
            <p className="map-status__message">{t('fires.unavailable')}</p>
          ) : periodsStatus === 'ready' && period === null ? (
            <p className="map-status__message">{t('fires.noData')}</p>
          ) : null}
          {info === null ? null : (
            <p className="map-status__readout">
              {t('draw.selectedArea', { area: formatAreaKm2(info.areaKm2) })}
            </p>
          )}
        </div>
      </div>
      {hotspot === null ? null : (
        <HotspotDetails
          hotspot={hotspot}
          calendarOpen={false}
          onClose={closeHotspot}
        />
      )}
    </>
  )
}
