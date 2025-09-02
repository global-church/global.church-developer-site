'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Filter } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export default function ServiceTimeFilter() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [start, setStart] = useState<string>('')
  const [end, setEnd] = useState<string>('')
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  // sync from URL
  useEffect(() => {
    const s = sp.get('service_time_start') || ''
    const e = sp.get('service_time_end') || ''
    setStart(s)
    setEnd(e)
  }, [sp])

  // push to URL
  useEffect(() => {
    const params = new URLSearchParams(sp.toString())
    if (start) params.set('service_time_start', start)
    else params.delete('service_time_start')
    if (end) params.set('service_time_end', end)
    else params.delete('service_time_end')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }, [start, end, pathname, router, sp])

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

  return (
    <div className="relative" ref={containerRef}>
      <Button variant="outline" onClick={() => setOpen((v) => !v)} className="px-3 py-1.5 text-sm" aria-expanded={open}>
        <Filter size={16} className="mr-2" />
        Start Time
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
          <div className="flex justify-end pt-3">
            <Button size="sm" onClick={() => setOpen(false)}>Done</Button>
          </div>
        </div>
      )}
    </div>
  )
}


