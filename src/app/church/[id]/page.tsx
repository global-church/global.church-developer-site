// src/app/church/[id]/page.tsx
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import ContentCard from "@/components/ContentCard"
import SectionHeader from "@/components/SectionHeader"
import { ArrowLeft, MoreVertical, MapPin } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

export default async function ChurchPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabase
    .from("church_public")
    .select("*")
    .eq("church_id", id)
    .single()

  if (error || !data) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">{data.name}</h1>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Claim Banner */}
      <div className="bg-green-50 border-b border-green-200 px-4 py-3">
        <Link href="/claim" className="flex items-center justify-between text-green-800 hover:text-green-900">
          <span className="text-sm font-medium">Claim Church Profile</span>
          <span className="text-sm">→</span>
        </Link>
      </div>

      {/* Church Info */}
      <div className="bg-white px-4 py-6">
        <div className="text-center mb-6">
          <div className="size-24 rounded-full bg-gradient-to-br from-teal-200 to-blue-300 grid place-items-center text-3xl font-bold text-slate-800 mx-auto mb-4">
            {data.name?.charAt(0).toUpperCase() ?? "C"}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{data.name}</h2>
          <p className="text-gray-600 leading-relaxed max-w-md mx-auto">
            {data.church_summary ?? "At this church, we believe in fostering a welcoming community where everyone can find their spiritual home."}
          </p>
        </div>

        {/* Location and Tags */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <MapPin size={16} className="text-gray-400" />
          <span className="text-sm text-gray-600">
            {[data.locality, data.region, data.country].filter(Boolean).join(", ")}
          </span>
        </div>
        
        <div className="flex justify-center gap-2">
          {data.belief_type && (
            <Badge variant="secondary" className="capitalize">
              {data.belief_type.replace("_", " ")}
            </Badge>
          )}
          {data.trinitarian_beliefs && (
            <Badge variant="outline">Trinitarian</Badge>
          )}
        </div>
      </div>

      {/* Recent Content */}
      <div className="px-4 py-6">
        <SectionHeader title="Recent" />
        <div className="flex gap-4 overflow-x-auto pb-2">
          <ContentCard 
            title="Reflect and Move" 
            href="/content/1"
          />
          <ContentCard 
            title="Become Ready" 
            href="/content/2"
          />
          <ContentCard 
            title="Faith Journey" 
            href="/content/3"
          />
          <ContentCard 
            title="Community Love" 
            href="/content/4"
          />
        </div>
      </div>

      {/* Serve Section */}
      <div className="px-4 py-6">
        <SectionHeader title="Serve" />
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-gray-600 text-center">
            Find opportunities to serve and get involved in our community.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 z-50">
        <div className="flex gap-3">
          <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 text-base font-medium">
            I'm Interested
          </Button>
          <Button variant="outline" className="flex-1 border-green-600 text-green-600 hover:bg-green-50 py-3 text-base font-medium">
            This is My Church
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="fixed bottom-20 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-40">
        <div className="flex justify-around items-center">
          <Link href="/chat" className="flex flex-col items-center py-2 px-3 text-gray-400">
            <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
            <span className="text-xs mt-1">Chat</span>
          </Link>
          <Link href="/" className="flex flex-col items-center py-2 px-3 text-green-600">
            <div className="w-5 h-5 bg-green-600 rounded-full"></div>
            <span className="text-xs mt-1">Explore</span>
          </Link>
          <Link href="/my-church" className="flex flex-col items-center py-2 px-3 text-gray-400">
            <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
            <span className="text-xs mt-1">My Church</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center py-2 px-3 text-gray-400">
            <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
            <span className="text-xs mt-1">Me</span>
          </Link>
        </div>
      </div>
    </div>
  )
}