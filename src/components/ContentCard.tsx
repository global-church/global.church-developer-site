'use client'

import Link from 'next/link'

interface ContentCardProps {
  title: string
  imageUrl?: string
  href: string
  variant?: 'default' | 'large'
}

export default function ContentCard({ title, imageUrl, href, variant = 'default' }: ContentCardProps) {
  const size = variant === 'large' ? 'w-64 h-40' : 'w-48 h-32'
  
  return (
    <Link href={href} className="block flex-shrink-0">
      <div className={`${size} rounded-xl bg-gradient-to-br from-teal-200 to-blue-300 flex items-center justify-center text-white font-semibold text-lg shadow-sm hover:shadow-md transition-shadow`}>
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={title}
            className="w-full h-full object-cover rounded-xl"
          />
        ) : (
          <span className="text-slate-700">{title.charAt(0)}</span>
        )}
      </div>
      <div className="mt-2 text-sm font-medium text-gray-900 text-center">{title}</div>
    </Link>
  )
}
