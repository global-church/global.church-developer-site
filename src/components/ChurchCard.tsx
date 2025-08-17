'use client'

import { Bookmark, MapPin } from 'lucide-react'
import Link from 'next/link'
import { ChurchPublic } from '@/lib/types'

interface ChurchCardProps {
  church: ChurchPublic
  showBookmark?: boolean
  showMapButton?: boolean
  variant?: 'default' | 'compact'
}

export default function ChurchCard({ church, showBookmark = true, showMapButton = false, variant = 'default' }: ChurchCardProps) {
  const location = [church.locality, church.region, church.country].filter(Boolean).join(', ')
  let languages: string[] = Array.isArray(church.service_languages)
    ? church.service_languages
    : (church.service_languages ? String(church.service_languages).split(',').map(s => s.trim()).filter(Boolean) : [])

  // Fallback: derive languages from services_info if service_languages is empty
  if (!languages.length && church.services_info) {
    try {
      const parsed = JSON.parse(church.services_info)
      const items: string[] = Array.isArray(parsed) ? parsed as string[] : (typeof parsed === 'string' ? [parsed] : [])
      const langs = new Set<string>()
      const re = /^\s*([^:]+):\s*/
      for (const item of items) {
        const m = String(item).match(re)
        if (m && m[1]) langs.add(m[1].trim())
      }
      languages = Array.from(langs)
    } catch {
      // ignore parsing errors
    }
  }
  
  if (variant === 'compact') {
    return (
      <div className="relative">
        <Link href={`/church/${church.church_id}`} className="block">
          <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
            <div className="size-12 rounded-full bg-gradient-to-br from-teal-200 to-blue-300 grid place-items-center text-lg font-semibold text-slate-800 flex-shrink-0">
              {church.name?.charAt(0).toUpperCase() ?? "C"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="font-medium text-gray-900 truncate">{church.name}</div>
                {languages.length > 0 && (
                  <div className="flex items-center gap-1 flex-shrink-0 overflow-hidden">
                    {languages.map((lang, idx) => (
                      <span key={`${lang}-${idx}`} className="inline-flex items-center rounded-md bg-gray-100 text-gray-700 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap">
                        {lang}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-500 flex items-center gap-1">
                <MapPin size={14} />
                <span className="truncate">{location}</span>
              </div>
            </div>
            {showBookmark && (
              <Bookmark size={20} className="text-gray-400 hover:text-gray-600 transition-colors" />
            )}
          </div>
        </Link>
        {showMapButton && (
          <Link 
            href={`/map?q=${encodeURIComponent(church.name)}`}
            className="absolute top-2 right-2 bg-black text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-1 z-10"
          >
            <MapPin size={14} />
            Map
          </Link>
        )}
      </div>
    )
  }

  return (
    <Link href={`/church/${church.church_id}`} className="block">
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3">
          <div className="size-14 rounded-full bg-gradient-to-br from-teal-200 to-blue-300 grid place-items-center text-xl font-semibold text-slate-800 flex-shrink-0">
            {church.name?.charAt(0).toUpperCase() ?? "C"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-lg mb-1 flex items-center gap-2 min-w-0">
              <span className="truncate">{church.name}</span>
              {languages.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {languages.map((lang, idx) => (
                    <span key={`${lang}-${idx}`} className="inline-flex items-center rounded-md bg-gray-100 text-gray-700 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap">
                      {lang}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-sm text-gray-500 mb-2 flex items-center gap-1">
              <MapPin size={14} />
              <span>{location}</span>
            </div>
            {church.belief_type && (
              <div className="text-xs text-gray-600 capitalize">
                {church.belief_type.replace('_', ' ')}
              </div>
            )}
          </div>
          {showBookmark && (
            <Bookmark size={20} className="text-gray-400 hover:text-gray-600 transition-colors" />
          )}
        </div>
      </div>
    </Link>
  )
}
