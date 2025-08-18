// src/lib/resolveChannelId.ts
import { classifyYouTubeUrl } from './youtube';

const HEADERS = {
  'User-Agent':
    // Modern desktop UA reduces chance of bot/consent interstitials
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: HEADERS, redirect: 'follow' as const });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractUCidFromHtml(html: string): string | null {
  // Try several patterns observed across YT variants
  const patterns = [
    /"channelId":"(UC[0-9A-Za-z_-]{22})"/,
    /"externalId":"(UC[0-9A-Za-z_-]{22})"/,
    /"browseId":"(UC[0-9A-Za-z_-]{22})"/,
    /<meta itemprop="channelId" content="(UC[0-9A-Za-z_-]{22})">/,
    /<link rel="canonical" href="https?:\/\/(www\.)?youtube\.com\/channel\/(UC[0-9A-Za-z_-]{22})"/,
    /content="https?:\/\/(www\.)?youtube\.com\/channel\/(UC[0-9A-Za-z_-]{22})"/, // og:url variants
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (!m) continue;
    // match group might be at 1 or 2 depending on pattern
    const uc = m[2] ?? m[1];
    if (uc) return uc;
  }
  return null;
}

async function tryUrls(urls: string[]): Promise<string | null> {
  for (const url of urls) {
    const html = await fetchText(url);
    if (!html) continue;

    // Some consent pages are short and won't contain UC ids; skip those
    if (html.length < 2000 && /consent|enable\-javascript|cookies/i.test(html)) continue;

    const ucid = extractUCidFromHtml(html);
    if (ucid) return ucid;
  }
  return null;
}

function baseHandlePath(idOrPath: string): string {
  // idOrPath looks like "@handle[/something]"; keep only "@handle"
  const first = idOrPath.split('/')[0];
  return first.startsWith('@') ? first : `@${first}`;
}

async function resolveViaOEmbed(originalUrl: string): Promise<string | null> {
  try {
    const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(originalUrl)}&format=json`;
    const res = await fetch(oembed, { headers: HEADERS });
    if (!res.ok) return null;
    const data = (await res.json()) as { author_url?: string };
    if (!data?.author_url) return null;
    const html = await fetchText(data.author_url);
    return html ? extractUCidFromHtml(html) : null;
  } catch {
    return null;
  }
}

/** Resolve any youtube_url to a UC… channelId without an API key. */
export async function getChannelIdFromAnyYouTubeUrl(youtubeUrl: string): Promise<string | null> {
  const { kind, idOrPath } = classifyYouTubeUrl(youtubeUrl);

  // Direct channel id
  if (kind === 'channel') return idOrPath;

  // Handle / user pages (and things like /@handle/streams or /videos)
  if (kind === 'handle' || kind === 'user') {
    const handle = baseHandlePath(idOrPath); // "@allsoulsepiscopalarlingtontx"
    const candidates = [
      `https://www.youtube.com/${handle}`,
      `https://www.youtube.com/${handle}/about`,
      `https://www.youtube.com/${handle}/videos`,
      `https://www.youtube.com/${handle}/streams`,
      `https://m.youtube.com/${handle}`,
      `https://m.youtube.com/${handle}/about`,
    ];
    const ucid = await tryUrls(candidates);
    if (ucid) return ucid;
    // fallthrough to last resort attempts
  }

  // Individual video or playlist → oEmbed → author_url → channel html
  if (kind === 'video' || kind === 'playlist') {
    const ucid = await resolveViaOEmbed(youtubeUrl);
    if (ucid) return ucid;
  }

  // Last-ditch: just try the provided URL and any obvious base variants
  const lastResort = [
    youtubeUrl,
    youtubeUrl.replace(/\/(streams|videos|about)\/?$/, ''),
  ];
  return await tryUrls(lastResort);
}