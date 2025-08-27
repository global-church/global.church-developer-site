'use client'

import { Search as SearchIcon, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import LanguageFilterButton from '@/components/LanguageFilterButton'

type SearchContext = 'home' | 'search'

interface MobileSearchProps {
  context?: SearchContext
  initialQuery?: string
}

const BELIEF_OPTIONS = [
  { value: 'protestant', label: 'Protestant' },
  { value: 'roman_catholic', label: 'Roman Catholic' },
  { value: 'orthodox', label: 'Orthodox' },
  { value: 'anglican', label: 'Anglican' },
  { value: 'other', label: 'Other' },
] as const

type BeliefValue = typeof BELIEF_OPTIONS[number]['value']

export default function MobileSearch({ context = 'home', initialQuery = '' }: MobileSearchProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedBeliefs, setSelectedBeliefs] = useState<Set<BeliefValue>>(new Set())
  const router = useRouter()
  const sp = useSearchParams()

  useEffect(() => {
    const raw = sp.get('belief') || ''
    const next = new Set<BeliefValue>()
    raw.split(',').map((s) => s.trim().toLowerCase()).forEach((s) => {
      if ((BELIEF_OPTIONS as readonly { value: string; label: string }[]).some((o) => o.value === s)) {
        next.add(s as BeliefValue)
      }
    })
    setSelectedBeliefs(next)
  }, [sp])

  const selectedCount = selectedBeliefs.size

  const handleSearch = () => {
    const q = searchQuery.trim()
    if (!q) return
    const params = new URLSearchParams()
    params.set('q', q)
    if (selectedBeliefs.size) params.set('belief', Array.from(selectedBeliefs).join(','))
    const language = sp.get('language')
    if (language) params.set('language', language)
    router.push(`/explorer${params.toString() ? `?${params.toString()}` : ''}`)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  function toggleBelief(value: BeliefValue) {
    setSelectedBeliefs((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  function applyFilters() {
    const csv = Array.from(selectedBeliefs).join(',')
    const language = sp.get('language')
    const params = new URLSearchParams()
    if (csv) params.set('belief', csv)
    if (language) params.set('language', language)
    router.push(`/explorer${params.toString() ? `?${params.toString()}` : ''}`)
    setFilterOpen(false)
  }

  function clearFilters() {
    setSelectedBeliefs(new Set())
    const qParam = (sp.get('q') || searchQuery.trim())
    const params = new URLSearchParams()
    if (qParam) params.set('q', qParam)
    const language = sp.get('language')
    if (language) params.set('language', language)
    router.push(`/explorer${params.toString() ? `?${params.toString()}` : ''}`)
    setFilterOpen(false)
  }

  return (
    <div className="px-4 py-3 bg-white">
      <div className="flex items-stretch gap-2">
        <div className="relative flex-1 md:flex-[1.5]">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            type="text"
            placeholder="Search by name, location, or program"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10 py-3 text-base border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <Button
          onClick={handleSearch}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-lg text-sm"
        >
          Search
        </Button>
        {context === 'search' && (
          <>
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setFilterOpen((v) => !v)}
                className="px-3 py-1.5 text-sm"
              >
                <Filter size={16} className="mr-2" />
                Type{selectedCount ? ` (${selectedCount})` : ''}
              </Button>

              {filterOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3">
                  <div className="max-h-64 overflow-auto space-y-2">
                    {BELIEF_OPTIONS.map((opt) => {
                      const checked = selectedBeliefs.has(opt.value)
                      const id = `belief-${opt.value}`
                      return (
                        <label key={opt.value} htmlFor={id} className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            id={id}
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300"
                            checked={checked}
                            onChange={() => toggleBelief(opt.value)}
                          />
                          <span className="text-sm">{opt.label}</span>
                        </label>
                      )
                    })}
                  </div>
                  <div className="flex justify-end gap-2 pt-3">
                    <Button variant="outline" size="sm" onClick={clearFilters}>Clear</Button>
                    <Button size="sm" onClick={applyFilters}>Apply</Button>
                  </div>
                </div>
              )}
            </div>
            <LanguageFilterButton />
          </>
        )}
      </div>
    </div>
  )
}


