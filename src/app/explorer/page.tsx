import type { Metadata } from "next";
import { searchChurches } from "@/lib/zuplo";
import ExplorerClient from "@/components/explorer/ExplorerClient";

export const metadata: Metadata = {
  title: "Explorer - Global.Church",
  description:
    "Explore the Global.Church database with our interactive map and search tool. A live demonstration of our API.",
};

export default async function ExplorerPage() {
  // Fetch initial pins to populate the map on first load.
  const rows = await searchChurches({ limit: 1000 });

  const initialPins = (rows ?? [])
    .filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number')
    .map((r) => ({
      church_id: r.church_id,
      name: r.name,
      latitude: r.latitude as number,
      longitude: r.longitude as number,
      locality: r.locality,
      region: r.region,
      country: r.country,
      website: r.website,
      belief_type: r.belief_type ?? null,
      service_languages: Array.isArray(r.service_languages) ? r.service_languages : null,
      geojson: null,
    }));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Explorer</h1>
        <p className="mt-2 text-lg text-gray-600">An interactive demonstration of the Global.Church API.</p>
      </div>
      <ExplorerClient initialPins={initialPins} />
    </div>
  );
}


