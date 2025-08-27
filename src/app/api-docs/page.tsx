import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

export default function ApiPage() {
  return (
    <div className="bg-white py-16 md:py-24">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="grid md:grid-cols-2 gap-12 items-center">

          {/* Column 1: Textual Content */}
          <div className="text-gray-700">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Church Database API</h1>
            <p className="text-lg mb-4">
              Access a growing global database of church information through our powerful, developer-friendly API, built with Zuplo.
            </p>
            <p>
              Our API provides robust endpoints for searching, filtering, and retrieving church data based on location, belief type, service languages, and more. It&#39;s the engine that powers our Explorer tool and is available for you to integrate into your own applications.
            </p>
            <p>
              Explore the interactive API playground to test queries, view responses, and get the code snippets you need to get started quickly.
            </p>
          </div>

          {/* Column 2: Call-to-Action Card */}
          <div className="bg-gray-50 p-8 rounded-lg border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">API Playground</h3>
            <p className="text-gray-600 mt-2 mb-6">
              Interact with the live API, explore the available queries, and test your requests in our Zuplo-powered developer playground.
            </p>
            <Link href="https://global-church-main-ba4d06e.zuplo.site" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="w-full">
                Launch Playground
                <ExternalLink className="ml-2 size-4" />
              </Button>
            </Link>
          </div>
          
        </div>
      </div>
    </div>
  );
}


