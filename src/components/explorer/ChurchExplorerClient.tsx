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
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import ServiceDayFilter from "@/components/explorer/filters/ServiceDayFilter";
import ServiceTimeFilter from "./filters/ServiceTimeFilter";
import ProgramsFilter from "./filters/ProgramsFilter";

// Local helpers (module scope) to keep hook deps stable
type ParsedService = { day: string; time: string; description?: string };
const DAY_NAME_MAP: Record<string, string> = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};

function to24Hour(timeStr: string): string | null {
  const re = /^(\d{1,2}):(\d{2})\s*(am|pm)?$/i;
  const m = timeStr.trim().match(re);
  if (!m) return null;
  let hours = parseInt(m[1] || "0", 10);
  const minutes = parseInt(m[2] || "0", 10);
  const ampm = (m[3] || "").toLowerCase();
  if (ampm === "pm" && hours < 12) hours += 12;
  if (ampm === "am" && hours === 12) hours = 0;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return `${hh}:${mm}`;
}

function parseServicesInfoStable(church: { services_info?: string | null }): ParsedService[] {
  const raw = church?.services_info ?? null;
  if (!raw) return [];
  let items: string[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) items = parsed.map((v) => String(v));
    else if (typeof parsed === "string") items = [parsed];
    else items = [];
  } catch {
    if (typeof raw === "string" && raw.length > 0) items = [raw];
  }
  const re = /(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\b[^\d]*(\d{1,2}:\d{2})(?:\s*(AM|PM))?/i;
  const parsed: ParsedService[] = [];
  for (const item of items) {
    const m = String(item).match(re);
    if (!m) continue;
    const dayAbbrev = (m[1] || "").slice(0, 3).toLowerCase();
    const timeRaw = `${m[2]}${m[3] ? ` ${m[3]}` : ""}`.trim();
    const time24 = to24Hour(timeRaw);
    const day = DAY_NAME_MAP[dayAbbrev] || "";
    if (!day || !time24) continue;
    parsed.push({ day, time: time24, description: String(item) });
  }
  return parsed;
}

