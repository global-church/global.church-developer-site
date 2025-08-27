import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { ReactNode } from "react"

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  href: string
}

export default function FeatureCard({ icon, title, description, href }: FeatureCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-left">
      <div className="flex items-center justify-center size-12 rounded-full bg-green-100 text-green-700 mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      <Link href={href} className="text-sm font-medium text-green-600 hover:text-green-700 flex items-center gap-1">
        Learn More <ArrowRight size={14} />
      </Link>
    </div>
  )
}


