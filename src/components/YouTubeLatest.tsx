// src/components/YouTubeLatest.tsx

'use client';

import { useEffect, useState } from 'react';

type VideoItem = {
  videoId: string;
  title: string;
  url: string;
  published?: string;
  thumbnail: string;
  thumbnailFallback: string;
};

export default function YouTubeLatest({ youtubeUrl, max = 6 }: { youtubeUrl: string; max?: number }) {
  const [items, setItems] = useState<VideoItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/youtube/latest?youtube_url=${encodeURIComponent(youtubeUrl)}&max=${max}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load videos');
        if (!cancelled) setItems(data.items);
      } catch (e: any) {
        if (!cancelled) setErr(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [youtubeUrl, max]);

  if (err) return <div className="text-red-600 text-sm">YouTube: {err}</div>;
  if (!items) return <div className="text-gray-500 text-sm">Loading latest videos…</div>;
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map(v => (
        <a
          key={v.videoId}
          href={v.url}
          target="_blank"
          rel="noreferrer"
          className="group rounded-2xl overflow-hidden shadow hover:shadow-lg transition"
        >
          <div className="aspect-video bg-black">
            <img
              src={v.thumbnail}
              alt={v.title}
              loading="lazy"
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = v.thumbnailFallback; }}
            />
          </div>
          <div className="p-3">
            <div className="text-sm font-medium line-clamp-2 group-hover:underline">{v.title}</div>
            {v.published && (
              <div className="text-xs text-gray-500 mt-1">{new Date(v.published).toLocaleDateString()}</div>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}