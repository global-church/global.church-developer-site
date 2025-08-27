'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export default function ProgramsFilter({ onQueryChange }: { onQueryChange: (q: string) => void }) {
  const [value, setValue] = useState('')
  const [debounced, setDebounced] = useState('')
  const ref = useRef<HTMLInputElement | null>(null)

  // debounce
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), 300)
    return () => clearTimeout(id)
  }, [value])

  useEffect(() => {
    onQueryChange(debounced)
  }, [debounced, onQueryChange])

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
      />
    </div>
  )
}


