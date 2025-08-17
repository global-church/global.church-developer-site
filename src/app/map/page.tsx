import { supabase } from '@/lib/supabase'
import ChurchMap from '@/components/ChurchMap'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { MapPin, Church, ArrowLeft, List } from 'lucide-react'
import BeliefFilterButton from '@/components/BeliefFilterButton'
import LanguageFilterButton from '@/components/LanguageFilterButton'

// Shape of the querystring parameters we support on the map page
export type SearchParams = {
  q?: string
  belief?: string
  region?: string
  country?: string
  language?: string
}

// Row subset needed for map pins
type Row = {
  church_id: string
  name: string
  latitude: number | null
  longitude: number | null
  locality: string | null
  region: string | null
  country: string
  website: string | null
}

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp: SearchParams = await searchParams

  // Build filtered query directly for the pins we render
  let query = supabase
    .from('church_public')
    .select('church_id,name,latitude,longitude,locality,region,country,website')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(500)

  if (sp.q) query = query.ilike('name', `%${sp.q}%`)
  if (sp.belief) {
    const beliefs = sp.belief.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    if (beliefs.length === 1) query = query.eq('belief_type', beliefs[0])
    else if (beliefs.length > 1) query = query.in('belief_type', beliefs)
  }
  if (sp.language) {
    const languages = sp.language.split(',').map((s) => s.trim()).filter(Boolean)
    if (languages.length > 0) query = query.overlaps('service_languages', languages)
  }
  if (sp.region) query = query.ilike('region', `%${sp.region}%`)
  if (sp.country) query = query.eq('country', sp.country.toUpperCase())

  const { data = [], error } = await query
  if (error) console.error(error)

  const pins = (data as Row[])
    .filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number')
    .map((r) => ({ ...r, latitude: r.latitude!, longitude: r.longitude! }))

  // Build a safe querystring for the back-link without using `any`
  const queryString = (() => {
    const entries = Object.entries(sp)
      .filter(([, v]) => typeof v === 'string' && v.length > 0) as [string, string][]
    return entries.length ? `?${new URLSearchParams(entries).toString()}` : ''
  })()

  // Extract location and belief from search query for filter chips
  const locationMatch = sp.q?.match(/(?:near|in)\s+([^,]+(?:,\s*[A-Z]{2})?)/i)
  const beliefMatch = sp.q?.match(/(protestant|anglican|roman\s+catholic|orthodox|other)/i)
  
  const location = locationMatch ? locationMatch[1] : null
  const belief = beliefMatch ? beliefMatch[1].replace(/\s+/, '_') : null

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-sm px-4 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <Link href={sp.q ? `/search${queryString}` : '/'} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Global.Church Index</h1>
        </div>
        
        {/* Centered filter buttons */}
        <div className="w-full flex justify-center gap-2 mb-3">
          <BeliefFilterButton />
          <LanguageFilterButton />
        </div>

        {/* Filter Chips */}
        {(location || belief) && (
          <div className="flex gap-2">
            {location && (
              <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                <MapPin size={14} />
                {location}
              </Badge>
            )}
            {belief && (
              <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                <Church size={14} />
                {belief.replace('_', ' ')}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Map (ensure it sits behind bottom nav) */}
      <div className="pt-28 h-screen relative z-0">
        <ChurchMap pins={pins} />
      </div>

      {/* Bottom overlay List View button above bottom navigation */}
      <div className="fixed bottom-20 left-0 right-0 z-40 flex justify-center px-4">
        <Link 
          href={sp.q ? `/search${queryString}` : '/'}
          className="inline-flex items-center gap-2 bg-black text-white rounded-lg px-4 py-2 shadow-md hover:shadow-lg transition-shadow"
        >
          <List size={16} />
          <span className="font-medium">List View</span>
        </Link>
      </div>

      {/* Mobile Navigation provided by global layout */}
    </div>
  )
}