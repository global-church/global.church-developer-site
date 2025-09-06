// src/app/page.tsx

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import FeatureCard from "@/components/FeatureCard";
import { FileText, Code, Lock } from "lucide-react";
import GlobeLoader from "@/components/GlobeLoader";


export default function Page() {

  return (
    <div>
      {/* Hero Section (full‑bleed globe) */}
      <section id="hero" className="relative pt-12 md:pt-16 pb-4 md:pb-6 overflow-visible">
        {/* Overlayed text + buttons (constrained) */}
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-5xl md:text-6xl leading-tight font-bold tracking-tight text-gray-900">
            Uniting the Global Church,<br />one API at a time.
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
            <GlobeLoader />
          </div>
        </div>

        {/* CTA buttons stay constrained under the globe */}
        <div className="container mx-auto px-4 mt-16 md:mt-24 mb-0 md:mb-12 relative z-20">
          <div className="mt-24 md:mt-28 flex justify-center gap-4">
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