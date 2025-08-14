// src/app/church/[id]/page.tsx
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default async function ChurchPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabase
    .from("church_public")
    .select("*")
    .eq("church_id", id)
    .single()

  if (error || !data) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-red-600">Not found.</p>
        <Link href="/" className="underline">← Back</Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="underline text-sm">← Back</Link>
      <h1 className="mt-3 text-2xl font-semibold">{data.name}</h1>
      <p className="text-sm text-muted-foreground">
        {[data.locality, data.region, data.country].filter(Boolean).join(", ")}
      </p>
      <div className="mt-2 flex gap-2">
        {data.belief_type && (
          <Badge variant="secondary" className="capitalize">
            {data.belief_type.replace("_", " ")}
          </Badge>
        )}
        {data.trinitarian_beliefs && <Badge variant="outline">Trinitarian</Badge>}
      </div>

      <div className="mt-6 space-y-3 text-sm leading-6">
        {data.church_summary && <p>{data.church_summary}</p>}
        {data.website && (
          <p>
            Website:{" "}
            <a className="underline" href={data.website} target="_blank">
              {data.website}
            </a>
          </p>
        )}
      </div>
    </main>
  )
}