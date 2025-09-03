// src/components/GlobeLoader.tsx

'use client';

import dynamic from 'next/dynamic';

const InteractiveGlobe = dynamic(() => import('@/components/InteractiveGlobe'), {
  ssr: false,
  loading: () => <div className="w-full h-[500px]" />, // Optional: a placeholder while the component loads
});

export default function GlobeLoader() {
  return <InteractiveGlobe />;
}