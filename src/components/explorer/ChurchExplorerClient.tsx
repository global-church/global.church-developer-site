// src/components/explorer/ChurchExplorerClient.tsx
"use client";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { MapPin, ChevronRight, ChevronDown } from "lucide-react";
import ChurchMap from "@/components/ChurchMap";
import BeliefFilterButton from "@/components/BeliefFilterButton";
import LanguageFilterButton from "@/components/LanguageFilterButton";
import { NearMeButton } from "@/components/NearMeButton";
import { fetchNearbyChurches, NearbyChurch } from "@/lib/nearMe";
import type { ChurchPublic } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import ServiceDayFilter from "@/components/explorer/filters/ServiceDayFilter";
import ServiceTimeFilter from "./filters/ServiceTimeFilter";
import ProgramsFilter from "./filters/ProgramsFilter";
import { searchChurches } from "@/lib/zuplo";

// Client-side parsing/filtering removed in favor of backend filtering

export default function ExplorerClient() {
  const [searchMode, setSearchMode] = useState<'initial' | 'nearby'>('initial');
  const [nearbyResults, setNearbyResults] = useState<NearbyChurch[]>([]);
  const [serverResults, setServerResults] = useState<ChurchPublic[]>([]);
  const baseResults: ChurchPublic[] = useMemo(
    () => (searchMode === 'nearby' ? [] : serverResults),
    [searchMode, serverResults]
  );
  const [loading, setLoading] = useState(false);
  const [radiusKm, setRadiusKm] = useState(25);
  const [unit, setUnit] = useState<"km" | "mi">("km");
  const sp = useSearchParams();
  const [fitKey, setFitKey] = useState(0);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number; isHighAccuracy: boolean } | null>(null);

  // Fetch from backend when URL params change
  useEffect(() => {
    let isActive = true;
    async function load() {
      setLoading(true);
      try {
        const belief = sp.get('belief') || undefined;
        const languageCsv = sp.get('language') || '';
        const languages = languageCsv ? languageCsv.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
        const serviceDayCsv = sp.get('service_days') || '';
        const service_days = serviceDayCsv ? serviceDayCsv.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
        const service_time_start = sp.get('service_time_start') || undefined;
        const service_time_end = sp.get('service_time_end') || undefined;
        const programsStr = sp.get('programs') || '';
        const programs = programsStr ? [programsStr] : undefined;

        const rows = await searchChurches({
          belief,
          languages,
          service_days,
          service_time_start,
          service_time_end,
          programs,
          // fetch all by default
        });
        if (!isActive) return;
        setServerResults(Array.isArray(rows) ? rows : []);
        setSearchMode('initial');
      } finally {
        if (isActive) setLoading(false);
      }
    }
    load();
    return () => { isActive = false };
  }, [sp]);

  const onLocated = useCallback(
    async ({ lat, lng, accuracy, isHighAccuracy }: { lat: number; lng: number; accuracy: number; isHighAccuracy: boolean }) => {
      setUserLocation({ lat, lng, accuracy, isHighAccuracy });
      setLoading(true);
      try {
        const radiusForRpcKm = unit === "km" ? radiusKm : radiusKm * 1.60934;
        const data = await fetchNearbyChurches(lat, lng, radiusForRpcKm, 50);
        const arr = data as unknown as NearbyChurch[];
        setNearbyResults(arr);
        setSearchMode('nearby');
        try {
          sessionStorage.setItem('cf_search_mode', 'nearby');
          sessionStorage.setItem('cf_nearby_results', JSON.stringify(arr));
        } catch {}
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

  // Restore mode and results after remounts due to URL param changes
  useEffect(() => {
    try {
      const mode = sessionStorage.getItem('cf_search_mode');
      if (mode === 'nearby') {
        const raw = sessionStorage.getItem('cf_nearby_results');
        if (raw) {
          const arr = JSON.parse(raw) as NearbyChurch[];
          setNearbyResults(arr);
          setSearchMode('nearby');
        }
      }
    } catch {}
  }, []);

  const formatDistance = (km: number) => {
    if (unit === "km") return `${km.toFixed(1)} km`;
    const miles = km * 0.621371;
    return `${miles.toFixed(1)} mi`;
  };

  // Languages are now provided by API; no client parsing

  const formatBelief = (belief?: NearbyChurch['belief_type'] | null) => {
    if (!belief) return null;
    return belief
      .split("_")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");
  };

  const spKey = sp.toString();
  const resultsKey = useMemo(() => {
    const list = searchMode === 'nearby' ? nearbyResults : serverResults;
    const n = list.length
    if (n === 0) return '0'
    const first = list[0]?.church_id || ''
    const last = list[n - 1]?.church_id || ''
    return `${n}:${first}:${last}`
  }, [nearbyResults, searchMode, serverResults])

  

  const results: NearbyChurch[] = useMemo(() => {
    if (searchMode === 'nearby') return nearbyResults;
    return baseResults.map((r) => ({
      church_id: r.church_id,
      name: r.name,
      distance_km: 0,
      latitude: r.latitude,
      longitude: r.longitude,
      address: r.address ?? null,
      locality: r.locality,
      region: r.region,
      country: r.country,
      website: r.website,
      service_languages: Array.isArray(r.service_languages) ? r.service_languages : null,
      belief_type: (r.belief_type as NearbyChurch['belief_type']) ?? null,
    }));
  }, [baseResults, nearbyResults, searchMode]);

  useEffect(() => {
    setFitKey((k) => k + 1);
  }, [spKey, resultsKey, results.length]);

  const didResetOnLoadRef = useRef(false);
  useEffect(() => {
    if (didResetOnLoadRef.current) return;
    didResetOnLoadRef.current = true;
  }, []);

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

  const mapPins: ChurchPublic[] = useMemo(() => {
    if (searchMode === 'nearby') {
      return results
        .filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number')
        .map(toChurchPublicFromNearby)
    }
    return baseResults.filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number')
  }, [results, baseResults, searchMode]);

  // Removed initial pins switching logic. Map always mirrors filtered results.

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

      {/* More Filters toggle */}
      <div className="flex items-center justify-center">
        <Button
          variant="ghost"
          onClick={() => setMoreFiltersOpen((v) => !v)}
          className="text-gray-700"
          aria-expanded={moreFiltersOpen}
        >
          More Filters
          <ChevronDown className={`transition-transform ${moreFiltersOpen ? 'rotate-180' : ''}`} />
        </Button>
      </div>

      {/* Advanced filters */}
      {moreFiltersOpen && (
        <div className="flex items-center justify-center">
          <div className="flex gap-3 flex-wrap">
            <ServiceDayFilter />
            <ServiceTimeFilter />
            <ProgramsFilter />
          </div>
        </div>
      )}

      {/* Near me button */}
      <div className="flex items-center justify-center">
        <NearMeButton onLocated={onLocated} label="Search From My Location" />
        {searchMode === 'nearby' && (
          <button
            className="ml-3 text-sm underline text-gray-600 hover:text-gray-800"
            onClick={() => { setSearchMode('initial'); setNearbyResults([]); }}
          >
            Show All Churches
          </button>
        )}
      </div>

      {/* Map mirrors current filters/search results – always shown below the button */}
      <div className="h-[420px] w-full rounded-xl overflow-hidden border">
        <ChurchMap pins={mapPins} fitKey={fitKey} disableViewportFetch={true} userLocation={userLocation} />
      </div>

      {/* Removed keyword search bar in favor of advanced filters */}

      {/* Results list */}
      {(
        <>
          {loading && (
            <div className="text-sm text-gray-600 text-center">Loading churches…</div>
          )}

          <ul className="space-y-3">
            {results.map((r) => {
              const languages = Array.isArray(r.service_languages) ? r.service_languages : [];
              const beliefPretty = formatBelief(r.belief_type ?? null);
              return (
                <li key={r.church_id} className="rounded-lg border bg-white">
                  <a href={`/church/${r.church_id}`} className="block p-4 group">
                    <div className="flex items-start gap-3">
                      <div className="size-12 rounded-full bg-primary grid place-items-center text-lg font-semibold text-white flex-shrink-0">
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
                            {r.country}
                            {typeof r.distance_km === 'number' && r.distance_km > 0 ? ` • ${formatDistance(r.distance_km)}` : ''}
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
              No nearby churches match your filters.
            </p>
          )}
        </>
      )}
    </section>
  );
}


