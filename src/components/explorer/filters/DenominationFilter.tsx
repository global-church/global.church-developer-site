'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Filter } from 'lucide-react'

const DENOMINATION_OPTIONS = [
  'Non-denominational',
  'Baptist',
  'Southern Baptist',
  'Independent Baptist',
  'Methodist',
  'United Methodist',
  'Wesleyan',
  'Free Methodist',
  'Presbyterian',
  'Presbyterian (PCA)',
  'Presbyterian (PCUSA)',
  'Lutheran',
  'Lutheran (ELCA)',
  'Lutheran (LCMS)',
  'Anglican',
  'Episcopal',
  'Reformed',
  'Christian Reformed',
  'Pentecostal',
  'Assemblies of God',
  'Church of God',
  'Foursquare',
  'Vineyard',
  'Calvary Chapel',
  'Nazarene',
  'Brethren',
  'Mennonite',
  'Anabaptist',
  'Orthodox',
  'Coptic Orthodox',
  'Roman Catholic',
  'Eastern Catholic',
  'Seventh-day Adventist',
  'Salvation Army',
  'Quaker (Friends)',
  'Church of Christ',
  'Disciples of Christ',
  'Holiness',
  'Charismatic',
  'Evangelical Free',
  'Evangelical Covenant',
] as const

type DenominationValue = typeof DENOMINATION_OPTIONS[number]

export default function DenominationFilter() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<DenominationValue>>(new Set())
  const containerRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()
  const sp = useSearchParams()
  const pathname = usePathname() ?? '/'

  // Sync from URL
  useEffect(() => {
    const raw = sp?.get('denomination') || ''
    const next = new Set<DenominationValue>()
    raw.split(',').map((s) => s.trim()).forEach((s) => {
      const match = (DENOMINATION_OPTIONS as readonly string[]).find((opt) => opt.toLowerCase() === s.toLowerCase())
      if (match) next.add(match as DenominationValue)
    })
    setSelected(next)
  }, [sp])

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return DENOMINATION_OPTIONS
    return (DENOMINATION_OPTIONS as readonly string[]).filter((d) => d.toLowerCase().includes(q))
  }, [query])

  const apply = useCallback(() => {
    const params = new URLSearchParams(sp?.toString() ?? '')
    const csv = Array.from(selected).join(',')
    if (csv) params.set('denomination', csv)
    else params.delete('denomination')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
    setOpen(false)
  }, [pathname, router, selected, sp])

  // Outside click – apply and close
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

  function toggle(value: DenominationValue) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  function clear() {
    setSelected(new Set())
    const params = new URLSearchParams(sp?.toString() ?? '')
    params.delete('denomination')
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
        Denomination{count ? ` (${count})` : ''}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-[1000] p-3">
          <div className="mb-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search denomination..."
              className="h-9"
            />
          </div>
          <div className="max-h-64 overflow-auto space-y-2">
            {filteredOptions.map((opt) => {
              const checked = selected.has(opt as DenominationValue)
              const id = `denom-${opt}`
              return (
                <label key={opt} htmlFor={id} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id={id}
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={checked}
                    onChange={() => toggle(opt as DenominationValue)}
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

