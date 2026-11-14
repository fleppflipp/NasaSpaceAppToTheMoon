import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import * as maplibregl from 'maplibre-gl'
import {
  FIRE_MARKER_PULSES,
  FIRE_MARKER_PULSE_MS,
} from '../constants/fires.constants'

export interface FireMarker {
  lng: number
  lat: number
  /** Short text next to the ring, for example "38,613 MW · Jul 3". */
  label: string
  /** What a screen reader says: the label and that pressing hides the marker. */
  ariaLabel: string
}

/**
 * A ring with a label on the map, to point out one fire among many overlapping
 * circles. It pulses twice and then stays until the user touches the map: a
 * click, a drag, a scroll or any other move made by hand. A flight that the app
 * makes itself does not count. Pressing the marker also hides it. All of these
 * call `onDismiss`.
 */
export function useFireMarker(
  mapRef: RefObject<maplibregl.Map | null>,
  marker: FireMarker | null,
  onDismiss: () => void,
): void {
  const dismissRef = useRef(onDismiss)
  useEffect(() => {
    dismissRef.current = onDismiss
  }, [onDismiss])

  const lng = marker?.lng
  const lat = marker?.lat
  const label = marker?.label
  const ariaLabel = marker?.ariaLabel
  useEffect(() => {
    const map = mapRef.current
    if (
      map === null ||
      lng === undefined ||
      lat === undefined ||
      label === undefined ||
      ariaLabel === undefined
    ) {
      return
    }
    const element = document.createElement('button')
    element.type = 'button'
    element.className = 'fire-marker'
    // The pulse count and length are set here, in one place, for the CSS animation.
    element.style.setProperty(
      '--fire-marker-pulse-ms',
      `${String(FIRE_MARKER_PULSE_MS)}ms`,
    )
    element.style.setProperty(
      '--fire-marker-pulses',
      String(FIRE_MARKER_PULSES),
    )
    element.setAttribute('aria-label', ariaLabel)
    const ring = document.createElement('span')
    ring.className = 'fire-marker__ring'
    const text = document.createElement('span')
    text.className = 'fire-marker__label'
    text.textContent = label
    element.append(ring, text)
    element.addEventListener('click', () => {
      dismissRef.current()
    })
    const mapMarker = new maplibregl.Marker({ element, anchor: 'center' })
      .setLngLat([lng, lat])
      .addTo(map)
    const handleClick = () => {
      dismissRef.current()
    }
    // Moves the user makes carry the original mouse, touch, wheel or key event;
    // the app's own flights do not.
    const handleMoveStart = (event: maplibregl.MapLibreEvent) => {
      if (event.originalEvent !== undefined) {
        dismissRef.current()
      }
    }
    map.on('click', handleClick)
    map.on('movestart', handleMoveStart)
    return () => {
      map.off('click', handleClick)
      map.off('movestart', handleMoveStart)
      mapMarker.remove()
    }
  }, [mapRef, lng, lat, label, ariaLabel])
}