export default function ExplorerClient({ initialPins = [] as Array<{ church_id: string; name: string; latitude: number; longitude: number; locality: string | null; region: string | null; country: string; website: string | null; belief_type?: string | null; service_languages?: string[] | null; geojson?: { type: 'Point'; coordinates: [number, number] } | null }>} : { initialPins?: Array<{ church_id: string; name: string; latitude: number; longitude: number; locality: string | null; region: string | null; country: string; website: string | null; belief_type?: string | null; service_languages?: string[] | null; geojson?: { type: 'Point'; coordinates: [number, number] } | null }> }) {
  const initialNearbyChurches = useMemo(() => {
    const allowed = new Set(['orthodox','roman_catholic','protestant','anglican','other','unknown']);
    return initialPins.map((p) => ({
      church_id: p.church_id,
      name: p.name,
      distance_km: 0,
      latitude: p.latitude ?? null,
      longitude: p.longitude ?? null,
      address: null,
      locality: p.locality ?? null,
      region: p.region ?? null,
      country: p.country,
      website: p.website ?? null,
      service_languages: Array.isArray(p.service_languages) ? p.service_languages : null,
      belief_type: p.belief_type && allowed.has(String(p.belief_type).toLowerCase())
        ? (String(p.belief_type).toLowerCase() as NearbyChurch['belief_type'])
        : null,
      services_info: null,
      programs_offered: null,
    })) as NearbyChurch[];
  }, [initialPins]);
  const [searchMode, setSearchMode] = useState<'initial' | 'nearby'>('initial');
  const [nearbyResults, setNearbyResults] = useState<NearbyChurch[]>([]);
  const baseResults: NearbyChurch[] = useMemo(
    () => (searchMode === 'nearby' ? nearbyResults : initialNearbyChurches),
    [searchMode, nearbyResults, initialNearbyChurches]
  );
  const [loading, setLoading] = useState(false);
  const [radiusKm, setRadiusKm] = useState(25);
  const [unit, setUnit] = useState<"km" | "mi">("km");
  const sp = useSearchParams();
  const router = useRouter();
  const [fitKey, setFitKey] = useState(0);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  // Advanced filter state
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [programQuery, setProgramQuery] = useState<string>("");

  const onLocated = useCallback(
    async ({ lat, lng }: { lat: number; lng: number }) => {
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

  

  const churchIdToServices = useMemo(() => {
    const map = new Map<string, ParsedService[]>();
    for (const r of baseResults) {
      const arr = parseServicesInfoStable(r as { services_info?: string | null });
      map.set(r.church_id, arr);
    }
    return map;
  }, [baseResults]);

  const timeWithinRange = (time: string, start: string | null, end: string | null): boolean => {
    if (!start && !end) return true;
    const toMinutes = (t: string) => {
      const [hh, mm] = t.split(":").map((v) => parseInt(v, 10));
      return hh * 60 + mm;
    };
    const t = toMinutes(time);
    const s = start ? toMinutes(start) : -Infinity;
    const e = end ? toMinutes(end) : Infinity;
    return t >= s && t <= e;
  };

  const results: NearbyChurch[] = useMemo(() => {
    if (!baseResults.length) return [];
    const beliefParam = sp.get('belief') || '';
    const languageParam = sp.get('language') || '';
    const beliefs = beliefParam.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    const languages = languageParam.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

    const selectedDaysLower = new Set(Array.from(selectedDays).map((d) => d.toLowerCase()));
    const programQueryLower = programQuery.trim().toLowerCase();

    return baseResults
      .filter((row) => {
        const beliefOk = beliefs.length === 0 || (row.belief_type ? beliefs.includes(String(row.belief_type)) : false);
        const langs = Array.isArray(row.service_languages) ? row.service_languages.map((s) => s.toLowerCase()) : [];
        const languageOk = languages.length === 0 || languages.some((lang) => langs.includes(lang));
        return beliefOk && languageOk;
      })
      .filter((row) => {
        if (selectedDaysLower.size === 0) return true;
        const services = churchIdToServices.get(row.church_id) || [];
        if (services.length === 0) return false;
        return services.some((s) => selectedDaysLower.has(s.day.toLowerCase()));
      })
      .filter((row) => {
        const { start, end } = timeRange || { start: null, end: null };
        if (!start && !end) return true;
        const services = churchIdToServices.get(row.church_id) || [];
        if (services.length === 0) return false;
        return services.some((s) => timeWithinRange(s.time, start, end));
      })
      .filter((row) => {
        if (!programQueryLower) return true;
        const programs = (row as unknown as { programs_offered?: string[] | null }).programs_offered || [];
        if (!Array.isArray(programs) || programs.length === 0) return false;
        return programs.some((p) => String(p).toLowerCase().includes(programQueryLower));
      });
  }, [baseResults, sp, selectedDays, timeRange, programQuery, churchIdToServices]);

  useEffect(() => {
    setFitKey((k) => k + 1);
  }, [spKey, resultsKey, results.length]);

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

  const mapPins: ChurchPublic[] = useMemo(() => {
    return results
      .filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number')
      .map(toChurchPublicFromNearby)
  }, [results]);

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
            <ServiceDayFilter onSelectionChange={setSelectedDays} />
            <ServiceTimeFilter onTimeChange={setTimeRange} />
            <ProgramsFilter onQueryChange={setProgramQuery} />
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
        <ChurchMap pins={mapPins} fitKey={fitKey} disableViewportFetch={true} />
      </div>

      {/* Removed keyword search bar in favor of advanced filters */}

      {/* Results list (only render after nearby search) */}
      {searchMode === 'nearby' && (
        <>
          {loading && (
            <div className="text-sm text-gray-600 text-center">Loading nearby churches…</div>
          )}

          <ul className="space-y-3">
            {results.map((r) => {
              const languages = extractLanguages(r);
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
              No nearby churches match your filters.
            </p>
          )}
        </>
      )}
    </section>
  );
}


