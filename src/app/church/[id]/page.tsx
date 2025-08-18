// src/app/church/[id]/page.tsx
import { supabase } from "@/lib/supabase"
import { ChurchPublic } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import ContentCard from "@/components/ContentCard"
import SectionHeader from "@/components/SectionHeader"
import { ArrowLeft, MoreVertical, MapPin, Instagram, Youtube, Mail, ExternalLink, Phone, Facebook } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

type ChurchWithOptionalRoot = ChurchPublic & { website_root?: string | null }

export default async function ChurchPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabase
    .from("church_public")
    .select("*")
    .eq("church_id", id)
    .maybeSingle()

  if (error) {
    console.error("Failed to load church", { id, error })
  }
  if (!data) {
    // Graceful empty state rather than a 404 so users can recover
    return (
      <div className="min-h-screen bg-gray-50 pb-32">
        <div className="bg-white px-4 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Church</h1>
          </div>
        </div>
        <div className="px-4 py-12 text-center text-gray-600">Church not found.</div>
      </div>
    )
  }
  const church = data as unknown as ChurchWithOptionalRoot

  const languages: string[] = Array.isArray(church.service_languages)
    ? church.service_languages
    : (church.service_languages ? String(church.service_languages).split(',').map(s => s.trim()).filter(Boolean) : [])

  // Best phone selection
  const preferredPhone = church.church_phone?.trim() || church.phone?.trim() || null
  const telHref = preferredPhone ? `tel:${preferredPhone.replace(/[^\d+]/g, '')}` : null

  // Build full address (omit null/"NULL") and directions link
  const isValidPart = (p?: string | null) => !!p && String(p).trim().length > 0 && String(p).toLowerCase() !== 'null'
  const addressLine1 = isValidPart(church.address) ? String(church.address).trim() : ''
  const addressLine2 = [church.locality, church.region, church.postal_code, church.country]
    .filter(isValidPart)
    .join(', ')
  const fullAddress = [addressLine1, addressLine2].filter(Boolean).join(', ')
  const directionsHref = (() => {
    if (fullAddress.length > 0) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`
    }
    if (church.latitude && church.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${church.latitude},${church.longitude}`
    }
    const namePlusLoc = [church.name, church.locality, church.region, church.country].filter(isValidPart).join(', ')
    if (namePlusLoc.length > 0) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(namePlusLoc)}`
    }
    return null
  })()

  // Extract a Facebook URL from social_media if present
  const facebookUrl = (() => {
    const list = Array.isArray(church.social_media) ? church.social_media : []
    const found = list.find((u) => typeof u === 'string' && /facebook\.com/i.test(u))
    return found || null
  })()

  // Parse services_info JSON string into structured lines (robust regex)
  const serviceLines = (() => {
    const raw = church.services_info
    if (!raw) return [] as { language: string; day: string; time: string; description: string }[]

    let items: string[] = []
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) items = parsed as string[]
      else if (typeof parsed === 'string') items = [parsed]
    } catch {
      items = String(raw).split(/\n|;|\|/).map((s) => s.trim()).filter(Boolean)
    }

    const dayMap: Record<string, string> = {
      Sun: 'Sundays', Mon: 'Mondays', Tue: 'Tuesdays', Tues: 'Tuesdays', Wed: 'Wednesdays', Thu: 'Thursdays', Thurs: 'Thursdays', Fri: 'Fridays', Sat: 'Saturdays',
    }

    const re = /^\s*([^:]+):\s*([A-Za-z]+)\s+(\d{1,2}:\d{2}\s*(?:AM|PM))\s*(?:\(([^)]+)\))?\s*$/i

    return items.map((item) => {
      let language = ''
      let day = ''
      let time = ''
      let description = 'Service'

      const m = item.match(re)
      if (m) {
        language = (m[1] || '').trim()
        const dayAbbrev = (m[2] || '').trim()
        day = dayMap[dayAbbrev] || dayAbbrev
        time = (m[3] || '').trim()
        description = (m[4] || 'Service').trim()
      } else {
        // Fallback: previous loose parsing
        const [langPart, restRaw] = item.split(':', 2)
        language = (langPart || '').trim()
        const descMatch = restRaw?.match(/\(([^)]+)\)/)
        description = (descMatch?.[1] || 'Service').trim()
        const rest = (restRaw || '').replace(/\([^)]*\)/, '').trim()
        const tokens = rest.split(/\s+/).filter(Boolean)
        const dayAbbrev = tokens.shift() || ''
        day = dayMap[dayAbbrev] || dayAbbrev
        time = tokens.join(' ').trim()
      }

      return { language, day, time, description }
    })
  })()

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">{church.name}</h1>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Claim Banner */}
      <div className="bg-green-50 border-b border-green-200 px-4 py-3">
        <Link href="/claim" className="flex items-center justify-between text-green-800 hover:text-green-900">
          <span className="text-sm font-medium">Claim Church Profile</span>
          <span className="text-sm">→</span>
        </Link>
      </div>

      {/* Church Info */}
      <div className="bg-white px-4 py-6">
        <div className="text-center mb-6">
          <div className="size-24 rounded-full bg-gradient-to-br from-teal-200 to-blue-300 grid place-items-center text-3xl font-bold text-slate-800 mx-auto mb-4">
            {church.name?.charAt(0).toUpperCase() ?? "C"}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{church.name}</h2>
          <p className="text-gray-600 leading-relaxed max-w-md mx-auto">
            {church.church_summary ?? "At this church, we believe in fostering a welcoming community where everyone can find their spiritual home."}
          </p>
        </div>

        {/* Service Languages (centered above location) */}
        {languages.length > 0 && (
          <div className="flex justify-center flex-wrap gap-2 mb-3">
            {languages.map((lang, idx) => (
              <span key={`${lang}-${idx}`} className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 px-3 py-1 text-xs font-medium">
                {lang}
              </span>
            ))}
          </div>
        )}

        {/* Location and Tags */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <MapPin size={16} className="text-gray-400" />
          <span className="text-sm text-gray-600">
            {[church.locality, church.region, church.country]
              .filter((part) => part && String(part).toLowerCase() !== 'null')
              .join(", ")}
          </span>
        </div>
        
        <div className="flex justify-center gap-2">
          {church.belief_type && (
            <Badge variant="secondary" className="capitalize">
              {church.belief_type.replace("_", " ")}
            </Badge>
          )}
          {church.trinitarian_beliefs && (
            <Badge variant="outline">Trinitarian</Badge>
          )}
        </div>
      </div>

      {/* Recent Content (show only if youtube_url exists) */}
      {church.youtube_url && (
        <div className="px-4 py-6">
          <SectionHeader title="Recent" />
          <div className="flex gap-4 overflow-x-auto pb-2">
            <ContentCard 
              title="Reflect and Move" 
              href="/content/1"
            />
            <ContentCard 
              title="Become Ready" 
              href="/content/2"
            />
            <ContentCard 
              title="Faith Journey" 
              href="/content/3"
            />
            <ContentCard 
              title="Community Love" 
              href="/content/4"
            />
          </div>
        </div>
      )}

      {/* Details */}
      <div className="px-4 py-2 space-y-4">
        {(church.instagram_url || church.youtube_url || church.scraped_email || church.church_beliefs_url || preferredPhone || church.giving_url || facebookUrl) && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 text-center">Connect</h3>
            <div className="flex items-center justify-center flex-wrap gap-3">
              {church.instagram_url && (
                <a
                  href={church.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <Instagram size={18} />
                </a>
              )}
              {facebookUrl && (
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <Facebook size={18} />
                </a>
              )}
              {church.youtube_url && (
                <a
                  href={church.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <Youtube size={18} />
                </a>
              )}
              {church.scraped_email && (
                <a
                  href={`mailto:${church.scraped_email}`}
                  aria-label="Email"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <Mail size={18} />
                </a>
              )}
              {preferredPhone && telHref && (
                <a
                  href={telHref}
                  aria-label="Phone"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <Phone size={18} />
                </a>
              )}
              {church.giving_url && (
                <a
                  href={church.giving_url.startsWith('http') ? church.giving_url : `https://${church.giving_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors text-sm font-medium"
                >
                  Give
                  <ExternalLink size={14} />
                </a>
              )}
              {church.church_beliefs_url && (
                <a
                  href={church.church_beliefs_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors text-sm font-medium"
                >
                  Beliefs
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        )}

        {serviceLines.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 text-center">Services</h3>
            <div className="space-y-2">
              {serviceLines.map((s, idx) => (
                <div key={`${s.language}-${s.day}-${s.time}-${idx}`} className="text-center text-gray-800">
                  <span className="font-medium">{s.description}</span>
                  {s.day && s.time && (
                    <span>{` on ${s.day} @ ${s.time} `}</span>
                  )}
                  <em className="text-gray-500">{s.language}</em>
                </div>
              ))}
            </div>
          </div>
        )}

        {(addressLine1 || addressLine2) && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2 text-center">Address</h3>
            <div className="text-center">
              <MapPin size={16} className="text-gray-400 mx-auto mb-1" />
              {addressLine1 && (
                <div className="text-gray-800">{addressLine1}</div>
              )}
              {addressLine2 && (
                <div className="text-gray-600">{addressLine2}</div>
              )}
              {directionsHref && (
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-green-700 hover:text-green-800 font-medium"
                >
                  Directions →
                </a>
              )}
            </div>
          </div>
        )}

        {church.programs_offered && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 text-center">Programs</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {(
                Array.isArray(church.programs_offered)
                  ? church.programs_offered
                  : String(church.programs_offered).split(",")
              )
                .map((p: string) => p.trim())
                .filter((p: string) => p.length > 0)
                .map((program: string, idx: number) => (
                  <span
                    key={`${program}-${idx}`}
                    className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 px-3 py-1 text-xs font-medium"
                  >
                    {program}
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Visit Website moved below Programs */}
        {(() => {
          const raw = church.website || church.website_root || null
          if (!raw) return null
          const url = raw.startsWith('http') ? raw : `https://${raw}`
          return (
            <div className="px-2 mt-2 mb-4">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center bg-black text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                Visit Website
              </a>
            </div>
          )
        })()}
      </div>

      {/* Action Buttons (sit above persistent bottom nav) */}
      <div className="fixed bottom-20 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 z-50">
        <div className="flex gap-3">
          <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 text-base font-medium">
            I&apos;m Interested
          </Button>
          <Button variant="outline" className="flex-1 border-green-600 text-green-600 hover:bg-green-50 py-3 text-base font-medium">
            This is My Church
          </Button>
        </div>
      </div>

      {/* Mobile Navigation provided by global layout (appears below action buttons) */}
    </div>
  )
}