// src/app/page.tsx

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import FeatureCard from "@/components/FeatureCard";
import { FileText, Code, Lock } from "lucide-react";
import GlobeLoader from "@/components/GlobeLoader";
import { useState, useRef, useEffect } from "react";
import { Flag, Church, Globe2 } from "lucide-react";
import type { GlobeHandle } from "@/components/InteractiveGlobe";


export default function Page() {
  const [globeColorMode, setGlobeColorMode] = useState<'country' | 'belief'>('belief');
  const globeRef = useRef<GlobeHandle>(null);
  const [webglAvailable, setWebglAvailable] = useState(true); // optimistic default

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      setWebglAvailable(!!gl);
    } catch {
      setWebglAvailable(false);
    }
  }, []);

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

          {/* Globe color mode toggle - only shown when WebGL is available */}
          {webglAvailable && (
            <div className="flex justify-center mt-8">
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
          )}

          {/* Belief legend (only when belief mode is selected and WebGL available) */}
          {webglAvailable && globeColorMode === 'belief' && (
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
        </div>

        {/* Globe or fallback when WebGL is unavailable */}
        {webglAvailable ? (
          <div className="relative overflow-visible">
            <div className="h-[520px] md:h-[720px]" />
            <div className="absolute inset-0 flex items-center justify-center overflow-visible">
              <GlobeLoader ref={globeRef} colorMode={globeColorMode} />
              <div className="absolute right-4 top-4 md:right-[calc(50%-400px)] md:top-[calc(50%-350px)] flex flex-col gap-2 z-50 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => globeRef.current?.zoomIn()}
                  aria-label="Zoom in"
                  className="rounded-full bg-white/80 text-gray-900 shadow-lg ring-1 ring-white/50 hover:bg-white backdrop-blur px-2 py-2 transition-transform hover:scale-105"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                <button
                  type="button"
                  onClick={() => globeRef.current?.zoomOut()}
                  aria-label="Zoom out"
                  className="rounded-full bg-white/80 text-gray-900 shadow-lg ring-1 ring-white/50 hover:bg-white backdrop-blur px-2 py-2 transition-transform hover:scale-105"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 md:py-24">
            <Globe2 size={64} className="text-gray-300 mb-4" strokeWidth={1} />
            <p className="text-xl font-semibold text-gray-700">10,000+ churches worldwide</p>
            <p className="text-sm text-gray-400 mt-1">Interactive globe requires WebGL</p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/explorer">Explore on Map</Link>
            </Button>
          </div>
        )}

        {/* CTA buttons stay constrained under the globe */}
        <div className="container mx-auto px-4 mt-16 md:mt-24 mb-0 md:mb-12 relative z-20">
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
        </div>
      </section>
    </div>
  );
}
