// src/components/GlobeLoader.tsx

'use client';

import dynamic from 'next/dynamic';
import { forwardRef, Component, type ReactNode, type ErrorInfo } from 'react';
import type { GlobeHandle } from '@/components/InteractiveGlobe';

const InteractiveGlobe = dynamic(() => import('@/components/InteractiveGlobe'), {
  ssr: false,
  loading: () => <div className="w-full h-[500px]" />,
});

/** Catches runtime WebGL errors (e.g. context lost) so the page doesn't blank out. */
class GlobeErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('Globe rendering failed (WebGL):', error, info);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

const GlobeFallback = () => (
  <div className="flex items-center justify-center w-full h-full text-center text-gray-400 text-sm">
    Globe unavailable
  </div>
);

type GlobeLoaderProps = {
  contained?: boolean;
  colorMode?: 'country' | 'belief';
};

const GlobeLoader = forwardRef<GlobeHandle, GlobeLoaderProps>(({ contained = false, colorMode = 'country' }, ref) => {
  const fallback = <GlobeFallback />;

  if (contained) {
    return (
      <div className="relative mx-auto w-full max-w-5xl aspect-square md:aspect-[16/9] max-h-[70vh]">
        <div className="absolute inset-0 w-full h-full">
          <GlobeErrorBoundary fallback={fallback}>
            <InteractiveGlobe ref={ref} colorMode={colorMode} />
          </GlobeErrorBoundary>
        </div>
      </div>
    );
  }

  return (
    // Full-bleed, absolutely centered, no clipping
    <div className="absolute inset-0 overflow-visible pointer-events-auto">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] max-w-[1600px] max-h-[85vh] overflow-visible">
        <div className="absolute inset-0 w-full h-full overflow-visible">
          <GlobeErrorBoundary fallback={fallback}>
            <InteractiveGlobe ref={ref} colorMode={colorMode} />
          </GlobeErrorBoundary>
        </div>
      </div>
    </div>
  );
});

GlobeLoader.displayName = 'GlobeLoader';

export default GlobeLoader;
