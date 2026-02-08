// src/components/explorer/ChurchExplorerClient.tsx
"use client";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { MapPin, ChevronRight, ChevronDown, Search, X } from "lucide-react";
import ChurchMap from "@/components/ChurchMap";
import BeliefFilterButton from "@/components/BeliefFilterButton";
import LanguageFilterButton from "@/components/LanguageFilterButton";
import { NearMeButton } from "@/components/NearMeButton";
import { fetchNearbyChurches, NearbyChurch } from "@/lib/nearMe";
import type { ChurchPublic } from "@/lib/types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ServiceDayFilter from "@/components/explorer/filters/ServiceDayFilter";
import ServiceTimeFilter from "./filters/ServiceTimeFilter";
import DenominationFilter from "./filters/DenominationFilter";
import ProgramsFilter from "./filters/ProgramsFilter";
import { searchChurches } from "@/lib/zuplo";
import { formatLanguages, normalizeLanguagesToCodes } from "@/lib/languages";

// Client-side parsing/filtering removed in favor of backend filtering

// Service time helpers (module scope for stable identities)
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] as const;
const DAY_ABBR = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] as const;
const ALL_BELIEFS = ['protestant','roman_catholic','orthodox','anglican','other'] as const;
const DEFAULT_PAGE_SIZE = 100;
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

type ExplorerFilters = {
  q?: string;
  belief?: string | string[];
  languages?: string[];
  service_days?: string[];
  service_time_start?: string;
  service_time_end?: string;
  programs?: string[];
};

