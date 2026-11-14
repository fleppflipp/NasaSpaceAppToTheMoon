import { useCallback, useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import type { Place } from '../services/places'
import SearchBar from './SearchBar'
import './BaseMap.css'

// Required with Vite so MapLibre can find its web worker.
maplibregl.setWorkerUrl(workerUrl)

// Free OpenStreetMap-based vector style (roads, buildings, labels), no API key.
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

const MAX_SEARCH_ZOOM = 15 // do not zoom in absurdly close on tiny places
const FLY_DURATION_MS = 1500

export default function BaseMap() {
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

  const goToPlace = useCallback((place: Place) => {
    const map = mapRef.current
    if (map === null) {
      return
    }
    if (place.bounds === null) {
      map.flyTo({
        center: [place.lng, place.lat],
        zoom: 12,
        duration: FLY_DURATION_MS,
      })
      return
    }
    const [west, south, east, north] = place.bounds
    map.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { maxZoom: MAX_SEARCH_ZOOM, padding: 48, duration: FLY_DURATION_MS },
    )
  }, [])

  return (
    <>
      <div ref={containerRef} className="base-map" aria-label="Map" />
      <SearchBar onResult={goToPlace} />
    </>
  )
}
