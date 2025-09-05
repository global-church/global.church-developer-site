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
import { formatLanguages, normalizeLanguagesToCodes } from "@/lib/languages";

// Client-side parsing/filtering removed in favor of backend filtering

// Service time helpers (module scope for stable identities)
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] as const;
const DAY_ABBR = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] as const;
const minutesToDayIndex = (m: number) => Math.max(0, Math.min(6, Math.floor(m / 1440)));
const minutesToTimeString = (m: number) => {
  const mins = ((m % 1440) + 1440) % 1440;
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  const h12 = ((hh + 11) % 12) + 1;
  const ampm = hh >= 12 ? 'PM' : 'AM';
  return `${h12}:${mm.toString().padStart(2,'0')} ${ampm}`;
};
const formatServiceTimes = (times?: number[] | null) => {
  if (!Array.isArray(times) || times.length === 0) return [] as { label: string; day: string; minutes: number }[];
  return times
    .filter((n) => Number.isFinite(n))
    .map((n) => {
      const d = minutesToDayIndex(n);
      return { label: `${DAY_ABBR[d]} ${minutesToTimeString(n)}`, day: DAY_NAMES[d], minutes: n };
    })
    .sort((a, b) => a.minutes - b.minutes);
};

// Parse HH:MM (24h) to minutes since start of day
const parseTimeParam = (s?: string | null): number | undefined => {
  if (!s) return undefined;
  const m = String(s).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return undefined;
  const hh = Math.min(23, Math.max(0, Number(m[1])));
  const mm = Math.min(59, Math.max(0, Number(m[2])));
  return hh * 60 + mm;
};

