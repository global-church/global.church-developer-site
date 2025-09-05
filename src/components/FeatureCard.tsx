import Link from "next/link"
// Removed unused import
import type { ReactNode } from "react"

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: ReactNode
  href: string
  align?: 'left' | 'center'
}

export default function FeatureCard({ icon, title, description, href, align = 'left' }: FeatureCardProps) {
  const alignClass = align === 'center' ? 'text-center' : 'text-left'
  const iconWrapClass = align === 'center' ? 'flex items-center justify-center mx-auto' : 'flex items-center'
  return (
    <Link href={href} className={`block bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow ${alignClass}`}>
      <div className={`${iconWrapClass} size-14 mb-4 text-primary`}>
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </Link>
  )
}


