"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

// Valid belief options (no empty string here; we handle "any" separately)
const beliefOptions = [
  "protestant",
  "anglican",
  "roman_catholic",
  "orthodox",
  "other",
  "unknown",
] as const

type Belief = typeof beliefOptions[number] | "" // internal state allows empty string

export default function Filters() {
  const router = useRouter()
  const sp = useSearchParams()

  const [q, setQ] = useState(sp.get("q") ?? "")
  const [belief, setBelief] = useState<Belief>((sp.get("belief") as Belief) ?? "")
  const [region, setRegion] = useState(sp.get("region") ?? "")
  const [country, setCountry] = useState(sp.get("country") ?? "")

  // keep local state in sync when navigating (use string snapshot to avoid re-running on every render)
  useEffect(() => {
    setQ(sp.get("q") ?? "")
    setBelief((sp.get("belief") as Belief) ?? "")
    setRegion(sp.get("region") ?? "")
    setCountry(sp.get("country") ?? "")
  }, [sp.toString()])

  function submit() {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (belief) params.set("belief", belief)
    if (region) params.set("region", region)
    if (country) params.set("country", country)
    router.push("/?" + params.toString())
  }

  function clearAll() {
    setQ("")
    setBelief("")
    setRegion("")
    setCountry("")
    router.push("/")
  }

  return (
    <div className="mt-4 mb-6 grid gap-2 sm:grid-cols-4">
      <Input placeholder="Search name…" value={q} onChange={(e)=>setQ(e.target.value)} />
      <Input placeholder="Region (e.g. CA)" value={region} onChange={(e)=>setRegion(e.target.value)} />
      <Input placeholder="Country (e.g. US)" value={country} onChange={(e)=>setCountry(e.target.value)} />
      <div className="flex gap-2">
        <Select value={belief || "any"} onValueChange={(v)=> setBelief(v === "any" ? "" : (v as Belief))}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Belief type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any belief</SelectItem>
            {beliefOptions.map(b => (
              <SelectItem key={b} value={b} className="capitalize">{b.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={submit} className="shrink-0">Filter</Button>
        <Button variant="outline" onClick={clearAll} className="shrink-0">Clear</Button>
      </div>
    </div>
  )
}