// src/components/InteractiveGlobe.tsx

'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Minus } from 'lucide-react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';
import { Feature } from 'geojson';
import { searchChurchesGeoJSON } from '@/lib/zuplo';

// Globe zoom limits (altitude). Tweak these to adjust min/max zoom.
const MIN_GLOBE_ALTITUDE = 1.7; // closer (zoomed in)
const MAX_GLOBE_ALTITUDE = 3;   // farther (zoomed out)
// Scroll zoom tuning
const WHEEL_ZOOM_SENSITIVITY = 0.007; // higher = faster zoom per tick (default was 0.0015)
const WHEEL_ZOOM_ANIM_MS = 120;        // shorter animation for snappier response (was 200)

type ChurchPoint = {
  lat: number;
  lng: number;
  id: string;
  name: string;
  locality?: string | null;
  region?: string | null;
  country?: string;
};

export default function InteractiveGlobe() {
  const router = useRouter();
  const globeRef = useRef<GlobeMethods>(null!);
  const containerRef = useRef<HTMLDivElement>(null);
  const [countries, setCountries] = useState<{ features: Feature[] }>({ features: [] });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [churchPoints, setChurchPoints] = useState<ChurchPoint[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoveredPoint = useMemo(() => churchPoints.find(p => p.id === hoveredId) || null, [churchPoints, hoveredId]);
  const [globeReady, setGlobeReady] = useState(false);
  // removed unused ref from earlier iteration

  // Fetch data and set initial globe view
  useEffect(() => {
    fetch('/custom.geo.json')
      .then((res) => res.json())
      .then(setCountries)
      .catch(err => console.error("Failed to fetch GeoJSON:", err));

    // Fetch a sample of churches as GeoJSON for globe pins
    // Limit payload to essential fields for performance
    searchChurchesGeoJSON({
      // Avoid fields projection; some backends may error when mixing with format
      limit: 3000,
    })
      .then((fc) => {
        const pts: ChurchPoint[] = [];
        for (const f of fc.features ?? []) {
          if (!f || !f.geometry || f.geometry.type !== 'Point') continue;
          const coords = (f.geometry.coordinates ?? []) as unknown as [number, number];
          const lng = Number(coords[0]);
          const lat = Number(coords[1]);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
          const props = (f.properties ?? {}) as Record<string, unknown>;
          const id = String(props.church_id ?? props.id ?? `${lng}:${lat}`);
          const name = String(props.name ?? 'Church');
          const locality = (props.locality as string | null) ?? null;
          const region = (props.region as string | null) ?? null;
          const country = (props.country as string | null) ?? undefined;
          pts.push({ lat, lng, id, name, locality, region, country });
        }
        setChurchPoints(pts);
      })
      .catch((err) => {
        console.error('Failed to fetch churches for globe:', err);
        setChurchPoints([]);
      });

    // Controls are initialized when the globe reports ready (see effect below)
  }, []);

  // Initialize controls when the Globe is actually ready
  useEffect(() => {
    if (!globeReady) return;
    const globe = globeRef.current;
    if (!globe) return;

    // Center over Europe by default at max altitude
    globe.pointOfView({ lat: 50, lng: 10, altitude: MAX_GLOBE_ALTITUDE });

    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1; // clearly visible (~30s/rev is 2.0)
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.enableZoom = true; // allow zoom via buttons (and wheel if desired)
    controls.enableRotate = true; // ensure user can spin the globe

    const stopOnStart = () => { controls.autoRotate = false; };
    controls.addEventListener?.('start', stopOnStart);

    // Desktop-only: reverse wheel zoom direction (scroll down zooms in)
    const isDesktop = typeof window !== 'undefined'
      && window.matchMedia?.('(pointer: fine)').matches
      && !('ontouchstart' in window);

    let wheelHandler: ((e: WheelEvent) => void) | null = null;
    let prevEnableZoom: boolean | null = null;
    let domEl: HTMLElement | null = null;
    if (isDesktop) {
      // Disable OrbitControls wheel zoom to avoid double handling
      prevEnableZoom = controls.enableZoom;
      controls.enableZoom = false;

      const renderer = (globe as unknown as { renderer?: () => THREE.WebGLRenderer }).renderer?.();
      domEl = renderer?.domElement || (containerRef.current as unknown as HTMLElement | null);

      if (domEl) {
        wheelHandler = (e: WheelEvent) => {
          // Reverse: positive deltaY (scroll down) should zoom IN (decrease altitude)
          const pov = (globe.pointOfView() as unknown as { lat: number; lng: number; altitude: number }) || { lat: 0, lng: 0, altitude: MAX_GLOBE_ALTITUDE };
          const currentAlt = pov.altitude;

          const delta = e.deltaY;
          if (!Number.isFinite(delta) || delta === 0) return; // let it bubble

          const scale = Math.exp(Math.abs(delta) * WHEEL_ZOOM_SENSITIVITY);

          // If delta > 0 (scroll down) => zoom in => smaller altitude
          const nextAlt = delta > 0 ? currentAlt / scale : currentAlt * scale;
          const clamped = Math.max(MIN_GLOBE_ALTITUDE, Math.min(MAX_GLOBE_ALTITUDE, nextAlt));

          // If clamped equals currentAltitude and user is pushing further in same direction, allow page scroll
          const pushingIn = delta > 0; // towards MIN
          const pushingOut = delta < 0; // towards MAX
          const atMin = currentAlt <= MIN_GLOBE_ALTITUDE + 1e-4;
          const atMax = currentAlt >= MAX_GLOBE_ALTITUDE - 1e-4;
          if ((atMin && pushingIn) || (atMax && pushingOut) || clamped === currentAlt) {
            return; // do not prevent default; let page handle scroll
          }

          e.preventDefault();
          e.stopPropagation();
          globe.pointOfView({ lat: pov.lat, lng: pov.lng, altitude: clamped }, WHEEL_ZOOM_ANIM_MS);
        };
        domEl.addEventListener('wheel', wheelHandler, { passive: false });
      }
    }

    let rafId = 0;
    const tick = () => {
      try { controls.update?.(); } catch { /* no-op */ }
      rafId = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      controls.removeEventListener?.('start', stopOnStart);
      if (wheelHandler && domEl) {
        domEl.removeEventListener('wheel', wheelHandler as EventListener);
      }
      if (prevEnableZoom !== null) {
        controls.enableZoom = prevEnableZoom;
      }
      cancelAnimationFrame(rafId);
    };
  }, [globeReady]);

  // Helpers to zoom by adjusting POV altitude smoothly
  const zoomToAltitude = (targetAlt: number) => {
    const globe = globeRef.current;
    if (!globe) return;
    const pov = (globe.pointOfView() as unknown as { lat: number; lng: number; altitude: number }) || { lat: 0, lng: 0, altitude: MAX_GLOBE_ALTITUDE };
    const next = { lat: pov.lat, lng: pov.lng, altitude: Math.max(MIN_GLOBE_ALTITUDE, Math.min(MAX_GLOBE_ALTITUDE, targetAlt)) };
    globe.pointOfView(next, 600);
  };

  const handleZoomIn = () => {
    const globe = globeRef.current;
    if (!globe) return;
    const pov = (globe.pointOfView() as unknown as { altitude: number }) || { altitude: MAX_GLOBE_ALTITUDE };
    zoomToAltitude(pov.altitude * 0.8);
  };

  const handleZoomOut = () => {
    const globe = globeRef.current;
    if (!globe) return;
    const pov = (globe.pointOfView() as unknown as { altitude: number }) || { altitude: MAX_GLOBE_ALTITUDE };
    zoomToAltitude(pov.altitude * 1.25);
  };

  // Handle resizing the globe to fit its container
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Set initial size

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Memoize the globe material to avoid re-creation
  const globeMaterial = useMemo(() => {
    const material = new THREE.MeshPhongMaterial();
    material.color = new THREE.Color('#27374D'); // Darker base for globe sphere
    material.transparent = true;
    material.opacity = 0.6;
    return material;
  }, []);

  // Rainbow color coding per country (stable mapping)
  const colorForPoint = (p: ChurchPoint): string => {
    const key = (p.country || p.id || '').toString();
    // Deterministic simple hash → hue
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 131 + key.charCodeAt(i)) >>> 0;
    const hue = hash % 360; // full rainbow
    const saturation = 50; // lower saturation for pastel feel
    const lightness = 70; // higher lightness for softer colors
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  return (
    // This container defines the size of the globe canvas
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-visible"
    >
      {/* Only render the Globe component if data is loaded and dimensions are set */}
      {countries.features.length > 0 && dimensions.width > 0 && (
        <Globe
          ref={globeRef}
          onGlobeReady={() => setGlobeReady(true)}
          width={dimensions.width}
          height={dimensions.height}
          globeMaterial={globeMaterial}
          backgroundColor="rgba(0,0,0,0)" // Transparent background
          polygonsData={countries.features}
          polygonCapColor={() => '#9DB2BF'} // Color of the landmasses
          polygonSideColor={() => 'rgba(0,0,0,0)'}
          polygonStrokeColor={() => '#526D82'} // Border color of countries
          // Church pins
          pointsData={churchPoints}
          pointLat={(d) => (d as ChurchPoint).lat}
          pointLng={(d) => (d as ChurchPoint).lng}
          pointColor={(d) => colorForPoint(d as ChurchPoint)}
          pointAltitude={(d) => ((d as ChurchPoint).id === hoveredId ? 0.1 : 0.06)}
          pointRadius={(d) => ((d as ChurchPoint).id === hoveredId ? 0.18 : 0.12)}
          pointResolution={6}
          pointsMerge={false}
          // Disable default browser tooltip; we'll render a custom sleek label
          pointLabel={() => ''}
          onPointHover={(d) => setHoveredId(d ? (d as ChurchPoint).id : null)}
          onPointClick={(d) => {
            const p = d as ChurchPoint;
            if (p && p.id) {
              router.push(`/church/${p.id}`);
            }
          }}

          // Sleek hover label as anchored HTML element
          htmlElementsData={hoveredPoint ? [hoveredPoint] : []}
          htmlLat={(d) => (d as ChurchPoint).lat}
          htmlLng={(d) => (d as ChurchPoint).lng}
          htmlAltitude={() => 0.11}
          htmlElement={(d) => {
            const p = d as ChurchPoint;
            const el = document.createElement('div');
            el.textContent = p.name;
            el.style.pointerEvents = 'none';
            el.style.transform = 'translate(-50%, -120%)';
            el.style.padding = '6px 10px';
            el.style.borderRadius = '9999px';
            el.style.background = 'rgba(17, 24, 39, 0.7)'; // slate-900/70
            el.style.color = '#fff';
            el.style.fontSize = '12px';
            el.style.fontWeight = '600';
            el.style.letterSpacing = '0.01em';
            el.style.backdropFilter = 'blur(2px)';
            el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.25)';
            el.style.whiteSpace = 'nowrap';
            return el;
          }}
        />
      )}
      {/* Zoom Controls */}
      <div className="pointer-events-auto absolute right-3 top-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="Zoom in"
          className="rounded-full bg-white/80 text-gray-900 shadow-lg ring-1 ring-white/50 hover:bg-white backdrop-blur px-2 py-2 transition-transform hover:scale-105"
        >
          <Plus size={18} />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Zoom out"
          className="rounded-full bg-white/80 text-gray-900 shadow-lg ring-1 ring-white/50 hover:bg-white backdrop-blur px-2 py-2 transition-transform hover:scale-105"
        >
          <Minus size={18} />
        </button>
      </div>
    </div>
  );
}