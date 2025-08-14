'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import Link from 'next/link'

// ChurchPin type is now defined in ChurchMap.tsx

export default function LeafletMapInner({
	pins,
	center = [39.5, -98.35],
	zoom = 4,
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
	}[]
	center?: [number, number]
	zoom?: number
}) {
	const [blackPinIcon, setBlackPinIcon] = useState<any>(null)

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

	// Don't render markers until icon is ready
	if (!blackPinIcon) {
		console.log('Waiting for custom icon to be created...')
		return (
			<div className="h-full w-full">
				<MapContainer center={center} zoom={zoom} scrollWheelZoom className="h-full w-full">
					<TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
				</MapContainer>
			</div>
		)
	}

	console.log('Rendering markers with custom icon:', blackPinIcon, 'Total pins:', pins.length)

	return (
		<div className="h-full w-full">
			<MapContainer center={center} zoom={zoom} scrollWheelZoom className="h-full w-full">
				<TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
				{pins.map((p) => (
					<Marker 
						key={`${p.church_id}-${blackPinIcon ? 'custom' : 'default'}`}
						position={[p.latitude, p.longitude]}
						icon={blackPinIcon}
					>
						<Popup className="min-w-64">
							<div className="space-y-3 p-2">
								<div className="font-semibold text-gray-900 text-base">{p.name}</div>
								<div className="text-sm text-gray-600 flex items-center gap-1">
									<span className="w-2 h-2 bg-gray-400 rounded-full"></span>
									<span>{[p.locality, p.region, p.country].filter(Boolean).join(', ')}</span>
								</div>
								<div className="flex gap-2 text-sm">
									<Link className="text-green-600 hover:text-green-700 font-medium" href={`/church/${p.church_id}`}>
										View Details
									</Link>
									{p.website && (
										<>
											<span className="text-gray-300">•</span>
											<a className="text-blue-600 hover:text-blue-700" href={p.website} target="_blank" rel="noopener noreferrer">
												Website
											</a>
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
