import { supabase } from '@/lib/supabase'
import ChurchMap from '@/components/ChurchMap'
import Link from 'next/link'

// Shape of the querystring parameters we support on the map page
export type SearchParams = {
  q?: string
  belief?: string
  region?: string
  country?: string
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
  if (sp.belief) query = query.eq('belief_type', sp.belief)
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

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Church Map</h1>
        <Link className="underline" href={`/${queryString}`}>
          ← List
        </Link>
      </div>
      <ChurchMap pins={pins} />
    </main>
  )
}