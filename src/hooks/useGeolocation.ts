// src/hooks/useGeolocation.ts
import { useCallback, useEffect, useState } from "react";

type GeoState = {
  coords: { lat: number; lng: number } | null;
  loading: boolean;
  error: string | null;
};

export function useGeolocation(options: PositionOptions = { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }) {
  const [state, setState] = useState<GeoState>({ coords: null, loading: false, error: null });

  const request = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState({ coords: null, loading: false, error: "Geolocation not supported by this browser." });
      return;
    }
    setState(s => ({ ...s, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setState({ coords: { lat: latitude, lng: longitude }, loading: false, error: null });
      },
      (err) => {
        setState({ coords: null, loading: false, error: err.message || "Unable to get location." });
      },
      options
    );
  }, [options]);

  return { ...state, request };
}