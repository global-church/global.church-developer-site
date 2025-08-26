'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet'
import Supercluster from 'supercluster'
import type { DivIcon, LatLngBoundsExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Link from 'next/link'
import * as GeoJSON from 'geojson'
import { searchChurchesByBbox } from '@/lib/zuplo'

// ChurchPin type is now defined in ChurchMap.tsx

// Linear scale helpers for icons (module scope to avoid hook deps warnings)
function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
function interpolateSize(zoom: number, minZoom: number, maxZoom: number, minSize: number, maxSize: number) {
  const z = clamp(zoom, minZoom, maxZoom)
  const t = (z - minZoom) / (maxZoom - minZoom)
  return Math.round(minSize + t * (maxSize - minSize))
}

export default function LeafletMapInner({
	pins,
	center = [25, 10],
	zoom = 3,
	filters: _filters,
	fitKey,
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
		geojson?: { type: 'Point'; coordinates: [number, number] } | null
	}[]
	center?: [number, number]
	zoom?: number
	filters?: { q?: string; belief?: string; region?: string; country?: string; language?: string }
	fitKey?: number
}) {
	const [blackPinIcon, setBlackPinIcon] = useState<DivIcon | null>(null)
  const [clusterIndex, setClusterIndex] = useState<Supercluster | null>(null)
  const [bounds, setBounds] = useState<[[number, number], [number, number]] | null>(null)
  const [zoomLevel, setZoomLevel] = useState<number>(3)
  const [pinsState, setPinsState] = useState<typeof pins>(pins)
  const debounceTimerRef = useRef<number | null>(null)
  const requestIdRef = useRef<number>(0)
  const rpcUnavailableRef = useRef<boolean>(false)
  const lastBoundsKeyRef = useRef<string>('')
  const lastAppliedFitKeyRef = useRef<number>(-1)
  const userInteractingRef = useRef<boolean>(false)

  // Linear scale helpers are defined at module scope

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
    geojson?: { type: 'Point'; coordinates: [number, number] } | null
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

  // Build Supercluster index when pins change (prefer geojson when present)
  // Keep internal state in sync with incoming props so external filters immediately update markers
  useEffect(() => {
    setPinsState(pins)
  }, [pins])

  // Rebuild clustering index any time our pins state changes
  useEffect(() => {
    const features: FeaturePoint[] = pinsState.map((p) => {
      const coords = p.geojson?.coordinates || [p.longitude, p.latitude]
      return {
        type: 'Feature',
        properties: { cluster: false, church_id: p.church_id, point: p },
        geometry: { type: 'Point', coordinates: coords as [number, number] },
      }
    })
    const index = new Supercluster({ radius: 60, maxZoom: 16 })
    // Supercluster typings expect GeoJSON.Feature[]; cast safely
    ;(index as unknown as { load: (features: unknown[]) => void }).load(features as unknown[])
    setClusterIndex(index)
  }, [pinsState])

  const handleMapChange = useCallback((map: ReturnType<typeof useMap>, padding = 0.75) => {
    const b = map.getBounds()
    const maybePad = (b as unknown as { pad?: (bufferRatio: number) => typeof b }).pad
    const padded = typeof maybePad === 'function' ? maybePad.call(b as unknown as object, padding) : b
    const west = padded.getWest()
    const south = padded.getSouth()
    const east = padded.getEast()
    const north = padded.getNorth()
    const zoomNow = map.getZoom()
    // Round to reduce jitter and prevent infinite update loops
    const key = `${west.toFixed(4)}|${south.toFixed(4)}|${east.toFixed(4)}|${north.toFixed(4)}|${zoomNow.toFixed(2)}`
    if (lastBoundsKeyRef.current === key) return
    lastBoundsKeyRef.current = key
    const nextBounds: [number, number, number, number] = [west, south, east, north]
    setBounds([[nextBounds[0], nextBounds[1]], [nextBounds[2], nextBounds[3]]])
    setZoomLevel((prev) => (Math.abs(prev - zoomNow) <= 1e-3 ? prev : zoomNow))
  }, [])

  // Debounced viewport fetch using public RPC churches_in_bbox
  useEffect(() => {
    if (!bounds) return

    // Compute spans and skip overly large bboxes
    const [minLng, minLat] = bounds[0]
    const [maxLng, maxLat] = bounds[1]
    const spanLng = Math.abs(maxLng - minLng)
    const spanLat = Math.abs(maxLat - minLat)
    if (spanLng > 15 || spanLat > 15) {
      return
    }

    // Debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    debounceTimerRef.current = window.setTimeout(async () => {
      const reqId = ++requestIdRef.current
      try {
        if (rpcUnavailableRef.current) return
        // Ensure numeric params
        const p_min_lng = Number(minLng)
        const p_min_lat = Number(minLat)
        const p_max_lng = Number(maxLng)
        const p_max_lat = Number(maxLat)
        if (!Number.isFinite(p_min_lng) || !Number.isFinite(p_min_lat) || !Number.isFinite(p_max_lng) || !Number.isFinite(p_max_lat)) {
          return
        }
        const data = await searchChurchesByBbox({
          min_lng: p_min_lng,
          min_lat: p_min_lat,
          max_lng: p_max_lng,
          max_lat: p_max_lat,
          limit: 500,
        })
        // Guard against stale responses
        if (reqId !== requestIdRef.current) return

        const rows = (data ?? []) as Array<{
          church_id: string
          name: string
          latitude: number | null
          longitude: number | null
          locality: string | null
          region: string | null
          country: string
          website: string | null
          belief_type?: string | null
          service_languages?: string[] | null
          geojson?: { type: 'Point'; coordinates: [number, number] } | null
        }>
        const nextPins = rows
          .map((r) => {
            const [lng, lat] = r.geojson?.coordinates ?? [r.longitude, r.latitude]
            return {
              ...r,
              latitude: lat as number | null,
              longitude: lng as number | null,
            }
          })
          .filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number') as typeof pins
        setPinsState(nextPins)
      } catch (err) {
        // Log actual error object
        console.error('fetchChurchesInBBox exception:', err)
      }
    }, 400)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      // Increment requestId to invalidate any pending resolution
      requestIdRef.current += 1
    }
  }, [bounds])

  function MapStateSyncCore({ onChange, padding = 0.75 }: { onChange: (map: ReturnType<typeof useMap>, padding?: number) => void; padding?: number }) {
    const map = useMap()
    useEffect(() => {
      const update = () => onChange(map, padding)
      update()
      map.on('moveend', update)
      map.on('zoomend', update)
      const onStart = () => { userInteractingRef.current = true }
      const onEnd = () => { userInteractingRef.current = false }
      map.on('movestart', onStart)
      map.on('dragstart', onStart)
      map.on('zoomstart', onStart)
      map.on('dragend', onEnd)
      map.on('zoomend', onEnd)
      map.on('moveend', onEnd)
      return () => {
        map.off('moveend', update)
        map.off('zoomend', update)
        map.off('movestart', onStart)
        map.off('dragstart', onStart)
        map.off('zoomstart', onStart)
        map.off('dragend', onEnd)
        map.off('zoomend', onEnd)
        map.off('moveend', onEnd)
      }
    }, [map, onChange, padding])
    return null
  }

  // Auto-fit to incoming pins from props (filters/search). Maintain ~20% frame padding (10% each side)
  function FitToPins({ pinsToFit, triggerKey }: { pinsToFit: typeof pins; triggerKey: number | undefined }) {
    const map = useMap()
    useEffect(() => {
      if (!pinsToFit || pinsToFit.length === 0) return
      if (typeof triggerKey !== 'number') return
      if (triggerKey === lastAppliedFitKeyRef.current) return
      // Do not override user's active interaction
      if (userInteractingRef.current) return
      let minLat = 90, minLng = 180, maxLat = -90, maxLng = -180
      for (const p of pinsToFit) {
        const lat = Number((p as { latitude: number }).latitude)
        const lng = Number((p as { longitude: number }).longitude)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
        if (lat < minLat) minLat = lat
        if (lng < minLng) minLng = lng
        if (lat > maxLat) maxLat = lat
        if (lng > maxLng) maxLng = lng
      }
      if (!(Number.isFinite(minLat) && Number.isFinite(minLng) && Number.isFinite(maxLat) && Number.isFinite(maxLng))) return

      const size = map.getSize()
      const padX = Math.max(0, Math.round(size.x * 0.1))
      const padY = Math.max(0, Math.round(size.y * 0.1))

      // If only one point, zoom to the maximum allowed level while centering the pin
      if (Math.abs(maxLat - minLat) < 1e-9 && Math.abs(maxLng - minLng) < 1e-9) {
        const maxZoomFromMap = (map as unknown as { getMaxZoom?: () => number }).getMaxZoom?.()
        const targetZoom = Number.isFinite(maxZoomFromMap) ? Math.min(18, Number(maxZoomFromMap)) : 18
        map.setView([minLat, minLng], targetZoom, { animate: true })
        lastAppliedFitKeyRef.current = triggerKey
        return
      }

      // Fit tightly with padding so pins fill ~80% inner area; explicitly cap max zoom for a tighter view
      const bounds: [[number, number], [number, number]] = [[minLat, minLng], [maxLat, maxLng]]
      const opts = { paddingTopLeft: [padX, padY] as [number, number], paddingBottomRight: [padX, padY] as [number, number], maxZoom: 18, animate: true }
      const leafMap = map as unknown as {
        flyToBounds?: (b: typeof bounds, o: typeof opts) => void
        fitBounds: (b: typeof bounds, o: typeof opts) => void
      }
      if (typeof leafMap.flyToBounds === 'function') {
        // Call as a method to preserve Leaflet's internal `this` binding
        leafMap.flyToBounds(bounds, opts)
      } else {
        leafMap.fitBounds(bounds, opts)
      }
      lastAppliedFitKeyRef.current = triggerKey
    }, [triggerKey, map])
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

	console.log('Rendering markers with custom icon:', blackPinIcon, 'Total pins:', pinsState.length)

	return (
		<div className="h-full w-full">
			<MapContainer {...mapProps} className="h-full w-full">
				<TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
				<ZoomControl position="topright" />
				<MapStateSyncCore onChange={handleMapChange} padding={0.75} />
				<FitToPins pinsToFit={pins} triggerKey={fitKey} />
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
