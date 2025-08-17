// src/app/page.tsx
import type { Metadata } from "next"
import { supabase } from "@/lib/supabase"
import { ChurchPublic } from "@/lib/types"
import MobileSearch from "@/components/MobileSearch"
import ChurchCard from "@/components/ChurchCard"
import SectionHeader from "@/components/SectionHeader"
import Link from "next/link"
import { MapPin } from "lucide-react"

export const metadata: Metadata = {
  title: "Church Finding",
  description: "Find churches near you with our comprehensive directory",
}

async function getChurches(): Promise<ChurchPublic[]> {
  // Get churches ordered alphabetically by city (locality)
  const { data, error } = await supabase
    .from("church_public")
    .select("church_id,name,locality,region,country,belief_type,service_languages")
    .not('locality', 'is', null) // Ensure locality exists
    .order("locality", { ascending: true }) // Order by city
    .limit(20) // Limit to first 20 churches

  if (error) {
    console.error(error)
    return []
  }
  return (data ?? []) as ChurchPublic[]
}

export default async function Page() {
  const churches = await getChurches()

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-6 text-center relative">
        <Link
          href="/give"
          className="absolute right-4 top-4 inline-flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          Support Global.Church
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
      <MobileSearch />

      {/* Main Content */}
      <div className="px-4 py-6 space-y-8">
        {/* Churches */}
        <section>
          <SectionHeader 
            title="Churches" 
            href="/nearby" 
            actionText="View all"
          />
          <div className="space-y-3">
            {churches.length > 0 ? (
              churches.map((church) => (
                <ChurchCard 
                  key={church.church_id} 
                  church={church} 
                  variant="compact" 
                  showMapButton={false} // Remove individual map buttons since we have a global one
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No churches found</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Mobile Navigation */}
      {/* Provided by global layout */}
    </div>
  )
}