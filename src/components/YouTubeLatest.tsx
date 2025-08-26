// src/components/YouTubeLatest.tsx

'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

type VideoItem = {
  videoId: string;
  title: string;
  url: string;
  published?: string;
  thumbnail: string;
  thumbnailFallback: string;
};

export default function YouTubeLatest({ youtubeUrl, max = 6, wrap = false, title = 'YouTube' }: { youtubeUrl: string; max?: number; wrap?: boolean; title?: string }) {
  const [items, setItems] = useState<VideoItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [fallbackMap, setFallbackMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/youtube/latest?youtube_url=${encodeURIComponent(youtubeUrl)}&max=${max}&resolver=2`, { cache: 'no-store' });
        const data: unknown = await res.json();
        if (!res.ok) {
          const message = (typeof data === 'object' && data && 'error' in (data as any) && typeof (data as any).error === 'string') ? (data as any).error : 'Failed to load videos';
          if (res.status === 404 || /Unable to resolve channelId/i.test(String(message))) {
            if (!cancelled) setNotFound(true);
            return;
          }
          throw new Error(message);
        }
        if (!cancelled) setItems((data as { items: VideoItem[] }).items);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        if (!cancelled) setErr(message);
      }
    })();
    return () => { cancelled = true; };
  }, [youtubeUrl, max]);

  if (notFound) return null;
  if (err) return <div className="text-red-600 text-sm">YouTube: {err}</div>;
  if (!items) return <div className="text-gray-500 text-sm">Loading latest videos…</div>;
  if (items.length === 0) return null;

  const grid = (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map(v => (
        <a
          key={v.videoId}
          href={v.url}
          target="_blank"
          rel="noreferrer"
          className="group rounded-2xl overflow-hidden shadow hover:shadow-lg transition"
        >
          <div className="aspect-video bg-black relative">
            <Image
              src={fallbackMap[v.videoId] ? v.thumbnailFallback : v.thumbnail}
              alt={v.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover"
              onError={() => setFallbackMap((m) => ({ ...m, [v.videoId]: true }))}
              priority={false}
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

  if (!wrap) return grid;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3 text-center">{title}</h3>
      {grid}
    </div>
  );
}