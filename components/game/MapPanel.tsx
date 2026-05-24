'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import HiddenTokenRadar from './HiddenTokenRadar'
import { useTokenRadar } from '@/hooks/useTokenRadar'
import { worldChaseMapStyle } from '@/lib/mapStyles'

interface MapPanelProps {
  startLat: number
  startLng: number
  startZoom?: number
  streetViewOnly?: boolean
  streetViewHeading?: number
  streetViewPitch?: number
  challengeId: string
  radarActive: boolean
  onCenterChange: (lat: number, lng: number) => void
  markers: { lat: number; lng: number; id: string }[]
  onMarkerAdd: (lat: number, lng: number) => void
  onMarkerRemove: (id: string) => void
  mapRef: React.MutableRefObject<google.maps.Map | null>
}

export default function MapPanel({
  startLat, startLng, startZoom = 12, streetViewOnly = false,
  streetViewHeading = 0, streetViewPitch = 0,
  challengeId, radarActive,
  onCenterChange, markers, onMarkerAdd, onMarkerRemove, mapRef
}: MapPanelProps) {
  const divRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState({ lat: startLat, lng: startLng, zoom: startZoom })
  const markerObjects = useRef<Map<string, google.maps.Marker>>(new Map())
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [inStreetView, setInStreetView] = useState(streetViewOnly)
  const initializedRef = useRef(false)
  const onCenterChangeRef = useRef(onCenterChange)
  const onMarkerAddRef = useRef(onMarkerAdd)

  useEffect(() => { onCenterChangeRef.current = onCenterChange }, [onCenterChange])
  useEffect(() => { onMarkerAddRef.current = onMarkerAdd }, [onMarkerAdd])

  const { blips, isScanning } = useTokenRadar(challengeId, center, radarActive)

  const toggleStreetView = useCallback(() => {
    if (!mapRef.current) return
    const sv = mapRef.current.getStreetView()
    const next = !sv.getVisible()
    if (next) {
      sv.setPosition({ lat: startLat, lng: startLng })
      sv.setPov({ heading: streetViewHeading, pitch: streetViewPitch })
    }
    sv.setVisible(next)
    setInStreetView(next)
  }, [mapRef, startLat, startLng, streetViewHeading, streetViewPitch])

  useEffect(() => {
    if (!divRef.current || !window.google || initializedRef.current) return
    initializedRef.current = true

    const map = new google.maps.Map(divRef.current, {
      center: { lat: startLat, lng: startLng },
      zoom: startZoom,
      gestureHandling: 'greedy',
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      mapTypeControl: true,
      styles: worldChaseMapStyle,
    })

    mapRef.current = map

    // Force Google Maps to recalculate tile layout after DOM settles
    setTimeout(() => {
      google.maps.event.trigger(map, 'resize')
      map.setCenter({ lat: startLat, lng: startLng })
    }, 300)

    if (streetViewOnly) {
      const sv = map.getStreetView()
      sv.setPosition({ lat: startLat, lng: startLng })
      sv.setPov({ heading: streetViewHeading, pitch: streetViewPitch })
      sv.setVisible(true)
    }

    map.addListener('center_changed', () => {
      const c = map.getCenter()!
      const lat = c.lat(), lng = c.lng()
      const zoom = map.getZoom() ?? 12
      setCoords({ lat, lng, zoom })
      setCenter({ lat, lng })
      onCenterChangeRef.current(lat, lng)
    })

    map.addListener('rightclick', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return
      onMarkerAddRef.current(e.latLng.lat(), e.latLng.lng())
    })

    const sv = map.getStreetView()
    sv.addListener('visible_changed', () => setInStreetView(sv.getVisible()))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync personal markers
  useEffect(() => {
    if (!mapRef.current) return
    const current = new Set(markers.map(m => m.id))

    markerObjects.current.forEach((marker, id) => {
      if (!current.has(id)) { marker.setMap(null); markerObjects.current.delete(id) }
    })

    markers.forEach(m => {
      if (!markerObjects.current.has(m.id)) {
        const marker = new google.maps.Marker({
          position: { lat: m.lat, lng: m.lng },
          map: mapRef.current!,
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#ff3d3d', fillOpacity: 0.8, strokeColor: '#ff3d3d', strokeWeight: 2 },
          title: `${m.lat.toFixed(4)}, ${m.lng.toFixed(4)}`,
        })
        marker.addListener('click', () => onMarkerRemove(m.id))
        markerObjects.current.set(m.id, marker)
      }
    })
  }, [markers, mapRef, onMarkerRemove])

  return (
    <div className="absolute inset-0" style={{ pointerEvents: 'auto' }}>
      <div ref={divRef} id="game-map" style={{ position: 'absolute', inset: 0 }} />

      {/* Street View / Map toggle — bottom right, above coord HUD */}
      <div className="absolute bottom-24 right-2 z-10">
        <button
          onClick={toggleStreetView}
          className="bg-navy/90 border border-gold/40 px-3 py-1.5 font-head text-xs font-bold tracking-wider hover:border-gold hover:text-gold transition-all text-white"
        >
          {inStreetView ? '🗺 MAP VIEW' : '📷 STREET VIEW'}
        </button>
      </div>

      {/* Street View navigation tip — shown when in street view */}
      {inStreetView && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-navy/95 border border-electric/40 px-4 py-2 font-head text-xs text-electric pointer-events-none whitespace-nowrap z-10">
          Drag to look around &nbsp;·&nbsp; Click road arrows to walk &nbsp;·&nbsp; Scroll to zoom
        </div>
      )}

      {/* Coordinate HUD */}
      {!inStreetView && (
        <div className="absolute bottom-10 right-2 bg-navy/90 border border-gold/20 px-3 py-2 font-mono text-xs text-gold/80 pointer-events-none z-10">
          <div>LAT &nbsp; <span className="text-white">{coords.lat.toFixed(4)}</span></div>
          <div>LNG &nbsp; <span className="text-white">{coords.lng.toFixed(4)}</span></div>
          <div>ZOOM <span className="text-white">{coords.zoom}</span></div>
        </div>
      )}

      {/* Map controls hint */}
      <div className="absolute bottom-2 left-2 bg-navy/80 border border-white/10 px-2 py-1.5 font-mono text-xs text-text-muted pointer-events-none z-10">
        {inStreetView
          ? 'Drag = look  · Click arrows = walk  · V = map view'
          : 'Drag = pan  · Scroll = zoom  · Right-click = pin  · V = street view'}
      </div>

      {/* Token Radar */}
      {radarActive && (
        <div className="absolute top-3 left-3 bg-navy/90 border border-gold/30 p-3 z-10">
          <HiddenTokenRadar blips={blips} isScanning={isScanning} />
        </div>
      )}
    </div>
  )
}
