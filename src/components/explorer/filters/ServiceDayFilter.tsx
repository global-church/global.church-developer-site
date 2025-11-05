'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Filter } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const DAYS: readonly string[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export default function ServiceDayFilter() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  // Sync from URL
  useEffect(() => {
    const raw = sp.get('service_days') || ''
    const next = new Set<string>()
    raw.split(',').map((s) => s.trim()).filter(Boolean).forEach((d) => next.add(d))
    setSelected(next)
  }, [sp])

  const toggle = (day: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  const apply = useCallback(() => {
    const params = new URLSearchParams(sp.toString())
    const csv = Array.from(selected).join(',')
    if (csv) params.set('service_days', csv)
    else params.delete('service_days')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
    setOpen(false)
  }, [pathname, router, selected, sp])

  const clear = () => {
    setSelected(new Set())
    const params = new URLSearchParams(sp.toString())
    params.delete('service_days')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  // Close on outside click – apply current selection
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

  const count = selected.size

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="outline"
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1.5 text-sm"
        aria-expanded={open}
      >
        <Filter size={16} className="mr-2" />
        Service Day{count ? ` (${count})` : ''}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-[1000] p-3">
          <div className="max-h-64 overflow-auto space-y-2">
            {DAYS.map((day) => {
              const id = `svc-day-${day}`
              const checked = selected.has(day)
              return (
                <label key={day} htmlFor={id} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id={id}
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={checked}
                    onChange={() => toggle(day)}
                  />
                  <span className="text-sm">{day}</span>
                </label>
              )
            })}
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


