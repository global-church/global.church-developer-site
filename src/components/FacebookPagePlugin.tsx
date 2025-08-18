// src/components/FacebookPagePlugin.tsx
'use client';

export default function FacebookPagePlugin({
  pageUrl,
  width = 500,
  height = 600,
  tabs = 'timeline',
}: { pageUrl: string; width?: number; height?: number; tabs?: 'timeline' | 'events' | 'messages' | string }) {
  if (!pageUrl) return null;
  const clampedWidth = Math.max(180, Math.min(width, 500));
  const src = `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(
    pageUrl
  )}&tabs=${encodeURIComponent(tabs)}&width=${clampedWidth}&height=${height}&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=false`;
  return (
    <iframe
      title="Facebook Page"
      src={src}
      height={height}
      width={clampedWidth}
      style={{ border: 'none', overflow: 'hidden', display: 'block', margin: '0 auto' }}
      scrolling="no"
      frameBorder={0}
      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
    />
  );
}