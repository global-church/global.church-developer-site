'use client'

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import type { ChurchPublic } from '@/lib/types'

const LeafletMapInner = dynamic(() => import('./LeafletMapInner'), { 
	ssr: false,
	loading: () => <div className="h-full w-full bg-gray-100 flex items-center justify-center">Loading map...</div>
}) as ComponentType<{
	pins: ChurchPublic[]
	center?: [number, number]
	zoom?: number
	filters?: { q?: string; belief?: string; region?: string; country?: string; language?: string }
	fitKey?: number
}>

export default function ChurchMap({
	pins,
	center = [25, 10],
	zoom = 2,
	filters,
	fitKey,
}: {
	pins: ChurchPublic[]
	center?: [number, number]
	zoom?: number
	filters?: { q?: string; belief?: string; region?: string; country?: string; language?: string }
	fitKey?: number
}) {
	return (
		<div className="relative h-full w-full z-0">
			<LeafletMapInner pins={pins} center={center} zoom={zoom} filters={filters} fitKey={fitKey} />
		</div>
	)
}