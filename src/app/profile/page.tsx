import { User } from 'lucide-react'

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900">Me</h1>
        <p className="text-gray-600 mt-2">Your profile and settings</p>
      </div>

      {/* Content */}
      <div className="px-4 py-12 text-center">
        <User size={64} className="text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Coming Soon</h2>
        <p className="text-gray-600">This feature is under development.</p>
      </div>

      {/* Mobile Navigation provided by global layout */}
    </div>
  )
}
