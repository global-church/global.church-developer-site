'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Filter } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export default function ServiceTimeFilter() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  // Default window: 08:00 AM to 10:00 AM
  const [start, setStart] = useState<string>('08:00')
  const [end, setEnd] = useState<string>('10:00')
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  // sync from URL
  useEffect(() => {
    const s = sp.get('service_time_start') || ''
    const e = sp.get('service_time_end') || ''
    // Only override defaults if URL explicitly provides values
    if (s) setStart(s)
    if (e) setEnd(e)
  }, [sp])

  // Apply changes only when user clicks Apply
  function applyToUrl() {
    const params = new URLSearchParams(sp.toString())
    if (start) params.set('service_time_start', start)
    else params.delete('service_time_start')
    if (end) params.set('service_time_end', end)
    else params.delete('service_time_end')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
    setOpen(false)
  }

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return
      const el = containerRef.current
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  // Badge active when URL has any service time filters applied
  const active = Boolean(sp.get('service_time_start') || sp.get('service_time_end'))

  return (
    <div className="relative" ref={containerRef}>
      <Button variant="outline" onClick={() => setOpen((v) => !v)} className="px-3 py-1.5 text-sm" aria-expanded={open}>
        <Filter size={16} className="mr-2" />
        Start Time{active ? ' (1)' : ''}
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-[1000] p-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm space-y-1">
              <div>No Earlier Than</div>
              <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-9 w-full rounded border px-2" />
            </label>
            <label className="text-sm space-y-1">
              <div>No Later Than</div>
              <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9 w-full rounded border px-2" />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStart('')
                setEnd('')
                const params = new URLSearchParams(sp.toString())
                params.delete('service_time_start')
                params.delete('service_time_end')
                const qs = params.toString()
                router.push(qs ? `${pathname}?${qs}` : pathname)
              }}
            >
              Clear
            </Button>
            <Button size="sm" onClick={applyToUrl}>Apply</Button>
          </div>
        </div>
      )}
    </div>
  )
}
