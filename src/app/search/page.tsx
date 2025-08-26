import type { Metadata } from "next"
import { searchChurches as searchChurchesFromApi } from "@/lib/zuplo"
import { ChurchPublic, BeliefType } from "@/lib/types"
import ChurchCard from "@/components/ChurchCard"
import { Badge } from "@/components/ui/badge"
import { MapPin, Church, ArrowLeft, List, Map as MapIcon } from "lucide-react"
import MobileSearch from "@/components/MobileSearch"
import Link from "next/link"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Search Results - Global.Church Index",
  description: "Search results for churches",
}

async function searchChurches(query: string, selectedBeliefs: BeliefType[], selectedLanguages: string[]): Promise<ChurchPublic[]> {
  try {
    const churches = await searchChurchesFromApi({
      q: query,
      belief: selectedBeliefs.length > 0 ? selectedBeliefs.join(',') : undefined,
      languages: selectedLanguages.length > 0 ? selectedLanguages : undefined,
      limit: 50,
    })
    return churches
  } catch (error) {
    console.error('Failed to search churches:', error)
    return []
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; belief?: string; language?: string }>
}) {
  const { q, belief, language } = await searchParams
  
  if (!q) {
    notFound()
  }

  const selectedBeliefs: BeliefType[] = (belief
    ? belief
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s): s is BeliefType =>
          [
            'protestant',
            'roman_catholic',
            'orthodox',
            'anglican',
            'other',
          ].includes(s as BeliefType)
        )
    : []) as BeliefType[]

  const selectedLanguages: string[] = (language
    ? language
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [])

  const churches = await searchChurches(q, selectedBeliefs, selectedLanguages)
  
  // Extract location and belief from search query for filter chips
  const locationMatch = q.match(/(?:near|in)\s+([^,]+(?:,\s*[A-Z]{2})?)/i)
  const beliefMatch = q.match(/(protestant|anglican|roman\s+catholic|orthodox|other)/i)
  
  const location = locationMatch ? locationMatch[1] : null
  const beliefFromQuery = beliefMatch ? beliefMatch[1].replace(/\s+/, '_') : null

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Global.Church Index</h1>
        </div>
        
        {/* Search Bar (re-usable, keeps filters visible and actionable) */}
        <MobileSearch context="search" initialQuery={q} />
      </div>

      {/* Filter Chips */}
      {(location || beliefFromQuery) && (
        <div className="bg-white px-4 py-3 border-b border-gray-200">
          <div className="flex gap-2">
            {location && (
              <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                <MapPin size={14} />
                {location}
              </Badge>
            )}
            {beliefFromQuery && (
              <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                <Church size={14} />
                {beliefFromQuery.replace('_', ' ')}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium">
            <List size={16} />
            List
          </button>
          <Link 
            href={`/map?q=${encodeURIComponent(q)}`}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <MapIcon size={16} />
            Map
          </Link>
        </div>
      </div>

      {/* Results */}
      <div className="px-4 py-6">
        <div className="space-y-4">
          {churches.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No churches found</p>
              <p className="text-gray-400 text-sm mt-2">Try adjusting your search terms</p>
            </div>
          ) : (
            churches.map((church) => (
              <ChurchCard key={church.church_id} church={church} showBookmark={false} />
            ))
          )}
        </div>
      </div>

      {/* Mobile Navigation provided by global layout */}
    </div>
  )
}
