// src/app/church/[id]/page.tsx
import { searchChurches } from "@/lib/zuplo"
import { ChurchPublic } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import YouTubeLatest from "@/components/YouTubeLatest"
import { getFacebookPageUrl } from "@/lib/facebook"
import FacebookSection from "@/components/FacebookSection"
import { getChannelIdFromAnyYouTubeUrl } from "@/lib/resolveChannelId"
import { formatLanguages } from "@/lib/languages"
import { ArrowLeft, MoreVertical, MapPin, Instagram, Youtube, Mail, ExternalLink, Phone, Facebook } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

type ChurchWithOptionalRoot = ChurchPublic & { website_root?: string | null }

export default async function ChurchPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const churches = await searchChurches({ id: id, limit: 1 })
  const data = churches[0] || null

  if (!data) {
    // Graceful empty state rather than a 404 so users can recover
    return (
      <div className="min-h-screen bg-gray-50 pb-32">
        <div className="bg-white px-4 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/explorer" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
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
  const languageNames = formatLanguages(languages)

  // Format denomination: snake_case -> Title Case with conventional rules
  const formatDenomination = (input?: string | null): string | null => {
    if (!input) return null
    const minorWords = new Set([
      'a', 'an', 'the',
      'and', 'but', 'or', 'nor',
      'as', 'at', 'by', 'for', 'from', 'in', 'into', 'near', 'of', 'on', 'onto', 'over', 'per', 'to', 'via', 'with'
    ])
    const words = String(input).replace(/_/g, ' ').trim().split(/\s+/)
    if (words.length === 0) return null
    const cased = words.map((word, index) => {
      const lower = word.toLowerCase()
      const isEdge = index === 0 || index === words.length - 1
      if (!isEdge && minorWords.has(lower)) return lower
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    }).join(' ')
    return cased
  }

  // Contact info (prefer structured arrays when available)
  const preferredPhone = (Array.isArray(church.contact_phones) && church.contact_phones.length > 0
    ? String(church.contact_phones[0])
    : (church.church_phone?.trim() || church.phone?.trim() || null))
  const telHref = preferredPhone ? `tel:${preferredPhone.replace(/[^\d+]/g, '')}` : null
  const contactEmails = Array.isArray(church.contact_emails)
    ? church.contact_emails.map((e) => String(e).trim()).filter(Boolean)
    : (church.scraped_email ? [church.scraped_email] : [])

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

  // Validate YouTube URL upfront to hide the section for 404/invalid links
  const hasValidYouTube = church.youtube_url
    ? Boolean(await getChannelIdFromAnyYouTubeUrl(church.youtube_url))
    : false

  // Build Google Maps Embed URL (prefer geojson, then lat/lng, then address)
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY
  const mapQuery = (() => {
    const gj = church.geojson
    if (gj && Array.isArray(gj.coordinates) && gj.coordinates.length === 2) {
      const [lng, lat] = gj.coordinates as [number, number]
      if (typeof lat === 'number' && typeof lng === 'number') return `${lat},${lng}`
    }
    if (typeof church.latitude === 'number' && typeof church.longitude === 'number') {
      return `${church.latitude},${church.longitude}`
    }
    if (fullAddress.length > 0) return fullAddress
    const namePlusLoc = [church.name, church.locality, church.region, church.country].filter(isValidPart).join(', ')
    return namePlusLoc.length > 0 ? namePlusLoc : null
  })()
  const mapEmbedSrc = mapQuery && mapsApiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${encodeURIComponent(mapQuery)}&zoom=15`
    : null

  // Extract Facebook Page URL server-side to keep client lean
  const fbUrl = getFacebookPageUrl(church.social_media) || church.url_facebook || null

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

  // Compute non-empty Programs list for conditional rendering
  const programsList: string[] = Array.isArray(church.programs_offered)
    ? church.programs_offered
        .map((program) => String(program).trim())
        .filter((program) => program.length > 0)
    : []

  // Ministries: prefer structured objects from ministries_json (name + source_url).
  // Fallback to ministry_names as plain labels when no URLs are available.
  const ministries: { name: string; url?: string | null }[] = (() => {
    const list: { name: string; url?: string | null }[] = []
    const src = church.ministries_json
    const pushFromAny = (v: unknown) => {
      if (!v) return
      if (typeof v === 'string') {
        const name = v.trim()
        if (name) list.push({ name })
        return
      }
      if (typeof v === 'object') {
        const obj = v as { name?: unknown; source_url?: unknown }
        const name = typeof obj.name === 'string' ? obj.name.trim() : ''
        const url = typeof obj.source_url === 'string' ? obj.source_url : undefined
        if (name) list.push({ name, url })
      }
    }
    if (Array.isArray(src)) {
      src.forEach(pushFromAny)
    } else if (src && typeof src === 'object') {
      for (const val of Object.values(src as Record<string, unknown>)) {
        if (Array.isArray(val)) val.forEach(pushFromAny)
        else pushFromAny(val)
      }
    }
    if (list.length === 0 && Array.isArray(church.ministry_names)) {
      church.ministry_names.forEach((n) => {
        const name = String(n).trim()
        if (name) list.push({ name })
      })
    }
    return list
  })()

  // Prefer new url_* fields for links, fallback to legacy when absent
  const givingHref = (() => {
    const raw = church.url_giving || church.giving_url || null
    if (!raw) return null
    return raw.startsWith('http') ? raw : `https://${raw}`
  })()
  const beliefsHref = church.url_beliefs || church.church_beliefs_url || null

  // Determine if Connect has at least one actionable button
  const hasConnect: boolean = Boolean(
    church.url_instagram || church.instagram_url ||
    fbUrl ||
    hasValidYouTube ||
    contactEmails.length > 0 ||
    (preferredPhone && telHref) ||
    givingHref ||
    beliefsHref
  )

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

      {/* Claim Banner hidden */}

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
        {languageNames.length > 0 && (
          <div className="flex justify-center flex-wrap gap-2 mb-3">
            {languageNames.map((lang, idx) => (
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
        {church.denomination && (
          <div className="mt-2 text-center">
            <span className="text-sm text-gray-600">{formatDenomination(church.denomination)}</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="px-4 py-2 space-y-4">
        {serviceLines.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 text-center">Services</h3>
            <div className="space-y-2">
              {serviceLines.slice(0, 10).map((s, idx) => (
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

        {programsList.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 text-center">Programs</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {programsList.map((program: string, idx: number) => (
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

        {ministries.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 text-center">Ministries</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {ministries.map((m: { name: string; url?: string | null }, idx: number) => {
                const href = m.url && m.url.startsWith('http') ? m.url : (m.url ? `https://${m.url}` : null)
                return href ? (
                  <a
                    key={`${m.name}-${idx}`}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 px-3 py-1 text-xs font-medium hover:bg-gray-200"
                  >
                    {m.name}
                    <ExternalLink size={12} className="ml-1" />
                  </a>
                ) : (
                  <span
                    key={`${m.name}-${idx}`}
                    className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 px-3 py-1 text-xs font-medium"
                  >
                    {m.name}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {hasConnect && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 text-center">Connect</h3>
            <div className="flex items-center justify-center flex-wrap gap-3">
              {(church.url_instagram || church.instagram_url) && (
                <a
                  href={(church.url_instagram || church.instagram_url) as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <Instagram size={18} />
                </a>
              )}
              {fbUrl && (
                <a
                  href={fbUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <Facebook size={18} />
                </a>
              )}
              {hasValidYouTube && (
                <a
                  href={church.youtube_url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <Youtube size={18} />
                </a>
              )}
              {contactEmails[0] && (
                <a
                  href={`mailto:${contactEmails[0]}`}
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
              {givingHref && (
                <a
                  href={givingHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors text-sm font-medium"
                >
                  Give
                  <ExternalLink size={14} />
                </a>
              )}
              {beliefsHref && (
                <a
                  href={beliefsHref}
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

        {/* Contact Emails section removed per requirements */}

        {/* YouTube section renders itself (includes wrapper + heading) and hides on 404/invalid */}
        {church.youtube_url && (
          <YouTubeLatest youtubeUrl={church.youtube_url as string} max={6} wrap title="YouTube" />
        )}

        {/* Facebook (below YouTube) - temporarily always shown */}
        <FacebookSection fbUrl={fbUrl} />

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

            {/* Google Maps Embed */}
            {mapEmbedSrc && (
              <div className="mt-4 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                <div className="relative" style={{ paddingBottom: '66%', height: 0 }}>
                  <iframe
                    title="Church location map"
                    src={mapEmbedSrc}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                    style={{ border: 0 }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Visit Website at the end */}
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

      {/* Action Buttons hidden */}

      {/* Mobile Navigation provided by global layout (appears below action buttons) */}
    </div>
  )
}