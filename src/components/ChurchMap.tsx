'use client'

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import type { GeoJSONPoint } from '@/lib/types'

// Define the ChurchPin type locally to avoid import issues
export type ChurchPin = {
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
  geojson?: GeoJSONPoint | null
}

const LeafletMapInner = dynamic(() => import('./LeafletMapInner'), { 
	ssr: false,
	loading: () => <div className="h-full w-full bg-gray-100 flex items-center justify-center">Loading map...</div>
}) as ComponentType<{
	pins: ChurchPin[]
	center?: [number, number]
	zoom?: number
	filters?: { q?: string; belief?: string; region?: string; country?: string; language?: string }
}>

export default function ChurchMap({
	pins,
	center = [25, 10],
	zoom = 2,
	filters,
}: {
	pins: ChurchPin[]
	center?: [number, number]
	zoom?: number
	filters?: { q?: string; belief?: string; region?: string; country?: string; language?: string }
}) {
	return (
		<div className="h-full w-full">
			<LeafletMapInner pins={pins} center={center} zoom={zoom} filters={filters} />
		</div>
	)
}