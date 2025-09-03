// src/components/InteractiveGlobe.tsx

'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';

export default function InteractiveGlobe() {
  const globeRef = useRef<GlobeMethods | undefined>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [countries, setCountries] = useState<{ features: any[] }>({ features: [] });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Fetch data and set initial globe view
  useEffect(() => {
    fetch('/custom.geo.json')
      .then((res) => res.json())
      .then(setCountries)
      .catch(err => console.error("Failed to fetch GeoJSON:", err));

    const globe = globeRef.current;
    if (globe) {
      globe.pointOfView({ lat: 20, lng: 0, altitude: 2.2 });
      const controls = globe.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4;
      controls.enableZoom = false;
      controls.enablePan = false;
    }
  }, []);

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

  return (
    // This container defines the size of the globe canvas
    <div
      ref={containerRef}
      className="relative w-full max-w-3xl aspect-square mx-auto -mt-12 md:-mt-20"
    >
      {/* Only render the Globe component if data is loaded and dimensions are set */}
      {countries.features.length > 0 && dimensions.width > 0 && (
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          globeMaterial={globeMaterial}
          backgroundColor="rgba(0,0,0,0)" // Transparent background
          polygonsData={countries.features}
          polygonCapColor={() => '#9DB2BF'} // Color of the landmasses
          polygonSideColor={() => 'rgba(0,0,0,0)'}
          polygonStrokeColor={() => '#526D82'} // Border color of countries
        />
      )}
    </div>
  );
}