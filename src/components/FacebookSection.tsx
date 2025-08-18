// src/components/FacebookSection.tsx
'use client';

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import FacebookPagePlugin from './FacebookPagePlugin';

export default function FacebookSection({ fbUrl }: { fbUrl: string | null }) {
  const [isOpen, setIsOpen] = useState<boolean>(false)

  return (
    <div
      className="rounded-xl border border-gray-200 p-4"
      style={{ backgroundColor: '#E7F3FF' }}
    >
      <h3
        id="facebook-section"
        className="text-sm font-medium text-gray-800 mb-3 text-center"
      >
        Facebook
      </h3>

      {!isOpen && (
        <div className="flex justify-center">
          <Button
            aria-expanded={false}
            aria-controls="facebook-content"
            onClick={() => setIsOpen(true)}
          >
            Show
          </Button>
        </div>
      )}

      {isOpen && (
        <div id="facebook-content" aria-labelledby="facebook-section">
          <div className="w-full flex justify-center">
            <div className="w-full max-w-4xl mx-auto">
              {fbUrl ? (
                <FacebookPagePlugin pageUrl={fbUrl} width={700} height={700} />
              ) : (
                <div className="text-sm text-gray-700 text-center">Facebook link unavailable.</div>
              )}
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              aria-expanded={true}
              aria-controls="facebook-content"
              onClick={() => setIsOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}