// src/app/page.tsx

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import FeatureCard from "@/components/FeatureCard";
import { FileText, Code, Lock } from "lucide-react";
import GlobeLoader from "@/components/GlobeLoader";
import { useState } from "react";
import { Flag, Church } from "lucide-react";


export default function Page() {
  const [globeColorMode, setGlobeColorMode] = useState<'country' | 'belief'>('country');

  return (
    <div>
      {/* Hero Section (full‑bleed globe) */}
      <section id="hero" className="relative pt-12 md:pt-16 pb-4 md:pb-6 overflow-visible">
        {/* Overlayed text + buttons (constrained) */}
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-5xl md:text-6xl leading-tight font-bold tracking-tight text-gray-900">
            The backbone of a connected Church.
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto mb-0">
            We&#39;re building an open-source data schema and powerful APIs to help developers connect the global body of Christ.
          </p>
        </div>

        {/* Create a large spacer where the globe sits, center globe in it */}
        <div className="relative">
          <div className="h-[520px] md:h-[720px]" />
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Full-bleed globe centered in the spacer; can extend beyond without clipping */}
            <GlobeLoader colorMode={globeColorMode} />
          </div>
        </div>

        {/* CTA buttons stay constrained under the globe */}
        <div className="container mx-auto px-4 mt-16 md:mt-24 mb-0 md:mb-12 relative z-20">
          {/* Globe color mode toggle */}
          <div className="flex justify-center">
            <div role="group" aria-label="Globe color mode" className="inline-flex items-center rounded-full bg-white/80 backdrop-blur shadow ring-1 ring-white/50 overflow-hidden">
              <button
                type="button"
                aria-pressed={globeColorMode === 'country'}
                aria-label="Color by country"
                onClick={() => setGlobeColorMode('country')}
                className={`px-3 py-2 transition-colors ${globeColorMode === 'country' ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-white/60'}`}
                title="Color by country"
              >
                <Flag size={18} />
              </button>
              <button
                type="button"
                aria-pressed={globeColorMode === 'belief'}
                aria-label="Color by belief type"
                onClick={() => setGlobeColorMode('belief')}
                className={`px-3 py-2 transition-colors ${globeColorMode === 'belief' ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-white/60'}`}
                title="Color by belief type"
              >
                <Church size={18} />
              </button>
            </div>
          </div>
          {/* Belief legend (only when belief mode is selected) */}
          {globeColorMode === 'belief' && (
            <div className="mt-3 flex justify-center">
              <ul className="flex items-center gap-4 bg-white/80 backdrop-blur rounded-full px-4 py-2 shadow ring-1 ring-white/50">
                {[
                  { key: 'roman_catholic', label: 'Roman Catholic', color: '#d97706' },
                  { key: 'protestant', label: 'Protestant', color: '#2563eb' },
                  { key: 'orthodox', label: 'Orthodox', color: '#dc2626' },
                  { key: 'anglican', label: 'Anglican', color: '#16a34a' },
                  { key: 'other', label: 'Other', color: '#7c3aed' },
                  { key: 'unknown', label: 'Unknown', color: '#6b7280' },
                ].map((b) => (
                  <li key={b.key} className="flex items-center gap-2 text-sm text-gray-800">
                    <span
                      aria-hidden
                      className="inline-block rounded-full"
                      style={{ width: 12, height: 12, backgroundColor: b.color }}
                    />
                    <span>{b.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-8 md:mt-10 flex justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/explorer">Explore Churches</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/schema">View the Schema</Link>
            </Button>
          </div>
        </div>

      </section>

      {/* Features Section */}
      <section className="bg-white pt-3 pb-16 md:pt-0 md:pb-24">
        <div className="container mx-auto px-4">
          <p className="text-lg text-gray-700 max-w-3xl mx-auto text-center mb-12">
            We&#39;re on a mission to create a digital ecosystem aligned with the Great Commission to connect believers from all the nations. We&#39;ve built these capabilities for the global Church:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto px-4 md:px-6 lg:px-8">
            <FeatureCard
              icon={<FileText size={24} />}
              title="Shared Schema"
              description="A standardized, open-source data model for church information, designed for interoperability."
              href="/schema"
            />
            <FeatureCard
              icon={<Code size={24} />}
              title="Full-Featured API"
              description="Access a growing global database of church information through our developer-friendly Zuplo API."
              href="/api-docs"
            />
          </div>
          <div className="mt-4 md:mt-6 max-w-5xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="w-full">
              <FeatureCard
                icon={<Lock size={24} />}
                title="Robust Security & Privacy"
                description={
                  <>
                    With a secure API gateway providing a single point of entry,<br />
                    security and privacy are always at the center of our work.
                  </>
                }
                href="/security-privacy"
                align="center"
              />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-center pt-20 mb-0">
            A shared data standard for the FaithTech community,<br />
            by the FaithTech community 💙
          </h2>
          <div className="container mx-auto px-4 mt-16 md:mt-24 mb-0 md:mb-12 relative z-20">
          <div className="mt-24 md:mt-28 flex justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/explorer">Learn More</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/schema">Connect With Us</Link>
            </Button>
          </div>
        </div>
        </div>
      </section>
    </div>
  );
}
