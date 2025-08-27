import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

export default function SchemaPage() {
  return (
    <div className="bg-white py-16 md:py-24">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          
          {/* Column 1: Textual Content */}
          <div className="text-gray-700">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">The Global.Church Schema</h1>
            <p className="text-lg mb-4">
              At the heart of our mission is a standardized, open-source data model for church information. The Global.Church Schema is designed to create a common language for FaithTech developers worldwide.
            </p>
            <p>
              For too long, valuable church data has been locked away in disconnected silos. By establishing a shared, comprehensive standard for everything from service times and beliefs to accessibility features and online ministries, we can unlock a new wave of innovation and collaboration.
            </p>
            <p>
              This schema is a community-driven effort, versioned and maintained on GitHub. We invite you to explore it, provide feedback, and help us build a more connected global Church.
            </p>
          </div>

          {/* Column 2: Call-to-Action Card */}
          <div className="bg-gray-50 p-8 rounded-lg border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">Schema Documentation</h3>
            <p className="text-gray-600 mt-2 mb-6">
              View the complete, versioned schema documentation, including all types and fields, hosted on GitHub Pages.
            </p>
            <Link href="https://trentsikute.github.io/globalchurch-schema/" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="w-full">
                View the Schema
                <ExternalLink className="ml-2 size-4" />
              </Button>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}