export default function ExplorerClient() {
  const [searchMode, setSearchMode] = useState<'initial' | 'nearby'>('initial');
  const [nearbyResults, setNearbyResults] = useState<NearbyChurch[]>([]);
  const [serverResults, setServerResults] = useState<ChurchPublic[]>([]);
  const [serverMeta, setServerMeta] = useState<{ hasMore: boolean; nextCursor: string | null }>({ hasMore: false, nextCursor: null });
  const [nearbyMeta, setNearbyMeta] = useState<{ hasMore: boolean; nextCursor: string | null }>({ hasMore: false, nextCursor: null });
  const baseResults: ChurchPublic[] = useMemo(
    () => (searchMode === 'nearby' ? [] : serverResults),
    [searchMode, serverResults]
  );
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [radiusKm, setRadiusKm] = useState(25);
  const [unit, setUnit] = useState<"km" | "mi">("km");
  const sp = useSearchParams();
  const spKey = sp?.toString() ?? '';
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const nameFromParams = useMemo(() => {
    const params = new URLSearchParams(spKey);
    return params.get('name') ?? '';
  }, [spKey]);
  const [searchValue, setSearchValue] = useState(nameFromParams);
  const [suggestions, setSuggestions] = useState<ChurchPublic[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchBlurTimeoutRef = useRef<number | null>(null);
  const [fitKey, setFitKey] = useState(0);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number; isHighAccuracy: boolean } | null>(null);
  const skipNearbyFetchRef = useRef(false);

  const filters = useMemo<ExplorerFilters>(() => {
    const params = new URLSearchParams(spKey);

    const rawBelief = params.get('belief') || '';
    const beliefParts = rawBelief.split(',').map((s) => s.trim()).filter(Boolean);
    const belief: string | string[] | undefined =
      beliefParts.length === 0 || beliefParts.length === ALL_BELIEFS.length
        ? undefined
        : (beliefParts.length === 1 ? beliefParts[0] : beliefParts);

    const languageCsv = params.get('language') || '';
    const uiLanguages = languageCsv ? languageCsv.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
    const languages = normalizeLanguagesToCodes(uiLanguages);

    const rawName = params.get('name') || '';
    const trimmedName = rawName.trim();
    const q = trimmedName.length > 0 ? trimmedName : undefined;

    const serviceDayCsv = params.get('service_days') || '';
    const service_days = serviceDayCsv ? serviceDayCsv.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
    const service_time_start = params.get('service_time_start') || undefined;
    const service_time_end = params.get('service_time_end') || undefined;

    const programsStr = params.get('programs') || '';
    const programs = programsStr
      ? programsStr.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;

    return {
      belief,
      languages,
      service_days,
      service_time_start,
      service_time_end,
      programs,
      q,
    } satisfies ExplorerFilters;
  }, [spKey]);

  useEffect(() => {
    setSearchValue((prev) => (prev === nameFromParams ? prev : nameFromParams));
  }, [nameFromParams]);

  useEffect(() => {
    const trimmed = searchValue.trim();
    const current = nameFromParams.trim();
    const timer = window.setTimeout(() => {
      if (trimmed === current) return;
      const params = new URLSearchParams(spKey);
      if (trimmed) params.set('name', trimmed);
      else params.delete('name');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [nameFromParams, pathname, router, searchValue, spKey]);

  useEffect(() => {
    const trimmed = searchValue.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }
    let cancelled = false;
    setSuggestionsLoading(true);
    const timer = window.setTimeout(() => {
      (async () => {
        try {
          const page = await searchChurches({
            ...filters,
            q: trimmed,
            limit: 6,
            fields: 'church_id,name,locality,region,country',
          });
          if (cancelled) return;
          setSuggestions(Array.isArray(page.items) ? page.items : []);
        } catch (err) {
          if (!cancelled) {
            console.error('Suggestion fetch failed:', err);
            setSuggestions([]);
          }
        } finally {
          if (!cancelled) setSuggestionsLoading(false);
        }
      })();
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [filters, searchValue]);

  // Haversine distance (km) for robust client-side distance display
  const distanceKm = useCallback((
    a: { lat: number; lng: number } | null,
    b: { lat: number | null; lng: number | null } | null,
  ): number => {
    if (!a || !b || typeof b.lat !== 'number' || typeof b.lng !== 'number') return 0;
    const R = 6371; // km
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);
    const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return R * c;
  }, []);

  // Fetch paginated results when filters change (standard mode)
  useEffect(() => {
    if (searchMode === 'nearby') return;
    let cancelled = false;
    setLoading(true);
    setServerResults([]);
    setServerMeta({ hasMore: false, nextCursor: null });

    (async () => {
      try {
        const page = await searchChurches({
          ...filters,
          limit: DEFAULT_PAGE_SIZE,
        });
        if (cancelled) return;
        setServerResults(Array.isArray(page.items) ? page.items : []);
        setServerMeta({ hasMore: page.hasMore, nextCursor: page.nextCursor });
      } catch (err) {
        if (!cancelled) {
          console.error('Search fetch failed:', err);
          setServerResults([]);
          setServerMeta({ hasMore: false, nextCursor: null });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filters, searchMode]);

  // Refetch nearby results when filters or location change while in nearby mode
  useEffect(() => {
    if (searchMode !== 'nearby' || !userLocation) return;
    if (skipNearbyFetchRef.current) {
      skipNearbyFetchRef.current = false;
      return;
    }
    let cancelled = false;
    setLoading(true);
    setNearbyMeta({ hasMore: false, nextCursor: null });

    (async () => {
      try {
        const radiusForRpcKm = unit === "km" ? radiusKm : radiusKm * 1.60934;
        const page = await fetchNearbyChurches(
          userLocation.lat,
          userLocation.lng,
          radiusForRpcKm,
          DEFAULT_PAGE_SIZE,
          filters,
        );
        if (cancelled) return;
        const recomputed = page.items.map((r) => ({
          ...r,
          distance_km: distanceKm(userLocation, { lat: r.latitude as number | null, lng: r.longitude as number | null }),
        }));
        setNearbyResults(recomputed);
        setNearbyMeta({ hasMore: page.hasMore, nextCursor: page.nextCursor });
      } catch (err) {
        if (!cancelled) {
          console.error('Nearby fetch failed:', err);
          setNearbyResults([]);
          setNearbyMeta({ hasMore: false, nextCursor: null });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filters, searchMode, userLocation, radiusKm, unit, distanceKm]);

  const onLocated = useCallback(
    async ({ lat, lng, accuracy, isHighAccuracy }: { lat: number; lng: number; accuracy: number; isHighAccuracy: boolean }) => {
      setUserLocation({ lat, lng, accuracy, isHighAccuracy });
      setLoading(true);
      try {
        const radiusForRpcKm = unit === "km" ? radiusKm : radiusKm * 1.60934;
        const page = await fetchNearbyChurches(lat, lng, radiusForRpcKm, DEFAULT_PAGE_SIZE, filters);
        const recomputed = page.items.map((r) => ({
          ...r,
          distance_km: distanceKm({ lat, lng }, { lat: r.latitude as number | null, lng: r.longitude as number | null }),
        }));
        setNearbyResults(recomputed);
        setNearbyMeta({ hasMore: page.hasMore, nextCursor: page.nextCursor });
        skipNearbyFetchRef.current = true;
        setSearchMode('nearby');
        try {
          sessionStorage.setItem('cf_search_mode', 'nearby');
          sessionStorage.setItem('cf_nearby_results', JSON.stringify(recomputed));
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
    [radiusKm, unit, filters, distanceKm]
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
          setNearbyMeta({ hasMore: false, nextCursor: null });
        }
      }
    } catch {}
  }, []);

  useEffect(() => () => {
    if (searchBlurTimeoutRef.current != null) {
      window.clearTimeout(searchBlurTimeoutRef.current);
    }
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

const formatDenomination = (denom?: string | null) => {
  if (!denom) return null;
  return denom
    .split(/\s+|_|-/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

  const scrollToResult = useCallback((churchId?: string | null) => {
    if (!churchId) return;
    if (typeof window === 'undefined') return;
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        document.getElementById(`church-card-${churchId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    });
  }, []);

  const clearSearch = useCallback(() => {
    if (searchBlurTimeoutRef.current != null) {
      window.clearTimeout(searchBlurTimeoutRef.current);
      searchBlurTimeoutRef.current = null;
    }
    setSearchValue('');
    setSuggestions([]);
    setSuggestionsOpen(false);
    const params = new URLSearchParams(spKey);
    params.delete('name');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, [pathname, router, spKey]);

  const handleSuggestionSelect = useCallback((suggestion: ChurchPublic) => {
    if (searchBlurTimeoutRef.current != null) {
      window.clearTimeout(searchBlurTimeoutRef.current);
      searchBlurTimeoutRef.current = null;
    }
    const name = (suggestion?.name || '').trim();
    if (!name) return;
    setSearchValue(name);
    setSuggestionsOpen(false);
    if (suggestion?.church_id) {
      router.push(`/church/${suggestion.church_id}`);
      return;
    }
    const params = new URLSearchParams(spKey);
    params.set('name', name);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    requestAnimationFrame(() => {
      scrollToResult(suggestion?.church_id ?? null);
    });
  }, [pathname, router, scrollToResult, spKey]);

  const showSuggestions = suggestionsOpen && searchValue.trim().length >= 2;

  const resultsKey = useMemo(() => {
    const list = searchMode === 'nearby' ? nearbyResults : serverResults;
    const n = list.length
    if (n === 0) return '0'
    const first = list[0]?.church_id || ''
    const last = list[n - 1]?.church_id || ''
    return `${n}:${first}:${last}`
  }, [nearbyResults, searchMode, serverResults])

  const activeName = filters.q;

  

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
      ministry_names: Array.isArray((r as { ministry_names?: string[] }).ministry_names) ? (r as { ministry_names?: string[] }).ministry_names as string[] : null,
      denomination: r.denomination ?? null,
      service_languages: Array.isArray(r.service_languages) ? r.service_languages : null,
      service_times: Array.isArray(r.service_times) ? r.service_times : null,
      belief_type: (r.belief_type as NearbyChurch['belief_type']) ?? null,
    }));
  }, [baseResults, nearbyResults, searchMode]);

  const handleLoadMore = useCallback(async () => {
    if (searchMode === 'nearby') {
      if (!nearbyMeta.hasMore || !nearbyMeta.nextCursor || !userLocation) return;
      setLoadingMore(true);
      try {
        const radiusForRpcKm = unit === "km" ? radiusKm : radiusKm * 1.60934;
        const page = await fetchNearbyChurches(
          userLocation.lat,
          userLocation.lng,
          radiusForRpcKm,
          DEFAULT_PAGE_SIZE,
          filters,
          nearbyMeta.nextCursor,
        );
        const recomputed = page.items.map((r) => ({
          ...r,
          distance_km: distanceKm(userLocation, { lat: r.latitude as number | null, lng: r.longitude as number | null }),
        }));
        setNearbyResults((prev) => [...prev, ...recomputed]);
        setNearbyMeta({ hasMore: page.hasMore, nextCursor: page.nextCursor });
      } catch (err) {
        console.error('Nearby pagination failed:', err);
      } finally {
        setLoadingMore(false);
      }
      return;
    }

    if (!serverMeta.hasMore || !serverMeta.nextCursor) return;
    setLoadingMore(true);
    try {
      const page = await searchChurches({
        ...filters,
        limit: DEFAULT_PAGE_SIZE,
        cursor: serverMeta.nextCursor,
      });
      const incoming = Array.isArray(page.items) ? page.items : [];
      setServerResults((prev) => [...prev, ...incoming]);
      setServerMeta({ hasMore: page.hasMore, nextCursor: page.nextCursor });
    } catch (err) {
      console.error('Search pagination failed:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [searchMode, nearbyMeta, userLocation, unit, radiusKm, filters, distanceKm, serverMeta]);

  const canLoadMore = searchMode === 'nearby' ? nearbyMeta.hasMore : serverMeta.hasMore;

  const selectedServiceDays = useMemo(() => {
    const raw = sp?.get('service_days') || '';
    const set = new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
    return set;
  }, [sp]);

  const resultsFiltered: NearbyChurch[] = useMemo(() => {
    const startParam = sp?.get('service_time_start');
    const endParam = sp?.get('service_time_end');
    const startM = parseTimeParam(startParam);
    const endM = parseTimeParam(endParam);

    // Denomination filter (CSV list)
    const denomCsv = sp?.get('denomination') || '';
    const denomSelected = denomCsv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.toLowerCase());

    const timeDayActive = selectedServiceDays.size > 0 || startM != null || endM != null;
    const denomActive = denomSelected.length > 0;
    if (!timeDayActive && !denomActive) return results;

    const norm = (s?: string | null) =>
      (s ? String(s).toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() : '');

    return results.filter((r) => {
      // Denomination check
      let denomOk = true;
      if (denomActive) {
        const rd = norm((r as unknown as { denomination?: string | null }).denomination ?? null);
        denomOk = rd.length > 0 && denomSelected.some((sel) => {
          const selNorm = sel.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
          return rd === selNorm || rd.includes(selNorm) || selNorm.includes(rd);
        });
      }

      // Service day/time check
      let timeOk = true;
      if (timeDayActive) {
        const arr = Array.isArray((r as { service_times?: number[] }).service_times)
          ? ((r as { service_times?: number[] }).service_times as number[])
          : [];
        if (arr.length === 0) return false;
        let anyMatch = false;
        for (const n of arr) {
          const day = DAY_NAMES[minutesToDayIndex(n)];
          const timeOfDay = ((n % 1440) + 1440) % 1440;
          const dayOk = selectedServiceDays.size === 0 || selectedServiceDays.has(day);
          const inRange = inTimeRange(timeOfDay, startM, endM);
          if (dayOk && inRange) { anyMatch = true; break; }
        }
        timeOk = anyMatch;
      }

      return denomOk && timeOk;
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
    admin_status: null,
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
      <div className="flex flex-col items-center gap-4">
        <div className="w-full sm:w-[500px]">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              ref={searchInputRef}
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                if (!suggestionsOpen) setSuggestionsOpen(true);
              }}
              onFocus={() => {
                if (searchBlurTimeoutRef.current != null) {
                  window.clearTimeout(searchBlurTimeoutRef.current);
                  searchBlurTimeoutRef.current = null;
                }
                setSuggestionsOpen(true);
              }}
              onBlur={() => {
                searchBlurTimeoutRef.current = window.setTimeout(() => {
                  setSuggestionsOpen(false);
                }, 120);
              }}
              placeholder="Search by church name..."
              className="h-11 pl-9 pr-9"
              aria-label="Search churches by name"
            />
            {searchValue.trim().length > 0 && (
              <button
                type="button"
                aria-label="Clear search input"
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200"
                onMouseDown={(event) => {
                  event.preventDefault();
                  clearSearch();
                }}
              >
                <X size={16} />
              </button>
            )}
            {showSuggestions && (
              <div className="absolute left-0 right-0 top-full z-[1100] mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                {suggestionsLoading && (
                  <div className="px-4 py-2 text-sm text-gray-500">Searching...</div>
                )}
                {!suggestionsLoading && suggestions.length === 0 && (
                  <div className="px-4 py-2 text-sm text-gray-500">No matches yet</div>
                )}
                {!suggestionsLoading && suggestions.length > 0 && (
                  <ul className="max-h-64 overflow-auto py-1" role="listbox">
                    {suggestions.map((item) => {
                      const locationLabel = [item.locality, item.region, item.country]
                        .map((part) => (part ? String(part) : ''))
                        .filter(Boolean)
                        .join(', ');
                      return (
                        <li key={`suggestion-${item.church_id ?? item.name}`}>
                          <button
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              handleSuggestionSelect(item);
                            }}
                            className="flex w-full flex-col gap-0.5 px-4 py-2 text-left hover:bg-gray-50"
                          >
                            <span className="text-sm font-medium text-gray-900">{item.name}</span>
                            {locationLabel && (
                              <span className="text-xs text-gray-500">{locationLabel}</span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
        {activeName && (
          <button
            type="button"
            onClick={clearSearch}
            className="inline-flex h-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Clear search
          </button>
        )}
      </div>

      <p className="text-sm text-gray-600 text-center">or search to find churches near you:</p>

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
            <DenominationFilter />
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
            onClick={() => {
              setSearchMode('initial');
              setNearbyResults([]);
              setNearbyMeta({ hasMore: false, nextCursor: null });
            }}
          >
            Show All Churches
          </button>
        )}
      </div>

      {/* Map mirrors current filters/search results – always shown below the button */}
      <div className="h-[420px] w-full rounded-xl overflow-hidden border">
        <ChurchMap pins={mapPins} fitKey={fitKey} disableViewportFetch={true} userLocation={userLocation} />
      </div>
      <p className="text-center text-sm italic text-gray-600">
        Searches are currently limited to 100 results per page because the API proxy and database edge functions enforce cursor-based pagination to keep response payloads reasonable and predictable.
      </p>

      {activeName && (
        <p className="text-center text-sm text-gray-600">
          {loading ? 'Searching...' : `Showing ${resultsFiltered.length} churches matching "${activeName}"`}
        </p>
      )}

      {/* Results list */}
      {(
        <>
          {loading && (
            <div className="text-sm text-gray-600 text-center">Loading churches...</div>
          )}

          <ul className="space-y-3">
            {resultsFiltered.map((r, idx) => {
              const languages = Array.isArray(r.service_languages) ? r.service_languages : [];
              const languageNames = formatLanguages(languages);
              const beliefPretty = formatBelief(r.belief_type ?? null);
              const denomPretty = formatDenomination((r as { denomination?: string | null }).denomination ?? null);
              const ministriesRaw = Array.isArray((r as { ministry_names?: string[] }).ministry_names)
                ? ((r as { ministry_names?: string[] }).ministry_names as string[])
                : (Array.isArray((r as { programs_offered?: string[] }).programs_offered)
                  ? ((r as { programs_offered?: string[] }).programs_offered as string[])
                  : []);
              const ministries = ministriesRaw.map((s) => String(s)).filter(Boolean);
              let times = formatServiceTimes((r as { service_times?: number[] }).service_times as number[] | undefined);
              if (selectedServiceDays.size > 0) {
                times = times.filter((t) => selectedServiceDays.has(t.day));
              }
              const startM = parseTimeParam(sp?.get('service_time_start'));
              const endM = parseTimeParam(sp?.get('service_time_end'));
              if (startM != null || endM != null) {
                times = times.filter((t) => inTimeRange(((t.minutes % 1440) + 1440) % 1440, startM, endM));
              }
              // Link to profile when we have an id
              return (
                <li
                  key={`${r.church_id || 'no-id'}-${idx}`}
                  id={r.church_id ? `church-card-${r.church_id}` : undefined}
                  className="rounded-lg border bg-white"
                >
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
                              {denomPretty && (
                                <span className="inline-flex items-center rounded-md bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap">
                                  {denomPretty}
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

                          {ministries.length > 0 && (
                            <div className="mt-1 flex items-center gap-1 flex-wrap">
                              {ministries.slice(0, 3).map((m, i) => (
                                <span key={`${r.church_id}-min-${i}`} className="inline-flex items-center rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap">
                                  {m}
                                </span>
                              ))}
                              {ministries.length > 3 && (
                                <span className="text-[10px] text-gray-500 whitespace-nowrap">
                                  +{ministries.length - 3} more in profile
                                </span>
                              )}
                            </div>
                          )}

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
                              {denomPretty && (
                                <span className="inline-flex items-center rounded-md bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap">
                                  {denomPretty}
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

                          {ministries.length > 0 && (
                            <div className="mt-1 flex items-center gap-1 flex-wrap">
                              {ministries.slice(0, 3).map((m, i) => (
                                <span key={`noid-min-${i}`} className="inline-flex items-center rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap">
                                  {m}
                                </span>
                              ))}
                              {ministries.length > 3 && (
                                <span className="text-[10px] text-gray-500 whitespace-nowrap">
                                  +{ministries.length - 3} more in profile
                                </span>
                              )}
                            </div>
                          )}

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

          {!loading && canLoadMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading more...' : 'Load more churches'}
              </Button>
            </div>
          )}

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
