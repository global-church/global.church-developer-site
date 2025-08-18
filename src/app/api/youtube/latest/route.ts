// src/app/api/youtube/latest/route.ts (Next.js App Router)

import { NextResponse } from 'next/server';
import { getChannelIdFromAnyYouTubeUrl } from '@/lib/resolveChannelId';

// tiny RSS parser for YT channel feeds
function parseRss(xml: string) {
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => m[1]);
  return entries.map(entry => {
    const id        = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title     = entry.match(/<title>([^<]+)<\/title>/)?.[1];
    const link      = entry.match(/<link rel="alternate" href="([^"]+)"/)?.[1];
    const published = entry.match(/<published>([^<]+)<\/published>/)?.[1];
    return { id, title, link, published };
  }).filter(v => v.id && v.link);
}

export const revalidate = 0; // we control caching via HTTP headers

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const youtubeUrl = searchParams.get('youtube_url');
  const max = Math.min(parseInt(searchParams.get('max') || '6', 10), 24);

  if (!youtubeUrl) {
    return NextResponse.json({ error: 'youtube_url is required' }, { status: 400 });
  }

  try {
    const channelId = await getChannelIdFromAnyYouTubeUrl(youtubeUrl);
    if (!channelId) {
      const res = NextResponse.json({ error: 'Unable to resolve channelId' }, { status: 404 });
      res.headers.set('Cache-Control', 'public, max-age=300'); // avoid hammering on bad inputs
      return res;
    }

    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const rssRes = await fetch(rssUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!rssRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch channel feed' }, { status: 502 });
    }

    const xml = await rssRes.text();
    const items = parseRss(xml)
      .sort((a, b) => (a.published! < b.published! ? 1 : -1))
      .slice(0, max)
      .map(v => ({
        videoId: v.id!,
        title: v.title!,
        url: v.link!,
        published: v.published,
        thumbnail: `https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg`,
        thumbnailFallback: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
      }));

    const resp = NextResponse.json({ channelId, items });
    // edge cache: 5 minutes fresh, 5 minutes stale-while-revalidate
    resp.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=300');
    return resp;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}