import type { Metadata } from "next"
import { supabase } from "@/lib/supabase"
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
  const baseSelect = "church_id,name,locality,region,country,belief_type,church_summary,service_languages,services_info"

  // Primary: case-insensitive substring across multiple fields
  const like = `%${query}%`
  const orFilter = [
    `name.ilike.${like}`,
    `locality.ilike.${like}`,
    `region.ilike.${like}`,
    `country.ilike.${like}`,
    `church_summary.ilike.${like}`,
  ].join(',')

  let primaryQuery = supabase
    .from("church_public")
    .select(baseSelect)
    .or(orFilter)

  if (selectedBeliefs && selectedBeliefs.length > 0) {
    primaryQuery = primaryQuery.in('belief_type', selectedBeliefs as unknown as string[])
  }
  if (selectedLanguages && selectedLanguages.length > 0) {
    primaryQuery = primaryQuery.overlaps('service_languages', selectedLanguages)
  }

  const { data, error } = await primaryQuery.limit(200)

  if (error) {
    console.error(error)
    return []
  }
  const primary = (data ?? []) as ChurchPublic[]
  if (primary.length > 0) {
    const norm = (s: string) => (s || '').normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    const nq = norm(query)
    const contains = (s?: string | null) => norm(s || '').includes(nq)
    const bigrams = (s: string) => {
      const n = s.length
      const grams: string[] = []
      for (let i = 0; i < n - 1; i++) grams.push(s.slice(i, i + 2))
      return grams
    }
    const dice = (a: string, b: string) => {
      const aG = bigrams(norm(a))
      const bG = bigrams(norm(b))
      if (aG.length === 0 || bG.length === 0) return 0
      const bCounts = new Map<string, number>()
      for (const g of bG) bCounts.set(g, (bCounts.get(g) || 0) + 1)
      let overlap = 0
      for (const g of aG) {
        const c = bCounts.get(g) || 0
        if (c > 0) {
          overlap++
          bCounts.set(g, c - 1)
        }
      }
      return (2 * overlap) / (aG.length + bG.length)
    }

    const rankedPrimary = primary
      .map((row) => {
        const score =
          1.0 * dice(query, row.name || '') +
          (contains(row.name) ? 1.0 : 0) +
          (contains(row.church_summary || undefined) ? 0.5 : 0) +
          (contains(row.locality) ? 0.4 : 0) +
          (contains(row.region) ? 0.3 : 0) +
          (contains(row.country) ? 0.2 : 0)
        return { row, score }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map((x) => x.row)

    return rankedPrimary
  }

  // Fallback: fetch a larger sample and rank by client-side similarity to surface slight typos
  let fallbackQuery = supabase
    .from("church_public")
    .select(baseSelect)

  if (selectedBeliefs && selectedBeliefs.length > 0) {
    fallbackQuery = fallbackQuery.in('belief_type', selectedBeliefs as unknown as string[])
  }
  if (selectedLanguages && selectedLanguages.length > 0) {
    fallbackQuery = fallbackQuery.overlaps('service_languages', selectedLanguages)
  }

  const { data: sample, error: sampleError } = await fallbackQuery.limit(600)

  if (sampleError || !sample) {
    if (sampleError) console.error(sampleError)
    return []
  }

  // Simple normalized bigram similarity (fast and decent for small typos)
  const norm = (s: string) => s.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  const bigrams = (s: string) => {
    const n = s.length
    const grams: string[] = []
    for (let i = 0; i < n - 1; i++) grams.push(s.slice(i, i + 2))
    return grams
  }
  const dice = (a: string, b: string) => {
    const aG = bigrams(norm(a))
    const bG = bigrams(norm(b))
    if (aG.length === 0 || bG.length === 0) return 0
    const bCounts = new Map<string, number>()
    for (const g of bG) bCounts.set(g, (bCounts.get(g) || 0) + 1)
    let overlap = 0
    for (const g of aG) {
      const c = bCounts.get(g) || 0
      if (c > 0) {
        overlap++
        bCounts.set(g, c - 1)
      }
    }
    return (2 * overlap) / (aG.length + bG.length)
  }

  const ranked = (sample as ChurchPublic[])
    .map((row) => ({ row, score: dice(query, row.name || '') }))
    .filter((x) => x.score >= 0.25) // threshold for slight typos
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)
    .map((x) => x.row)

  return ranked
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
