'use client'

import { useCallback, useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet'
import Supercluster from 'supercluster'
import type { DivIcon, LatLngBoundsExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Link from 'next/link'
import * as GeoJSON from 'geojson'

// ChurchPin type is now defined in ChurchMap.tsx

export default function LeafletMapInner({
	pins,
	center = [25, 10],
	zoom = 3,
}: {
	pins: {
		church_id: string
		name: string
		latitude: number
		longitude: number
		locality: string | null
		region: string | null
		country: string
		website: string | null
		belief_type?: string | null
		service_languages?: string[] | null
	}[]
	center?: [number, number]
	zoom?: number
}) {
	const [blackPinIcon, setBlackPinIcon] = useState<DivIcon | null>(null)
  const [clusterIndex, setClusterIndex] = useState<Supercluster | null>(null)
  const [bounds, setBounds] = useState<[[number, number], [number, number]] | null>(null)
  const [zoomLevel, setZoomLevel] = useState<number>(3)

  // Linear scale helpers for icons
  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value))
  }
  function interpolateSize(zoom: number, minZoom: number, maxZoom: number, minSize: number, maxSize: number) {
    const z = clamp(zoom, minZoom, maxZoom)
    const t = (z - minZoom) / (maxZoom - minZoom)
    return Math.round(minSize + t * (maxSize - minSize))
  }

  type ChurchPointProps = {
    church_id: string
    name: string
    latitude: number
    longitude: number
    locality: string | null
    region: string | null
    country: string
    website: string | null
    belief_type?: string | null
    service_languages?: string[] | null
  }

  // Cluster marker with smooth flyTo animation
  function ClusterMarker({ lat, lng, id, count, index }: { lat: number; lng: number; id: number; count: number; index: Supercluster }) {
    const map = useMap()
    const Lw = (typeof window !== 'undefined' ? (window as unknown as { L?: { divIcon: (opts: { html: string; className: string; iconSize: [number, number]; iconAnchor: [number, number] }) => DivIcon } }).L : undefined) || null
    const size = interpolateSize(zoomLevel, 3, 12, 25, 30)
    const border = Math.max(2, Math.round(size * 0.08))
    const inset = Math.round(size * 0.175)
    const fontSize = Math.max(10, Math.round(size * 0.3))
    const icon = Lw ? Lw.divIcon({
      html: `
        <div style="
          width: ${size}px; height: ${size}px; border-radius: 50%;
          background: #000; border: ${border}px solid #fff;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 6px 14px rgba(0,0,0,0.25);
          position: relative;
        ">
          <div style="position:absolute; inset: ${inset}px; border-radius: 50%; background:#fff;"></div>
          <span style="position:relative; z-index:1; color:#000; font-weight:800; font-size:${fontSize}px;">${count}</span>
        </div>
      `,
      className: '', iconSize: [size, size], iconAnchor: [Math.round(size/2), Math.round(size/2)]
    }) : undefined

    return (
      <Marker
        position={[lat, lng]}
        icon={icon as unknown as DivIcon}
        eventHandlers={{
          click: () => {
            const expansionZoom = Math.min(index.getClusterExpansionZoom(id), 18)
            // Smooth animated transition
            map.setView([lat, lng], expansionZoom, { animate: true })
          },
        }}
      />
    )
  }
  type FeaturePoint = GeoJSON.Feature<GeoJSON.Point, { cluster: false; church_id: string; point: ChurchPointProps }>
  type ClusterFeature = GeoJSON.Feature<GeoJSON.Point, { cluster: true; point_count: number; point_count_abbreviated: number }>

	function countryCodeToFlagEmoji(code?: string | null): string | null {
		if (!code) return null
		const cc = String(code).trim().toUpperCase()
		if (!/^[A-Z]{2}$/.test(cc)) return null
		const OFFSET = 127397 // Unicode regional indicator offset
		const points = Array.from(cc).map((c) => c.charCodeAt(0) + OFFSET)
		try {
			return String.fromCodePoint(...points)
		} catch {
			return null
		}
	}

	useEffect(() => {
		// Create the black pin icon after component mounts
		const createIcon = async () => {
			try {
				const L = await import('leaflet')
				
				// Fix default icon path issue that can cause blue question marks
				L.Icon.Default.mergeOptions({
					iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
					iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
					shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
				})
				
				const icon = L.divIcon({
					className: 'custom-marker',
					html: `
						<div style="
							width: 24px;
							height: 24px;
							background: #000 !important;
							border: 2px solid #fff !important;
							border-radius: 50% !important;
							display: flex !important;
							align-items: center !important;
							justify-content: center !important;
							box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
							position: relative !important;
							z-index: 1000 !important;
						">
							<div style="
								width: 8px;
								height: 8px;
								background: #fff !important;
								border-radius: 50% !important;
							"></div>
						</div>
					`,
					iconSize: [24, 24],
					iconAnchor: [12, 24],
					popupAnchor: [0, -24],
				})
				
				console.log('Custom black pin icon created successfully:', icon)
				setBlackPinIcon(icon)
				
				// Also set as default icon as fallback
				L.Marker.prototype.options.icon = icon
			} catch (error) {
				console.error('Error creating custom icon:', error)
			}
		}

		createIcon()
	}, [])

  // Rescale pin icon as zoom changes for better sense of scale
  useEffect(() => {
    const updateIcon = async () => {
      const L = await import('leaflet')
      const outer = interpolateSize(zoomLevel, 3, 10, 16, 20 )
      const inner = Math.max(6, Math.round(outer * 0.33))
      const border = 2
      const icon = L.divIcon({
        className: 'custom-marker', 
        html: `
          <div style="
            width: ${outer}px;
            height: ${outer}px;
            background: #000 !important;
            border: ${border}px solid #fff !important;
            border-radius: 50% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
            position: relative !important;
            z-index: 1000 !important;
          ">
            <div style="
              width: ${inner}px;
              height: ${inner}px;
              background: #fff !important;
              border-radius: 50% !important;
            "></div>
          </div>
        `,
        iconSize: [outer, outer],
        iconAnchor: [Math.round(outer / 2), outer],
        popupAnchor: [0, -outer],
      })
      setBlackPinIcon(icon)
    }
    updateIcon()
  }, [zoomLevel])

  // Build Supercluster index when pins change
  useEffect(() => {
    const features: FeaturePoint[] = pins.map((p) => ({
      type: 'Feature',
      properties: { cluster: false, church_id: p.church_id, point: p },
      geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
    }))
    const index = new Supercluster({ radius: 60, maxZoom: 16 })
    // Supercluster typings expect GeoJSON.Feature[]; cast safely
    index.load(features as unknown as GeoJSON.Feature<GeoJSON.Point, { [key: string]: unknown }>[]) 
    setClusterIndex(index)
  }, [pins])

  const handleMapChange = useCallback((map: ReturnType<typeof useMap>, padding = 0.75) => {
    const b = map.getBounds()
    const maybePad = (b as unknown as { pad?: (bufferRatio: number) => typeof b }).pad
    const padded = typeof maybePad === 'function' ? maybePad.call(b as unknown as object, padding) : b
    const nextBounds: [number, number, number, number] = [padded.getWest(), padded.getSouth(), padded.getEast(), padded.getNorth()]
    const nextZoom = map.getZoom()
    setBounds((prev) => {
      const prevFlat = prev ? [prev[0][0], prev[0][1], prev[1][0], prev[1][1]] : null
      const equal = prevFlat && nextBounds.every((v, i) => Math.abs(v - (prevFlat as number[])[i]) <= 1e-6)
      return equal ? prev : [[nextBounds[0], nextBounds[1]], [nextBounds[2], nextBounds[3]]]
    })
    setZoomLevel((prev) => (Math.abs(prev - nextZoom) <= 1e-3 ? prev : nextZoom))
  }, [])

  function MapStateSyncCore({ onChange, padding = 0.75 }: { onChange: (map: ReturnType<typeof useMap>, padding?: number) => void; padding?: number }) {
    const map = useMap()
    useEffect(() => {
      const update = () => onChange(map, padding)
      update()
      map.on('moveend', update)
      map.on('zoomend', update)
      return () => {
        map.off('moveend', update)
        map.off('zoomend', update)
      }
    }, [map, onChange, padding])
    return null
  }

	// Shared map props to prevent infinite zoom-out and vertical gray space
	const mapProps = {
		center,
		zoom,
		scrollWheelZoom: true,
		worldCopyJump: true,
		maxBounds: [[-85, -180], [85, 180]] as LatLngBoundsExpression,
		maxBoundsViscosity: 1.0 as number,
		minZoom: 3 as number,
		zoomSnap: 1 as number,
		zoomControl: false as boolean,
		zoomAnimation: false as boolean,
		fadeAnimation: false as boolean,
	}

	// Don't render markers until icon is ready
	if (!blackPinIcon) {
		console.log('Waiting for custom icon to be created...')
		return (
			<div className="h-full w-full">
				<MapContainer {...mapProps} className="h-full w-full">
					<TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
					<ZoomControl position="topright" />
				</MapContainer>
			</div>
		)
	}

	console.log('Rendering markers with custom icon:', blackPinIcon, 'Total pins:', pins.length)

	return (
		<div className="h-full w-full">
			<MapContainer {...mapProps} className="h-full w-full">
				<TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
				<ZoomControl position="topright" />
				<MapStateSyncCore onChange={handleMapChange} padding={0.75} />
				{clusterIndex && bounds && (
					<>
						{clusterIndex.getClusters([bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]], Math.round(zoomLevel)).map((c) => {
							const feat = c as GeoJSON.Feature<GeoJSON.Point>
							const [lng, lat] = feat.geometry.coordinates
							const props = (c as unknown as { properties: Record<string, unknown> }).properties
							if (Boolean(props.cluster)) {
								const cf = c as unknown as ClusterFeature
								const count = cf.properties.point_count
								const cid = (c as unknown as { id: number }).id
								return (
									<ClusterMarker key={`cluster-${String(cid)}`} lat={lat} lng={lng} id={cid} count={count} index={clusterIndex} />
								)
							}
							const fp = c as unknown as FeaturePoint
							const p = fp.properties.point
							return (
								<Marker key={p.church_id} position={[lat, lng]} icon={blackPinIcon}>
									<Popup className="min-w-64">
										<div className="space-y-3 p-2">
											<div className="font-semibold text-gray-900 text-base">{p.name}</div>
											<div className="text-sm text-gray-600 flex items-center gap-1">
												<span className="w-2 h-2 bg-gray-400 rounded-full"></span>
												<span>{[p.locality, p.region, p.country].filter((part) => part && String(part).toLowerCase() !== 'null').join(', ')}</span>
												{countryCodeToFlagEmoji(p.country) && (
													<span className="ml-1 text-base leading-none">{countryCodeToFlagEmoji(p.country)}</span>
												)}
											</div>
											{p.belief_type && (
												<div className="text-xs text-gray-700 capitalize">{String(p.belief_type).replace('_', ' ')}</div>
											)}
											{Array.isArray(p.service_languages) && p.service_languages.length > 0 && (
												p.service_languages.length === 1 ? (
													<div className="text-xs text-gray-700"><em>{p.service_languages[0]}</em></div>
												) : (
													<div className="text-xs text-gray-700">Service Languages: {p.service_languages.join(', ')}</div>
												)
											)}
											<div className="flex gap-2 text-sm">
												<Link className="text-green-600 hover:text-green-700 font-medium" href={`/church/${p.church_id}`}>View Details</Link>
												{p.website && (<><span className="text-gray-300">•</span><a className="text-blue-600 hover:text-blue-700" href={p.website} target="_blank" rel="noopener noreferrer">Website</a></>)}
											</div>
										</div>
									</Popup>
								</Marker>
							)
						})}
					</>
				)}
			</MapContainer>
		</div>
	)
}
