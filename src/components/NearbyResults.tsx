// src/components/NearbyResults.tsx
"use client";
import { useState, useCallback } from "react";
import { MapPin, ChevronRight } from "lucide-react";
import { NearMeButton } from "./NearMeButton";
import { fetchNearbyChurches, NearbyChurch } from "@/lib/nearMe";

export default function NearbyResults() {
  const [results, setResults] = useState<NearbyChurch[]>([]);
  const [loading, setLoading] = useState(false);
  const [radiusKm, setRadiusKm] = useState(25);
  const [unit, setUnit] = useState<"km" | "mi">("km");

  const onLocated = useCallback(
    async ({ lat, lng }: { lat: number; lng: number }) => {
      setLoading(true);
      try {
        const radiusForRpcKm = unit === "km" ? radiusKm : radiusKm * 1.60934;
        const data = await fetchNearbyChurches(lat, lng, radiusForRpcKm, 50);
        setResults(data);
      } catch (e: unknown) {
        console.error(e);
        alert("Sorry, we couldn’t load nearby churches.");
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

  // Prefer the RPC's service_languages (string[]) but retain a light fallback to services_info if present.
  const extractLanguages = (church: NearbyChurch & { services_info?: string | null }): string[] => {
    const langsFromRpc: string[] = Array.isArray(church.service_languages)
      ? church.service_languages.map((s) => String(s).trim()).filter(Boolean)
      : [];

    if (langsFromRpc.length > 0) return langsFromRpc;

    // Fallback for older data shape where services_info may exist and contain "English: ..." etc.
    if (typeof church.services_info === "string" && church.services_info.length > 0) {
      try {
        const parsed = JSON.parse(church.services_info);
        const items: string[] = Array.isArray(parsed)
          ? parsed.map((v) => String(v))
          : typeof parsed === "string"
          ? [parsed]
          : [];
        const set = new Set<string>();
        const re = /^\s*([^:]+):\s*/; // grab everything before first colon
        for (const item of items) {
          const m = String(item).match(re);
          if (m && m[1]) set.add(m[1].trim());
        }
        return Array.from(set);
      } catch {
        // ignore parsing errors
      }
    }

    return [];
  };

  const formatBelief = (belief?: NearbyChurch['belief_type'] | null) => {
    if (!belief) return null;
    // Pretty-print values like "roman_catholic" -> "Roman Catholic"
    return belief
      .split("_")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-center gap-3">
        <NearMeButton onLocated={onLocated} />
        <label className="text-sm flex items-center gap-2">
          Radius ({unit})
          <input
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

      {loading && (
        <div className="text-sm text-gray-600 text-center">
          Loading nearby churches…
        </div>
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
                      {/* Badges row */}
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
    </section>
  );
}