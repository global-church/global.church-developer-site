'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export default function ProgramsFilter() {
  const [value, setValue] = useState('')
  const [debounced, setDebounced] = useState('')
  const ref = useRef<HTMLInputElement | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  // sync from URL on mount/changes
  useEffect(() => {
    const current = sp.get('programs') || ''
    setValue(current)
    setDebounced(current)
  }, [sp])

  // debounce
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), 300)
    return () => clearTimeout(id)
  }, [value])

  // push to URL as programs
  useEffect(() => {
    const params = new URLSearchParams(sp.toString())
    const v = debounced.trim()
    if (v) params.set('programs', v)
    else params.delete('programs')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }, [debounced, pathname, router, sp])

  return (
    <div className="relative w-64">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2 text-gray-500">
        <Search className="size-4" />
      </div>
      <Input
        ref={ref}
        className="pl-8 h-9"
        placeholder="e.g., 'Awana', 'Youth Group'"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Filter by program name"
      />
    </div>
  )
}


