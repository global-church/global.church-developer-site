// src/app/page.tsx
import type { Metadata } from "next"
import { supabase } from "@/lib/supabase"
import { ChurchPublic } from "@/lib/types"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import Filters from "@/components/Filters"

export const metadata: Metadata = {
  title: "Church Finder",
  description: "Global.Church demo – churches near you",
}

async function getChurches(
  filters: { q?: string; belief?: string; region?: string; country?: string } = {}
): Promise<ChurchPublic[]> {
  // Server component fetch using Supabase JS
  // Limit the fields to what we actually render
  let query = supabase
    .from("church_public")
    .select(
      "church_id,name,locality,region,country,website,belief_type,trinitarian_beliefs,latitude,longitude,church_summary"
    )
    .order("name", { ascending: true })
    .limit(100)

  const { q, belief, region, country } = filters

  if (q && q.trim().length > 0) {
    // basic case-insensitive name filter
    query = query.ilike("name", `%${q.trim()}%`)
  }
  if (belief && belief !== "any") {
    query = query.eq("belief_type", belief)
  }
  if (region && region.trim().length > 0) {
    query = query.eq("region", region)
  }
  if (country && country.trim().length > 0) {
    query = query.eq("country", country)
  }

  const { data, error } = await query
  if (error) {
    console.error(error)
    return []
  }
  return (data ?? []) as ChurchPublic[]
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; belief?: string; region?: string; country?: string }>
}) {
  const sp = await searchParams
  const rows = await getChurches(sp)

  // Build a map link that preserves current filters
  const mapParams = new URLSearchParams()
  if (sp.q) mapParams.set("q", sp.q)
  if (sp.belief) mapParams.set("belief", sp.belief)
  if (sp.region) mapParams.set("region", sp.region)
  if (sp.country) mapParams.set("country", sp.country)
  const mapHref = `/map${mapParams.toString() ? `?${mapParams.toString()}` : ""}`

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Global.Church Enriched Directory</h1>
      <div className="mt-2">
        <a href={mapHref} className="text-sm underline">View Map →</a>
      </div>

      {/* Filters (client component) */}
      <div className="mt-4 mb-6">
        <Filters />
      </div>

      <div className="grid gap-3">
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No results.</p>
        )}

        {rows.map((c) => (
          <Card key={c.church_id} className="hover:shadow-sm transition-shadow">
            <CardHeader className="flex-row items-center gap-4">
              <div className="size-10 rounded-full bg-gradient-to-br from-teal-200 to-emerald-300 grid place-items-center text-lg font-medium text-slate-800">
                {c.name?.charAt(0).toUpperCase() ?? "C"}
              </div>
              <div>
                <div className="font-medium leading-tight">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {[c.locality, c.region, c.country].filter(Boolean).join(", ")}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {c.belief_type && (
                  <Badge variant="secondary" className="capitalize">
                    {c.belief_type.replace("_", " ")}
                  </Badge>
                )}
                {c.trinitarian_beliefs === true && (
                  <Badge variant="outline">Trinitarian</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="line-clamp-3">
                {c.church_summary ?? "No summary yet."}
              </p>
              <div className="mt-3 flex gap-3 text-sm">
                {c.website && (
                  <Link
                    href={c.website}
                    target="_blank"
                    className="underline underline-offset-4"
                  >
                    Website
                  </Link>
                )}
                <Link
                  href={`/church/${c.church_id}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Details →
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}