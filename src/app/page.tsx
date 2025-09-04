// src/app/page.tsx

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import FeatureCard from "@/components/FeatureCard";
import { FileText, Code, MapPin } from "lucide-react";
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
            We&#39;re building an open-source data schema and powerful APIs to help developers connect people with local churches.
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
        <div className="container mx-auto px-4 mt-16 md:mt-24 mb-24 md:mb-40">
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/explorer" passHref>
              <Button size="lg">Explore Churches</Button>
            </Link>
            <Link href="/schema" passHref>
              <Button variant="outline" size="lg">View the Schema</Button>
            </Link>
          </div>
        </div>

      </section>

      {/* Features Section */}
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <p className="text-lg text-gray-700 max-w-3xl mx-auto text-center mb-12">
            Global.Church is a mission-driven digital platform aligned with the Great Commission to reach all nations. Its focus is on catalyzing collaboration, discipleship, and action towards this mission and has set out to make the following capabilities available for the global Church:
          </p>
          <h2 className="text-3xl font-bold text-center mb-12">A Platform for FaithTech Innovators</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<FileText size={24} />}
              title="Shared Schema"
              description="A standardized, open-source data model for church information, designed for interoperability."
              href="/schema"
            />
            <FeatureCard
              icon={<Code size={24} />}
              title="Robust Church API"
              description="Access a growing global database of church information through our developer-friendly GraphQL API."
              href="/api-docs"
            />
            <FeatureCard
              icon={<MapPin size={24} />}
              title="Live Church Explorer"
              description="See the API in action with our Church Explorer tool, built on the very platform you can use."
              href="/explorer"
            />
          </div>
        </div>
      </section>
    </div>
  );
}