import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Support Global.Church",
  description: "Help us build tools that help people find and engage with local churches.",
}

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white px-4 py-6 text-center border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Support Global.Church</h1>
      </div>

      <div className="px-4 py-8 max-w-2xl mx-auto space-y-6">
        <p className="text-gray-700 text-lg leading-relaxed text-center">
          Thank you for your interest in supporting Global.Church. Your generosity helps us
          maintain the directory, improve search, and build tools that connect people to
          local church communities around the world.
        </p>
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <p className="text-gray-700">
            Donation options and integration are coming soon. In the meantime, if you would
            like to get in touch about supporting this project, please email us.
          </p>
          <a
            href="mailto:support@global.church"
            className="inline-block mt-4 bg-green-600 text-white px-5 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Contact Us
          </a>
        </div>
        <div className="text-center">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">Back to Home</Link>
        </div>
      </div>

      {/* Bottom nav provided globally */}
    </div>
  )
}
