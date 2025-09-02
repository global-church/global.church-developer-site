// src/hooks/useGeolocation.ts
import { useCallback, useState } from "react";

type GeoState = {
  coords: { lat: number; lng: number } | null;
  loading: boolean;
  error: string | null;
  accuracy: number | null;
  isHighAccuracy: boolean | null;
};

export function useGeolocation(options: PositionOptions = { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }) {
  const [state, setState] = useState<GeoState>({ coords: null, loading: false, error: null, accuracy: null, isHighAccuracy: null });

  const request = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState({ coords: null, loading: false, error: "Geolocation not supported by this browser.", accuracy: null, isHighAccuracy: null });
      return;
    }
    setState(s => ({ ...s, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const { accuracy } = pos.coords;
        setState({ coords: { lat: latitude, lng: longitude }, loading: false, error: null, accuracy: typeof accuracy === 'number' ? accuracy : null, isHighAccuracy: true });
      },
      (err) => {
        // If permission denied, fail immediately without retry
        if (err.code === 1) {
          const message = "Permission denied. Please enable location services in your browser and system settings.";
          setState({ coords: null, loading: false, error: message, accuracy: null, isHighAccuracy: null });
          return;
        }

        // If position unavailable or timeout, retry with low accuracy
        if (err.code === 2 || err.code === 3) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude, accuracy } = pos.coords;
              setState({ coords: { lat: latitude, lng: longitude }, loading: false, error: null, accuracy: typeof accuracy === 'number' ? accuracy : null, isHighAccuracy: false });
            },
            (retryErr) => {
              let retryMessage: string;
              switch (retryErr.code) {
                case 1: // PERMISSION_DENIED
                  retryMessage = "Permission denied. Please enable location services in your browser and system settings.";
                  break;
                case 2: // POSITION_UNAVAILABLE
                  retryMessage = "Location unavailable. Your position could not be determined, which can happen if you are indoors or have a poor network connection.";
                  break;
                case 3: // TIMEOUT
                  retryMessage = "Location request timed out. Please try again.";
                  break;
                default:
                  retryMessage = retryErr.message || "An unknown error occurred.";
              }
              setState({ coords: null, loading: false, error: retryMessage, accuracy: null, isHighAccuracy: null });
            },
            { ...options, enableHighAccuracy: false }
          );
          return;
        }

        // For any other errors, fall back to the original message mapping
        const message = err.message || "An unknown error occurred.";
        setState({ coords: null, loading: false, error: message, accuracy: null, isHighAccuracy: null });
      },
      options
    );
  }, [options]);

  return { ...state, request };
}