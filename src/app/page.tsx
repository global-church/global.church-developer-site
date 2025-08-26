// src/app/page.tsx
import type { Metadata } from "next"
// Search bar removed from header per new Explore layout
import Link from "next/link"
import NearbyResults from "@/components/NearbyResults"
import { searchChurches } from "@/lib/zuplo"

export const metadata: Metadata = {
  title: "Church Finding",
  description: "Find churches near you with our comprehensive directory",
}

export default async function Page() {
  // Fetch initial pins so the map shows a broad sample of churches by default
  const rows = await searchChurches({ limit: 1000 })

  const initialPins = (rows ?? [])
    .filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number')
    .map((r) => ({
      church_id: r.church_id,
      name: r.name,
      latitude: r.latitude as number,
      longitude: r.longitude as number,
      locality: r.locality,
      region: r.region,
      country: r.country,
      website: r.website,
      belief_type: r.belief_type ?? null,
      service_languages: Array.isArray(r.service_languages) ? r.service_languages : null,
      geojson: null,
    }))

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-6 text-center relative">
        <Link
          href="/give"
          className="absolute right-4 top-4 inline-flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          Donate
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Global.Church Index</h1>
        
        {/* Map Button removed per new unified Explore page */}
      </div>

      {/* Search Bar removed; search lives inside NearbyResults */}

      {/* Main Content */}
      <div className="px-4 py-6">
        <div className="flex justify-center">
          <div className="w-full max-w-5xl">
            <NearbyResults initialPins={initialPins} />
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {/* Provided by global layout */}
    </div>
  )
}