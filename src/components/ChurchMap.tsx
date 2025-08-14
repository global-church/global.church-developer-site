'use client'

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

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
}

const LeafletMapInner = dynamic(() => import('./LeafletMapInner'), { 
	ssr: false,
	loading: () => <div className="h-full w-full bg-gray-100 flex items-center justify-center">Loading map...</div>
}) as ComponentType<{
	pins: ChurchPin[]
	center?: [number, number]
	zoom?: number
}>

export default function ChurchMap({
	pins,
	center = [39.5, -98.35],
	zoom = 4,
}: {
	pins: ChurchPin[]
	center?: [number, number]
	zoom?: number
}) {
	return (
		<div className="h-full w-full">
			<LeafletMapInner pins={pins} center={center} zoom={zoom} />
		</div>
)
}