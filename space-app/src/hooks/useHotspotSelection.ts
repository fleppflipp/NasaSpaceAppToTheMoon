import { useCallback, useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { Marker, Point } from 'maplibre-gl'
import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl'
import { FIRE_MAP_LAYERS } from '../constants/fires.constants'
import { parseHotspot } from '../services/hotspot'
import type { HotspotDetails } from '../services/hotspot'
import type { Period } from '../services/period'

interface PickedHotspot {
  context: string
  details: HotspotDetails
  anchor: [number, number]
}

const INTERACTIVE_LAYERS = [FIRE_MAP_LAYERS.points]

/** Inspect rendered tile features without IDs, a detail API, or extra tile data. */
export function useHotspotSelection(
  mapRef: RefObject<MapLibreMap | null>,
  period: Period | null,
  active: boolean,
  drawing: boolean,
): { hotspot: HotspotDetails | null; closeHotspot: () => void } {
  const context =
    period === null
      ? ''
      : [period.year, period.month, period.day ?? 'month'].join('/')
  const [picked, setPicked] = useState<PickedHotspot | null>(null)
  const enabled = active && !drawing && period !== null

  // Reset synchronously so changing periods cannot flash or revive old details.
  if (picked !== null && (picked.context !== context || !enabled)) {
    setPicked(null)
  }
  const current = enabled && picked?.context === context ? picked : null

  const closeHotspot = useCallback(() => {
    setPicked(null)
    mapRef.current?.getCanvas().focus({ preventScroll: true })
  }, [mapRef])

  useEffect(() => {
    const map = mapRef.current
    if (map === null || !enabled) {
      return
    }
    const canvas = map.getCanvas()
    const previousShortcuts = canvas.getAttribute('aria-keyshortcuts')
    canvas.setAttribute('aria-keyshortcuts', 'Enter')
    const featuresAt = (point: Point) => {
      const layers = INTERACTIVE_LAYERS.filter((id) => map.getLayer(id))
      return layers.length === 0
        ? []
        : map.queryRenderedFeatures(point, { layers })
    }
    const selectAt = (point: Point) => {
      for (const feature of featuresAt(point)) {
        const details = parseHotspot(feature.properties, feature.geometry)
        if (details === null) {
          continue
        }
        const location = map.unproject(point)
        const anchor: [number, number] = details.coordinates ?? [
          location.lng,
          location.lat,
        ]
        // Keep the marker on the clicked world copy when the map wraps.
        const longitude =
          anchor[0] + 360 * Math.round((location.lng - anchor[0]) / 360)
        setPicked({
          context,
          details,
          anchor: [longitude, anchor[1]],
        })
        return
      }
      setPicked(null)
    }
    const handleClick = (event: MapMouseEvent) => {
      selectAt(event.point)
    }
    const handleMove = (event: MapMouseEvent) => {
      canvas.style.cursor = featuresAt(event.point).length > 0 ? 'pointer' : ''
    }
    const handleLeave = () => {
      if (canvas.style.cursor === 'pointer') {
        canvas.style.cursor = ''
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.repeat || event.isComposing) {
        return
      }
      // Keyboard users can pan the map and inspect a hotspot at its centre.
      event.preventDefault()
      selectAt(new Point(canvas.clientWidth / 2, canvas.clientHeight / 2))
    }
    map.on('click', handleClick)
    map.on('mousemove', handleMove)
    map.on('mouseout', handleLeave)
    canvas.addEventListener('keydown', handleKeyDown)
    return () => {
      map.off('click', handleClick)
      map.off('mousemove', handleMove)
      map.off('mouseout', handleLeave)
      canvas.removeEventListener('keydown', handleKeyDown)
      if (previousShortcuts === null) {
        canvas.removeAttribute('aria-keyshortcuts')
      } else {
        canvas.setAttribute('aria-keyshortcuts', previousShortcuts)
      }
      handleLeave()
    }
  }, [mapRef, context, enabled])

  useEffect(() => {
    const map = mapRef.current
    if (map === null || current === null) {
      return
    }
    // Mark the selected location, rather than outlining a tile-clipped polygon.
    const element = document.createElement('div')
    element.className = 'hotspot-marker'
    element.setAttribute('aria-hidden', 'true')
    const marker = new Marker({ element, anchor: 'center' })
      .setLngLat(current.anchor)
      .addTo(map)
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault()
        closeHotspot()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => {
      marker.remove()
      document.removeEventListener('keydown', handleEscape)
    }
  }, [mapRef, current, closeHotspot])

  return { hotspot: current?.details ?? null, closeHotspot }
}
