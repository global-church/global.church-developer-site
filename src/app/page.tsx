// src/app/page.tsx
import type { Metadata } from "next"
import MobileSearch from "@/components/MobileSearch"
import Link from "next/link"
import { MapPin } from "lucide-react"
import NearbyResults from "@/components/NearbyResults"

export const metadata: Metadata = {
  title: "Church Finding",
  description: "Find churches near you with our comprehensive directory",
}

export default function Page() {
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
        
        {/* Map Button */}
        <Link 
          href="/map"
          className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          <MapPin size={18} />
          View Map
        </Link>
      </div>

      {/* Search Bar */}
      <MobileSearch context="home" />

      {/* Main Content */}
      <div className="px-4 py-6 space-y-8">
        <section className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold">Find churches near you</h2>
          <p className="text-sm text-gray-600">
            We’ll use your device’s location (with your permission) to show nearby churches.
          </p>
          <div className="flex justify-center">
            <div className="w-full max-w-3xl">
              <NearbyResults />
            </div>
          </div>
        </section>
      </div>

      {/* Mobile Navigation */}
      {/* Provided by global layout */}
    </div>
  )
}