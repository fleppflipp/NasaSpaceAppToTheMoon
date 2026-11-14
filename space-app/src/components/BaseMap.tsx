import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import type { Place } from '../services/places'
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
}

export default function BaseMap({ active, target }: BaseMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (container === null) {
      return
    }

    const map = new maplibregl.Map({
      container,
      style: MAP_STYLE_URL,
      center: [19.04, 47.5],
      zoom: 12,
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
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left')

    return () => {
      mapRef.current = null
      map.remove()
    }
  }, [])

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
    // MapLibre adds its own accessible "Map" region inside this container.
    <div ref={containerRef} className="base-map" hidden={!active} />
  )
}
