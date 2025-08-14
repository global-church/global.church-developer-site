'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle, Search, Church, User } from 'lucide-react'

export default function MobileNavigation() {
  const pathname = usePathname()
  
  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
      <div className="flex justify-around items-center">
        <Link 
          href="/chat" 
          className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
            isActive('/chat') ? 'text-gray-600' : 'text-gray-400'
          }`}
        >
          <MessageCircle size={20} />
          <span className="text-xs mt-1">Chat</span>
        </Link>
        
        <Link 
          href="/" 
          className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
            isActive('/') ? 'text-green-600' : 'text-gray-400'
          }`}
        >
          <Search size={20} />
          <span className="text-xs mt-1">Explore</span>
        </Link>
        
        <Link 
          href="/my-church" 
          className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
            isActive('/my-church') ? 'text-gray-600' : 'text-gray-400'
          }`}
        >
          <Church size={20} />
          <span className="text-xs mt-1">My Church</span>
        </Link>
        
        <Link 
          href="/profile" 
          className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
            isActive('/profile') ? 'text-gray-600' : 'text-gray-400'
          }`}
        >
          <User size={20} />
          <span className="text-xs mt-1">Me</span>
        </Link>
      </div>
    </nav>
  )
}
