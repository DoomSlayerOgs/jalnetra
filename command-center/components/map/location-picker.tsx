'use client'

import { useEffect, useRef } from 'react'
export type GeoCoordinates = { lat: number; lng: number }

export function LocationPicker({
  coordinates,
  onPick,
}: {
  coordinates: GeoCoordinates | null
  onPick: (coordinates: GeoCoordinates) => void
}) {
  const elementRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('leaflet').Map | null>(null)
  const markerRef = useRef<import('leaflet').CircleMarker | null>(null)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

  useEffect(() => {
    let disposed = false
    let resizeObserver: ResizeObserver | undefined
    let map: import('leaflet').Map | undefined

    void import('leaflet').then((leaflet) => {
      if (disposed || !elementRef.current) return
      map = leaflet.map(elementRef.current, { zoomControl: true, scrollWheelZoom: true }).setView([22.5, 79], 4)
      leaflet
        .tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
          maxZoom: 19,
        })
        .addTo(map)
      map.on('click', (event: import('leaflet').LeafletMouseEvent) => {
        onPickRef.current({ lat: event.latlng.lat, lng: event.latlng.lng })
      })
      mapRef.current = map
      resizeObserver = new ResizeObserver(() => map?.invalidateSize())
      resizeObserver.observe(elementRef.current)
      window.setTimeout(() => map?.invalidateSize(), 100)
    })

    return () => {
      disposed = true
      resizeObserver?.disconnect()
      map?.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void import('leaflet').then((leaflet) => {
      if (cancelled || !mapRef.current || !coordinates) return
      const position: [number, number] = [coordinates.lat, coordinates.lng]
      if (!markerRef.current) {
        markerRef.current = leaflet
          .circleMarker(position, {
            radius: 9,
            color: '#fff7ed',
            weight: 3,
            fillColor: '#ef4444',
            fillOpacity: 1,
          })
          .addTo(mapRef.current)
          .bindPopup('Selected help location')
      } else {
        markerRef.current.setLatLng(position)
      }
      mapRef.current.setView(position, Math.max(mapRef.current.getZoom(), 14), { animate: true })
    })
    return () => {
      cancelled = true
    }
  }, [coordinates])

  return <div ref={elementRef} className="h-full min-h-72 w-full" aria-label="Map of India and Mumbai. Select your exact help location." role="application" />
}
