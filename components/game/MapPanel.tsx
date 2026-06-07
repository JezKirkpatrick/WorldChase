'use client'
import { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react'
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
  mobilePanelExpanded?: boolean
}

export default function MapPanel({
  startLat, startLng, startZoom = 12, streetViewOnly = false,
  streetViewHeading = 0, streetViewPitch = 0,
  challengeId, radarActive, mobilePanelExpanded = false,
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

  function loadOutdoorPanorama(sv: google.maps.StreetViewPanorama, lat: number, lng: number, heading: number, pitch: number) {
    const svc = new google.maps.StreetViewService()
    svc.getPanorama(
      { location: { lat, lng }, radius: 150, source: (google.maps as any).StreetViewSource?.OUTDOOR ?? 'OUTDOOR' },
      (data: any, status: any) => {
        if (status === 'OK' && data?.location?.pano) {
          sv.setPano(data.location.pano)
          sv.setPov({ heading, pitch })
          sv.setVisible(true)
        } else {
          // Fallback: widen search to 500m outdoors only
          svc.getPanorama(
            { location: { lat, lng }, radius: 500, source: (google.maps as any).StreetViewSource?.OUTDOOR ?? 'OUTDOOR' },
            (data2: any, status2: any) => {
              if (status2 === 'OK' && data2?.location?.pano) {
                sv.setPano(data2.location.pano)
                sv.setPov({ heading, pitch })
              } else {
                sv.setPosition({ lat, lng })
                sv.setPov({ heading, pitch })
              }
              sv.setVisible(true)
            }
          )
        }
      }
    )
  }

  const toggleStreetView = useCallback(() => {
    if (!mapRef.current) return
    const sv = mapRef.current.getStreetView()
    const next = !sv.getVisible()
    if (next) {
      loadOutdoorPanorama(sv, startLat, startLng, streetViewHeading, streetViewPitch)
    } else {
      sv.setVisible(false)
    }
    setInStreetView(next)
  }, [mapRef, startLat, startLng, streetViewHeading, streetViewPitch])

  const resetView = useCallback(() => {
    if (!mapRef.current) return
    if (inStreetView) {
      const sv = mapRef.current.getStreetView()
      loadOutdoorPanorama(sv, startLat, startLng, streetViewHeading, streetViewPitch)
    } else {
      mapRef.current.setCenter({ lat: startLat, lng: startLng })
      mapRef.current.setZoom(startZoom)
    }
  }, [mapRef, inStreetView, startLat, startLng, startZoom, streetViewHeading, streetViewPitch])

  useEffect(() => {
    if (!divRef.current || !(window as any).google?.maps?.Map || initializedRef.current) return
    initializedRef.current = true

    const map = new google.maps.Map(divRef.current, {
      center: { lat: startLat, lng: startLng },
      zoom: startZoom,
      gestureHandling: 'greedy',
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      mapTypeControl: true,
      styles: worldChaseMapStyle,
      // Push Google's built-in controls above the mobile bottom sheet (52px handle)
      padding: { bottom: 60 },
    } as google.maps.MapOptions)

    mapRef.current = map

    // Force Google Maps to recalculate tile layout after DOM settles
    setTimeout(() => {
      google.maps.event.trigger(map, 'resize')
      map.setCenter({ lat: startLat, lng: startLng })
    }, 300)

    if (streetViewOnly) {
      const sv = map.getStreetView()
      loadOutdoorPanorama(sv, startLat, startLng, streetViewHeading, streetViewPitch)
    }

    // Use 'idle' (fires once after pan/zoom stops) instead of 'center_changed'
    // (which fires every animation frame and causes ~60 re-renders per second of dragging)
    map.addListener('idle', () => {
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
    sv.addListener('visible_changed', () => {
      setInStreetView(sv.getVisible())
    })
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

      {/* Controls — hidden on mobile when mission panel is expanded */}
      <div className={`absolute bottom-44 sm:bottom-24 right-2 z-10 flex flex-col gap-1.5 items-end transition-opacity duration-300 ${mobilePanelExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <button
          onClick={resetView}
          className="bg-navy/90 border border-white/30 px-3 py-1.5 font-head text-xs font-bold tracking-wider hover:border-gold hover:text-gold transition-all text-white/80"
        >
          ⌂ RESET VIEW
        </button>
        <button
          onClick={toggleStreetView}
          className="bg-navy/90 border border-gold/40 px-3 py-1.5 font-head text-xs font-bold tracking-wider hover:border-gold hover:text-gold transition-all text-white"
        >
          {inStreetView ? '🗺 MAP VIEW' : '📷 STREET VIEW'}
        </button>
      </div>

      {/* Coordinate HUD — desktop only */}
      {!inStreetView && (
        <div className="hidden sm:block absolute bottom-10 right-2 bg-navy/90 border border-gold/20 px-3 py-2 font-mono text-xs text-gold/80 pointer-events-none z-10">
          <div>LAT &nbsp; <span className="text-white">{coords.lat.toFixed(4)}</span></div>
          <div>LNG &nbsp; <span className="text-white">{coords.lng.toFixed(4)}</span></div>
          <div>ZOOM <span className="text-white">{coords.zoom}</span></div>
        </div>
      )}


{/* Token Radar */}
      {radarActive && (
        <div className="absolute top-3 left-3 bg-navy/90 border border-gold/30 p-3 z-10">
          <HiddenTokenRadar blips={blips} isScanning={isScanning} />
        </div>
      )}
    </div>
  )
}