const inTimeRange = (minuteOfDay: number, start?: number, end?: number): boolean => {
  if (start == null && end == null) return true;
  if (start != null && end == null) return minuteOfDay >= start;
  if (start == null && end != null) return minuteOfDay <= end;
  if (start != null && end != null) {
    if (start <= end) return minuteOfDay >= start && minuteOfDay <= end;
    // wrap-around (e.g., 22:00 to 02:00)
    return minuteOfDay >= start || minuteOfDay <= end;
  }
  return true;
};

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
        const rawBelief = sp.get('belief') || '';
        const beliefParts = rawBelief.split(',').map((s) => s.trim()).filter(Boolean);
        const ALL_BELIEFS = ['protestant','roman_catholic','orthodox','anglican','other'] as const;
        const belief: string | string[] | undefined = beliefParts.length === 0 || beliefParts.length === ALL_BELIEFS.length
          ? undefined
          : (beliefParts.length === 1 ? beliefParts[0] : beliefParts);
        const languageCsv = sp.get('language') || '';
        const uiLanguages = languageCsv ? languageCsv.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
        const languages = normalizeLanguagesToCodes(uiLanguages);
        const serviceDayCsv = sp.get('service_days') || '';
        const service_days = serviceDayCsv ? serviceDayCsv.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
        const service_time_start = sp.get('service_time_start') || undefined;
        const service_time_end = sp.get('service_time_end') || undefined;
        const programsStr = sp.get('programs') || '';
        const programs = programsStr ? [programsStr] : undefined;

        if (searchMode === 'nearby' && userLocation) {
          // In nearby mode, refetch radius results when filters change
          const radiusForRpcKm = unit === "km" ? radiusKm : radiusKm * 1.60934;
          const data = await fetchNearbyChurches(
            userLocation.lat,
            userLocation.lng,
            radiusForRpcKm,
            50,
            { belief, languages, service_days, service_time_start, service_time_end, programs }
          );
          if (!isActive) return;
          setNearbyResults(data);
        } else {
          const rows = await searchChurches({
            belief,
            languages,
            service_days,
            service_time_start,
            service_time_end,
            programs,
          });
          if (!isActive) return;
          setServerResults(Array.isArray(rows) ? rows : []);
          setSearchMode('initial');
        }
      } finally {
        if (isActive) setLoading(false);
      }
    }
    load();
    return () => { isActive = false };
  }, [sp, searchMode, userLocation, radiusKm, unit]);

  const onLocated = useCallback(
    async ({ lat, lng, accuracy, isHighAccuracy }: { lat: number; lng: number; accuracy: number; isHighAccuracy: boolean }) => {
      setUserLocation({ lat, lng, accuracy, isHighAccuracy });
      setLoading(true);
      try {
        const radiusForRpcKm = unit === "km" ? radiusKm : radiusKm * 1.60934;
        // Pull current filters from URL
        const rawBelief = sp.get('belief') || '';
        const beliefParts = rawBelief.split(',').map((s) => s.trim()).filter(Boolean);
        const ALL_BELIEFS = ['protestant','roman_catholic','orthodox','anglican','other'] as const;
        const belief: string | string[] | undefined = beliefParts.length === 0 || beliefParts.length === ALL_BELIEFS.length
          ? undefined
          : (beliefParts.length === 1 ? beliefParts[0] : beliefParts);
        const languageCsv = sp.get('language') || '';
        const uiLanguages = languageCsv ? languageCsv.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
        const languages = normalizeLanguagesToCodes(uiLanguages);
        const serviceDayCsv = sp.get('service_days') || '';
        const service_days = serviceDayCsv ? serviceDayCsv.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
        const service_time_start = sp.get('service_time_start') || undefined;
        const service_time_end = sp.get('service_time_end') || undefined;
        const programsStr = sp.get('programs') || '';
        const programs = programsStr ? [programsStr] : undefined;

        const data = await fetchNearbyChurches(lat, lng, radiusForRpcKm, 50, {
          belief,
          languages,
          service_days,
          service_time_start,
          service_time_end,
          programs,
        });
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
    [radiusKm, unit, sp]
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
      service_times: Array.isArray(r.service_times) ? r.service_times : null,
      belief_type: (r.belief_type as NearbyChurch['belief_type']) ?? null,
    }));
  }, [baseResults, nearbyResults, searchMode]);

  const selectedServiceDays = useMemo(() => {
    const raw = sp.get('service_days') || '';
    const set = new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
    return set;
  }, [sp]);

  const resultsFiltered: NearbyChurch[] = useMemo(() => {
    const startParam = sp.get('service_time_start');
    const endParam = sp.get('service_time_end');
    const startM = parseTimeParam(startParam);
    const endM = parseTimeParam(endParam);
    if (selectedServiceDays.size === 0 && startM == null && endM == null) return results;
    return results.filter((r) => {
      const arr = Array.isArray((r as { service_times?: number[] }).service_times)
        ? ((r as { service_times?: number[] }).service_times as number[])
        : [];
      if (arr.length === 0) return false;
      for (const n of arr) {
        const day = DAY_NAMES[minutesToDayIndex(n)];
        const timeOfDay = ((n % 1440) + 1440) % 1440;
        const dayOk = selectedServiceDays.size === 0 || selectedServiceDays.has(day);
        const timeOk = inTimeRange(timeOfDay, startM, endM);
        if (dayOk && timeOk) return true;
      }
      return false;
    });
  }, [results, selectedServiceDays, sp]);

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
            {resultsFiltered.map((r, idx) => {
              const languages = Array.isArray(r.service_languages) ? r.service_languages : [];
              const languageNames = formatLanguages(languages);
              const beliefPretty = formatBelief(r.belief_type ?? null);
              let times = formatServiceTimes((r as { service_times?: number[] }).service_times as number[] | undefined);
              if (selectedServiceDays.size > 0) {
                times = times.filter((t) => selectedServiceDays.has(t.day));
              }
              const startM = parseTimeParam(sp.get('service_time_start'));
              const endM = parseTimeParam(sp.get('service_time_end'));
              if (startM != null || endM != null) {
                times = times.filter((t) => inTimeRange(((t.minutes % 1440) + 1440) % 1440, startM, endM));
              }
              // Link to profile when we have an id
              return (
                <li key={`${r.church_id || 'no-id'}-${idx}`} className="rounded-lg border bg-white">
                  {r.church_id ? (
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
                              {languageNames.map((lang, idx) => (
                                <span
                                  key={`${lang}-${idx}`}
                                  className="inline-flex items-center rounded-md bg-gray-100 text-gray-700 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
                                >
                                  {lang}
                                </span>
                              ))}
                              <span className="flex-1" />
                              {times.length > 0 && (
                                <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                                  {times.slice(0, 3).map((t, idx) => (
                                    <span key={`${r.church_id}-t-${idx}`} className="inline-flex items-center rounded-full bg-gray-900/90 text-white px-2.5 py-0.5 text-[10px] font-medium shadow-sm">
                                      {t.label}
                                    </span>
                                  ))}
                                </div>
                              )}
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
                  ) : (
                    <div className="block p-4 group">
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
                              {languageNames.map((lang, idx) => (
                                <span
                                  key={`${lang}-${idx}`}
                                  className="inline-flex items-center rounded-md bg-gray-100 text-gray-700 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
                                >
                                  {lang}
                                </span>
                              ))}
                              <span className="flex-1" />
                              {times.length > 0 && (
                                <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                                  {times.slice(0, 3).map((t, idx) => (
                                    <span key={`noid-t-${idx}`} className="inline-flex items-center rounded-full bg-gray-900/90 text-white px-2.5 py-0.5 text-[10px] font-medium shadow-sm">
                                      {t.label}
                                    </span>
                                  ))}
                                </div>
                              )}
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
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {!loading && resultsFiltered.length === 0 && (
            <p className="text-sm text-gray-600 text-center">
              No nearby churches match your filters.
            </p>
          )}
        </>
      )}
    </section>
  );
}
