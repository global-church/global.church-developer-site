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
	fitKey?: number
	disableViewportFetch?: boolean
}>

export default function ChurchMap({
	pins,
	center = [25, 10],
	zoom = 2,
	fitKey,
	disableViewportFetch = false,
}: {
	pins: ChurchPublic[]
	center?: [number, number]
	zoom?: number
	fitKey?: number
	disableViewportFetch?: boolean
}) {
	return (
		<div className="relative h-full w-full z-0">
			<LeafletMapInner pins={pins} center={center} zoom={zoom} fitKey={fitKey} disableViewportFetch={disableViewportFetch} />
		</div>
	)
}