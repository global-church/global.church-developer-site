'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Filter } from 'lucide-react'

const LANGUAGE_OPTIONS = [
  'English','Spanish','French','Portuguese','German','Italian','Russian','Ukrainian','Polish','Dutch','Swedish','Norwegian','Danish','Finnish','Romanian','Hungarian','Czech','Slovak','Greek','Turkish','Arabic','Hebrew','Persian','Hindi','Bengali','Urdu','Punjabi','Gujarati','Marathi','Kannada','Tamil','Telugu','Malayalam','Sinhala','Nepali','Chinese','Japanese','Korean','Vietnamese','Thai','Lao','Khmer','Burmese','Indonesian','Malay','Tagalog','Swahili','Amharic','Somali','Yoruba','Igbo','Zulu','Xhosa','Afrikaans','Haitian Creole'
] as const

type LanguageValue = typeof LANGUAGE_OPTIONS[number]

export default function LanguageFilterButton() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<LanguageValue>>(new Set())
  const containerRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()
  const sp = useSearchParams()
  const pathname = usePathname()

  // Sync from URL
  useEffect(() => {
    const raw = sp.get('language') || ''
    const next = new Set<LanguageValue>()
    raw.split(',').map((s) => s.trim()).forEach((s) => {
      const match = (LANGUAGE_OPTIONS as readonly string[]).find((opt) => opt.toLowerCase() === s.toLowerCase())
      if (match) next.add(match as LanguageValue)
    })
    setSelected(next)
  }, [sp])

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return LANGUAGE_OPTIONS
    return (LANGUAGE_OPTIONS as readonly string[]).filter((l) => l.toLowerCase().includes(q))
  }, [query])

  // Apply current selection to URL (declare before effects that depend on it)
  const apply = useCallback(() => {
    const params = new URLSearchParams(sp.toString())
    const csv = Array.from(selected).join(',')
    if (csv) params.set('language', csv)
    else params.delete('language')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
    setOpen(false)
  }, [pathname, router, selected, sp])

  // Outside click – close popover
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return
      const el = containerRef.current
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        apply()
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open, apply])

  function toggle(value: LanguageValue) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  

  function clear() {
    setSelected(new Set())
    const params = new URLSearchParams(sp.toString())
    params.delete('language')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  const count = selected.size

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="outline"
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1.5 text-sm"
      >
        <Filter size={16} className="mr-2" />
        Language{count ? ` (${count})` : ''}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-[1000] p-3">
          <div className="mb-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search language..."
              className="h-9"
            />
          </div>
          <div className="max-h-64 overflow-auto space-y-2">
            {filteredOptions.map((opt) => {
              const checked = selected.has(opt as LanguageValue)
              const id = `lang-${opt}`
              return (
                <label key={opt} htmlFor={id} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id={id}
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={checked}
                    onChange={() => toggle(opt as LanguageValue)}
                  />
                  <span className="text-sm">{opt}</span>
                </label>
              )
            })}
            {filteredOptions.length === 0 && (
              <div className="text-sm text-gray-500 px-1 py-2">No matches</div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={clear}>Clear</Button>
            <Button size="sm" onClick={apply}>Apply</Button>
          </div>
        </div>
      )}
    </div>
  )
}
// Add outside click to close
// effect must be inside component. Injected near the top of the component for clarity


