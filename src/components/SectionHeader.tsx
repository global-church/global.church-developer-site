'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface SectionHeaderProps {
  title: string
  href?: string
  actionText?: string
}

export default function SectionHeader({ title, href, actionText }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {href && actionText && (
        <Link 
          href={href} 
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          {actionText}
          <ChevronRight size={16} className="ml-1" />
        </Link>
      )}
    </div>
  )
}
