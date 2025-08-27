"use client";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { MapPin, ChevronRight } from "lucide-react";
import ChurchMap from "@/components/ChurchMap";
import MobileSearch from "@/components/explorer/MobileSearch";
import BeliefFilterButton from "@/components/BeliefFilterButton";
import LanguageFilterButton from "@/components/LanguageFilterButton";
import { NearMeButton } from "@/components/NearMeButton";
import { fetchNearbyChurches, NearbyChurch } from "@/lib/nearMe";
import type { ChurchPublic } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";

export default function ExplorerClient({ initialPins = [] as Array<{ church_id: string; name: string; latitude: number; longitude: number; locality: string | null; region: string | null; country: string; website: string | null; belief_type?: string | null; service_languages?: string[] | null; geojson?: { type: 'Point'; coordinates: [number, number] } | null }>} : { initialPins?: Array<{ church_id: string; name: string; latitude: number; longitude: number; locality: string | null; region: string | null; country: string; website: string | null; belief_type?: string | null; service_languages?: string[] | null; geojson?: { type: 'Point'; coordinates: [number, number] } | null }> }) {
  const [results, setResults] = useState<NearbyChurch[]>([]);
  const [baseResults, setBaseResults] = useState<NearbyChurch[]>([]);
  const [loading, setLoading] = useState(false);
  const [radiusKm, setRadiusKm] = useState(25);
  const [unit, setUnit] = useState<"km" | "mi">("km");
  const sp = useSearchParams();
  const router = useRouter();
  const [initialPinsLoaded, setInitialPinsLoaded] = useState(false);
  const [fitKey, setFitKey] = useState(0);

  const onLocated = useCallback(
    async ({ lat, lng }: { lat: number; lng: number }) => {
      setLoading(true);
      try {
        const radiusForRpcKm = unit === "km" ? radiusKm : radiusKm * 1.60934;
        const data = await fetchNearbyChurches(lat, lng, radiusForRpcKm, 50);
        setBaseResults(data as unknown as NearbyChurch[]);
      } catch (e: unknown) {
        const msg = (e instanceof Error && e.message) ? e.message : String(e);
        console.error("NearMe error:", e);
        const details = [
          `coords=(${lat.toFixed?.(5) ?? lat}, ${lng.toFixed?.(5) ?? lng})`,
          `radiusKm=${radiusKm} (${unit})`,
        ].join(" | ");
        alert(`Nearby search failed. Details: ${details}. Error: ${msg}`);
      } finally {
        setLoading(false);
      }
    },
    [radiusKm, unit]
  );

  const formatDistance = (km: number) => {
    if (unit === "km") return `${km.toFixed(1)} km`;
    const miles = km * 0.621371;
    return `${miles.toFixed(1)} mi`;
  };

  const extractLanguages = (church: NearbyChurch & { services_info?: string | null }): string[] => {
    const langsFromRpc: string[] = Array.isArray(church.service_languages)
      ? church.service_languages.map((s) => String(s).trim()).filter(Boolean)
      : [];
    if (langsFromRpc.length > 0) return langsFromRpc;
    if (typeof church.services_info === "string" && church.services_info.length > 0) {
      try {
        const parsed = JSON.parse(church.services_info);
        const items: string[] = Array.isArray(parsed)
          ? parsed.map((v) => String(v))
          : typeof parsed === "string"
          ? [parsed]
          : [];
        const set = new Set<string>();
        const re = /^\s*([^:]+):\s*/;
        for (const item of items) {
          const m = String(item).match(re);
          if (m && m[1]) set.add(m[1].trim());
        }
        return Array.from(set);
      } catch {
      }
    }
    return [];
  };

  const formatBelief = (belief?: NearbyChurch['belief_type'] | null) => {
    if (!belief) return null;
    return belief
      .split("_")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");
  };

  const spKey = sp.toString();
  const resultsKey = useMemo(() => {
    const n = baseResults.length
    if (n === 0) return '0'
    const first = baseResults[0]?.church_id || ''
    const last = baseResults[n - 1]?.church_id || ''
    return `${n}:${first}:${last}`
  }, [baseResults])

  useEffect(() => {
    if (!baseResults.length) {
      setResults([]);
      return;
    }
    const beliefParam = sp.get('belief') || '';
    const languageParam = sp.get('language') || '';
    const beliefs = beliefParam.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    const languages = languageParam.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    const filtered = baseResults.filter((row) => {
      const beliefOk = beliefs.length === 0 || (row.belief_type ? beliefs.includes(String(row.belief_type)) : false);
      const langs = Array.isArray(row.service_languages) ? row.service_languages.map((s) => s.toLowerCase()) : [];
      const languageOk = languages.length === 0 || languages.some((lang) => langs.includes(lang));
      return beliefOk && languageOk;
    });
    setResults(filtered);
  }, [baseResults, sp]);

  useEffect(() => {
    setFitKey((k) => k + 1);
  }, [spKey, resultsKey]);

  const didResetOnLoadRef = useRef(false);
  useEffect(() => {
    if (didResetOnLoadRef.current) return;
    didResetOnLoadRef.current = true;
    const params = new URLSearchParams(sp.toString());
    const had = params.has('belief') || params.has('language');
    if (had) {
      params.delete('belief');
      params.delete('language');
      const qs = params.toString();
      router.replace(qs ? `/explorer?${qs}` : '/explorer');
    }
  }, [router, sp]);

  const toChurchPublicFromNearby = (r: NearbyChurch): ChurchPublic => ({
    church_id: r.church_id,
    gers_id: null,
    name: r.name,
    latitude: r.latitude as number,
    longitude: r.longitude as number,
    address: r.address ?? null,
    locality: r.locality,
    region: r.region,
    postal_code: null,
    country: r.country,
    website: r.website,
    website_root: null,
    pipeline_status: null,
    search_blob: null,
    belief_type: r.belief_type ?? null,
    trinitarian_beliefs: null,
    church_beliefs_url: null,
    services_info: null,
    service_languages: Array.isArray(r.service_languages) ? r.service_languages : null,
    instagram_url: null,
    youtube_url: null,
    social_media: null,
    scraped_email: null,
    phone: null,
    church_phone: null,
    giving_url: null,
    scraped_address: null,
    programs_offered: null,
    church_summary: null,
    geo: null,
    geojson: (typeof r.longitude === 'number' && typeof r.latitude === 'number')
      ? { type: 'Point', coordinates: [r.longitude as number, r.latitude as number] }
      : null,
  });

  const pinsFromResults: ChurchPublic[] = results
    .filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number')
    .map(toChurchPublicFromNearby);

  if (!initialPinsLoaded && pinsFromResults.length === 0 && initialPins.length > 0) {
    setInitialPinsLoaded(true);
  }

  const filteredInitialPins = useMemo(() => {
    if (pinsFromResults.length > 0) return []
    const beliefParam = sp.get('belief') || ''
    const languageParam = sp.get('language') || ''
    const beliefs = beliefParam.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    const languages = languageParam.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    if (beliefs.length === 0 && languages.length === 0) return initialPins
    return initialPins.filter((p) => {
      const beliefOk = beliefs.length === 0 || (p.belief_type ? beliefs.includes(String(p.belief_type)) : false)
      const langs = Array.isArray(p.service_languages) ? p.service_languages.map((s) => s.toLowerCase()) : []
      const languageOk = languages.length === 0 || languages.some((lang) => langs.includes(lang))
      return beliefOk && languageOk
    })
  }, [initialPins, spKey, pinsFromResults.length])

  const toChurchPublicFromInitial = (p: { church_id: string; name: string; latitude: number; longitude: number; locality: string | null; region: string | null; country: string; website: string | null; belief_type?: string | null; service_languages?: string[] | null; geojson?: { type: 'Point'; coordinates: [number, number] } | null }): ChurchPublic => ({
    church_id: p.church_id,
    gers_id: null,
    name: p.name,
    latitude: p.latitude,
    longitude: p.longitude,
    address: null,
    locality: p.locality,
    region: p.region,
    postal_code: null,
    country: p.country,
    website: p.website,
    website_root: null,
    pipeline_status: null,
    search_blob: null,
    belief_type: p.belief_type ?? null,
    trinitarian_beliefs: null,
    church_beliefs_url: null,
    services_info: null,
    service_languages: Array.isArray(p.service_languages) ? p.service_languages : null,
    instagram_url: null,
    youtube_url: null,
    social_media: null,
    scraped_email: null,
    phone: null,
    church_phone: null,
    giving_url: null,
    scraped_address: null,
    programs_offered: null,
    church_summary: null,
    geo: null,
    geojson: p.geojson ?? { type: 'Point', coordinates: [p.longitude, p.latitude] },
  });

  const filteredInitialPinsForMap: ChurchPublic[] = useMemo(
    () => (pinsFromResults.length > 0 ? [] : filteredInitialPins.map(toChurchPublicFromInitial)),
    [filteredInitialPins, pinsFromResults.length]
  );

  return (
    <section className="space-y-6">
      {/* Filters row */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <BeliefFilterButton />
        <LanguageFilterButton />
        <label className="text-sm flex items-center gap-2">
          within
          <input
            aria-label="Search radius"
            type="number"
            min={1}
            max={200}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="w-20 rounded border px-2 py-1"
          />
        </label>
        <label className="text-sm flex items-center gap-2">
          Units
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as "km" | "mi")}
            className="rounded border px-2 py-1"
          >
            <option value="km">km</option>
            <option value="mi">miles</option>
          </select>
        </label>
      </div>

      {/* Near me button */}
      <div className="flex items-center justify-center">
        <NearMeButton onLocated={onLocated} label="Search From My Location" />
      </div>

      {/* Keyword search bar */}
      <div className="flex justify-center">
        <div className="w-full max-w-3xl">
          <MobileSearch context="home" />
        </div>
      </div>

      {/* Results list */}
      {loading && (
        <div className="text-sm text-gray-600 text-center">Loading nearby churches…</div>
      )}

      <ul className="space-y-3">
        {results.map((r) => {
          const languages = extractLanguages(r);
          const beliefPretty = formatBelief(r.belief_type ?? null);
          return (
            <li key={r.church_id} className="rounded-xl border">
              <a href={`/church/${r.church_id}`} className="block p-4 group">
                <div className="flex items-start gap-3">
                  <div className="size-12 rounded-full bg-gradient-to-br from-teal-200 to-blue-300 grid place-items-center text-lg font-semibold text-slate-800 flex-shrink-0">
                    {r.name?.charAt(0).toUpperCase() ?? "C"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="font-medium truncate">{r.name}</div>
                      <div className="flex items-center gap-1 flex-shrink-0 overflow-hidden">
                        {beliefPretty && (
                          <span className="inline-flex items-center rounded-md bg-gray-100 text-gray-700 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap">
                            {beliefPretty}
                          </span>
                        )}
                        {languages.map((lang, idx) => (
                          <span
                            key={`${lang}-${idx}`}
                            className="inline-flex items-center rounded-md bg-gray-100 text-gray-700 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 flex items-center gap-1">
                      <MapPin size={14} className="opacity-0" />
                      <span>
                        {[r.locality, r.region].filter(Boolean).join(", ")}
                        {(r.locality || r.region) ? " • " : ""}
                        {r.country} • {formatDistance(r.distance_km)}
                      </span>
                    </div>

                    {r.address && (
                      <div className="text-sm text-gray-700 flex items-center gap-1">
                        <MapPin size={14} className="text-gray-500" />
                        <span>{r.address}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 self-center">
                    <div className="size-7 grid place-items-center rounded-full bg-gray-100 text-gray-500 group-hover:bg-gray-200">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              </a>
            </li>
          );
        })}
      </ul>

      {!loading && results.length === 0 && (
        <p className="text-sm text-gray-600 text-center">
          Click “Use my location” to find churches near you.
        </p>
      )}

      {/* Map mirrors current filters/search results */}
      <div className="h-[420px] w-full rounded-xl overflow-hidden border">
        <ChurchMap pins={pinsFromResults.length > 0 ? pinsFromResults : filteredInitialPinsForMap} fitKey={fitKey} />
      </div>
    </section>
  );
}


