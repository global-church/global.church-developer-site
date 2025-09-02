// src/components/NearMeButton.tsx
"use client";
import { useEffect } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";

export function NearMeButton({ onLocated, label }: { onLocated: (coords: {lat:number; lng:number; accuracy: number; isHighAccuracy: boolean}) => void; label?: string }) {
  const { coords, accuracy, isHighAccuracy, loading, error, request } = useGeolocation();

  useEffect(() => {
    if (coords && typeof accuracy === 'number' && typeof isHighAccuracy === 'boolean') {
      onLocated({ lat: coords.lat, lng: coords.lng, accuracy, isHighAccuracy });
    }
  }, [coords, accuracy, isHighAccuracy, onLocated]);

  return (
    <div className="flex items-center gap-2">
      <button className="px-3 py-2 rounded bg-primary text-white" onClick={request} disabled={loading}>
        {loading ? "Locating…" : (label ?? "Use my location")}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}