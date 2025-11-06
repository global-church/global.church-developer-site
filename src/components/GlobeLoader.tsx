// src/components/GlobeLoader.tsx

'use client';

import dynamic from 'next/dynamic';
import { forwardRef } from 'react';
import type { GlobeHandle } from '@/components/InteractiveGlobe';

const InteractiveGlobe = dynamic(() => import('@/components/InteractiveGlobe'), {
  ssr: false,
  loading: () => <div className="w-full h-[500px]" />, // Optional: a placeholder while the component loads
});

type GlobeLoaderProps = {
  contained?: boolean;
  colorMode?: 'country' | 'belief';
};

const GlobeLoader = forwardRef<GlobeHandle, GlobeLoaderProps>(({ contained = false, colorMode = 'country' }, ref) => {
  if (contained) {
    return (
      <div className="relative mx-auto w-full max-w-5xl aspect-square md:aspect-[16/9] max-h-[70vh]">
        <div className="absolute inset-0 w-full h-full">
          <InteractiveGlobe ref={ref} colorMode={colorMode} />
        </div>
      </div>
    );
  }

  return (
    // Full-bleed, absolutely centered, no clipping
    <div className="absolute inset-0 overflow-visible pointer-events-auto">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] max-w-[1600px] max-h-[85vh] overflow-visible">
        <div className="absolute inset-0 w-full h-full overflow-visible">
          <InteractiveGlobe ref={ref} colorMode={colorMode} />
        </div>
      </div>
    </div>
  );
});

GlobeLoader.displayName = 'GlobeLoader';

export default GlobeLoader;
