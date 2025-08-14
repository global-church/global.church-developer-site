'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import Link from 'next/link'

type ChurchPin = {
  church_id: string
  name: string
  latitude: number
  longitude: number
  locality: string | null
  region: string | null
  country: string
  website: string | null
}

export default function ChurchMap({
  pins,
  center = [39.5, -98.35], // US center-ish
  zoom = 4,
}: {
  pins: ChurchPin[]
  center?: [number, number]
  zoom?: number
}) {
  // Set Leaflet's default marker icon at runtime via dynamic import
  useEffect(() => {
    (async () => {
      // Dynamically import leaflet so TypeScript doesn't require type declarations at build time
      const L = await import('leaflet')
      const defaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      })
      L.Marker.prototype.options.icon = defaultIcon
    })()
  }, [])

  return (
    <div className="h-[75vh] w-full rounded-xl overflow-hidden border">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pins.map((p) => (
          <Marker key={p.church_id} position={[p.latitude, p.longitude]}>
            <Popup>
              <div className="space-y-1">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {[p.locality, p.region, p.country].filter(Boolean).join(', ')}
                </div>
                <div className="text-xs">
                  <Link className="underline" href={`/church/${p.church_id}`}>Details</Link>
                  {p.website && (
                    <>
                      {' · '}
                      <a className="underline" href={p.website} target="_blank">Website</a>
                    </>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}