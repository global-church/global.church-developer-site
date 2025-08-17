'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Filter } from 'lucide-react'

const BELIEF_OPTIONS = [
  { value: 'protestant', label: 'Protestant' },
  { value: 'roman_catholic', label: 'Roman Catholic' },
  { value: 'orthodox', label: 'Orthodox' },
  { value: 'anglican', label: 'Anglican' },
  { value: 'other', label: 'Other' },
] as const

type BeliefValue = typeof BELIEF_OPTIONS[number]['value']

export default function BeliefFilterButton() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<BeliefValue>>(new Set())
  const router = useRouter()
  const sp = useSearchParams()
  const pathname = usePathname()

  // Sync from current URL
  useEffect(() => {
    const raw = sp.get('belief') || ''
    const next = new Set<BeliefValue>()
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .forEach((s) => {
        if ((BELIEF_OPTIONS as readonly { value: string; label: string }[]).some((o) => o.value === s)) {
          next.add(s as BeliefValue)
        }
      })
    setSelected(next)
  }, [sp])

  function toggle(value: BeliefValue) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  function apply() {
    const params = new URLSearchParams(sp.toString())
    const csv = Array.from(selected).join(',')
    if (csv) params.set('belief', csv)
    else params.delete('belief')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
    setOpen(false)
  }

  function clear() {
    setSelected(new Set())
    const params = new URLSearchParams(sp.toString())
    params.delete('belief')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
    setOpen(false)
  }

  const count = selected.size

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1.5 text-sm"
      >
        <Filter size={16} className="mr-2" />
        Filter By Type{count ? ` (${count})` : ''}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3">
          <div className="max-h-64 overflow-auto space-y-2">
            {BELIEF_OPTIONS.map((opt) => {
              const checked = selected.has(opt.value)
              const id = `belief-${opt.value}`
              return (
                <label key={opt.value} htmlFor={id} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id={id}
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={checked}
                    onChange={() => toggle(opt.value)}
                  />
                  <span className="text-sm">{opt.label}</span>
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


