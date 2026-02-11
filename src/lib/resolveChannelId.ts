// src/lib/resolveChannelId.ts
import { classifyYouTubeUrl } from './youtube';

const HEADERS = {
  'User-Agent':
    // Modern desktop UA reduces chance of bot/consent interstitials
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

type FetchedPage = { html: string | null; finalUrl: string | null };

async function fetchPage(url: string): Promise<FetchedPage> {
  try {
    const res = await fetch(url, { headers: HEADERS, redirect: 'follow' as const });
    if (!res.ok) return { html: null, finalUrl: res.url || null };
    const html = await res.text();
    return { html, finalUrl: res.url || url };
  } catch {
    return { html: null, finalUrl: null };
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
    const { html } = await fetchPage(url);
    if (!html) continue;

    // Some consent pages are short and won't contain UC ids; skip those
    if (html.length < 2000 && /consent|enable\-javascript|cookies/i.test(html)) continue;

    const ucid = extractUCidFromHtml(html);
    if (ucid) return ucid;
  }
  return null;
}

function extractHandleFromHtml(html: string): string | null {
  const patterns = [
    /"canonicalBaseUrl":"\/( @[A-Za-z0-9._-]+)"/, // we'll normalize spaces below
    /<link rel="canonical" href="https?:\/\/(?:www\.)?youtube\.com\/(@[A-Za-z0-9._-]+)"/,
    /"handle":"(@[A-Za-z0-9._-]+)"/,
    /<meta property="og:url" content="https?:\/\/(?:www\.)?youtube\.com\/(@[A-Za-z0-9._-]+)"/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) {
      const handleWithAt = (m[2] ?? m[1]) as string | undefined;
      if (handleWithAt) return handleWithAt.replace(/\s+/g, '').replace(/^@?/, '@');
    }
  }
  // Fallback: search for \/@handle occurrences
  const m = html.match(/\/@([A-Za-z0-9._-]+)/);
  if (m) return `@${m[1]}`;
  return null;
}

function extractVanitySlugsFromHtml(html: string): Set<string> {
  const lower = html.toLowerCase();
  const slugs = new Set<string>();
  const patterns: RegExp[] = [
    /"vanityChannelUrl"\s*:\s*"\\\/c\\\/([a-z0-9._-]+)"/g,
    /"vanityChannelUrl"\s*:\s*"\/c\/([a-z0-9._-]+)"/g,
    /"customUrl"\s*:\s*"([a-z0-9._-]+)"/g,
    /<link rel="canonical" href="https?:\/\/(?:www\.)?youtube\.com\/c\/([a-z0-9._-]+)"/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(lower)) !== null) {
      if (m[1]) slugs.add(m[1]);
    }
  }
  return slugs;
}

async function tryUrlsWithExpectedHandle(urls: string[], expectedHandle: string | null, expectedSlug?: string | null): Promise<string | null> {
  const expectedLower = expectedHandle?.toLowerCase() ?? null;
  const slugLower = expectedSlug ? expectedSlug.toLowerCase() : null;
  for (const url of urls) {
    const { html, finalUrl } = await fetchPage(url);
    if (!html) continue;
    if (html.length < 2000 && /consent|enable\-javascript|cookies/i.test(html)) continue;

    // If redirect landed on an explicit handle path, prefer validating against it quickly
    if (expectedLower && finalUrl) {
      try {
        const u = new URL(finalUrl);
        const path = u.pathname || '';
        const match = path.match(/\/@([A-Za-z0-9._-]+)/);
        if (match) {
          const handleFromUrlNoAt = match[1].toLowerCase();
          const expectedNoAt = expectedLower.replace(/^@/, '').toLowerCase();
          if (handleFromUrlNoAt !== expectedNoAt) {
            continue; // mismatched redirect
          }
        }
      } catch {
        // ignore URL parse issues
      }
    }

    const ucid = extractUCidFromHtml(html);
    if (!ucid) continue;

    // For custom (/c/<slug>) inputs, if we don't have an expected handle, require a strong slug signal
    if (!expectedLower && slugLower) {
      // If the page exposes a handle, require that it at least contains the slug to reduce cross-channel redirects
      const pageHandle = extractHandleFromHtml(html);
      if (pageHandle) {
        const handleNoAt = pageHandle.toLowerCase().replace(/^@/, '');
        if (!handleNoAt.includes(slugLower)) {
          // The resolved channel's handle does not resemble the provided custom slug → reject
          continue;
        }
      }

      const slugs = extractVanitySlugsFromHtml(html);
      if (!slugs.has(slugLower)) {
        // As a second attempt, verify channel's About page explicitly lists the vanity/custom URL
        const channelCheck = await fetchPage(`https://www.youtube.com/channel/${ucid}/about`);
        if (!channelCheck.html) continue;
        const aboutSlugs = extractVanitySlugsFromHtml(channelCheck.html);
        if (!aboutSlugs.has(slugLower)) continue;
      }
      return ucid;
    }

    if (!expectedLower) return ucid; // no validation requested and no slug constraint

    const handle = extractHandleFromHtml(html);
    const expectedNoAt = expectedLower.replace(/^@/, '').toLowerCase();
    if (handle && handle.toLowerCase().replace(/^@/, '') === expectedNoAt) {
      return ucid; // matches the expected handle
    }

    // If the page we landed on doesn't clearly show the handle, perform a second validation round-trip
    // against the channel page derived from UCID to confirm its canonical handle matches expectation.
    const channelCheck = await fetchPage(`https://www.youtube.com/channel/${ucid}/about`);
    if (channelCheck.html) {
      const handle2 = extractHandleFromHtml(channelCheck.html);
      if (handle2 && handle2.toLowerCase().replace(/^@/, '') === expectedNoAt) {
        return ucid;
      }
    }
    // Otherwise reject and continue candidates
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
    const { html } = await fetchPage(data.author_url);
    return html ? extractUCidFromHtml(html) : null;
  } catch {
    return null;
  }
}

/** Resolve any youtube_url to a UC… channelId without an API key. */
export async function getChannelIdFromAnyYouTubeUrl(youtubeUrl: string): Promise<string | null> {
  const { kind, idOrPath } = classifyYouTubeUrl(youtubeUrl);

  // Reject non-YouTube URLs to prevent SSRF
  if (kind === 'unknown') return null;

  // Direct channel id
  if (kind === 'channel') return idOrPath;

  // Handle / user / custom pages (and things like /@handle/streams or /videos)
  if (kind === 'handle' || kind === 'user' || kind === 'custom') {
    const slug = idOrPath; // e.g., "stecimedia"
    const handle = baseHandlePath(idOrPath); // e.g., "@stecimedia"
    const candidates = [
      // Handle-based
      `https://www.youtube.com/${handle}`,
      `https://www.youtube.com/${handle}/about`,
      `https://www.youtube.com/${handle}/videos`,
      `https://www.youtube.com/${handle}/streams`,
      `https://m.youtube.com/${handle}`,
      `https://m.youtube.com/${handle}/about`,
      `https://m.youtube.com/${handle}/videos`,
      `https://m.youtube.com/${handle}/streams`,
      // Legacy user-based
      `https://www.youtube.com/user/${slug}`,
      `https://www.youtube.com/user/${slug}/about`,
      `https://www.youtube.com/user/${slug}/videos`,
      `https://www.youtube.com/user/${slug}/streams`,
      `https://m.youtube.com/user/${slug}`,
      `https://m.youtube.com/user/${slug}/about`,
      `https://m.youtube.com/user/${slug}/videos`,
      `https://m.youtube.com/user/${slug}/streams`,
      // Legacy custom /c/
      `https://www.youtube.com/c/${slug}`,
      `https://www.youtube.com/c/${slug}/about`,
      `https://www.youtube.com/c/${slug}/videos`,
      `https://www.youtube.com/c/${slug}/streams`,
      `https://m.youtube.com/c/${slug}`,
      `https://m.youtube.com/c/${slug}/about`,
      `https://m.youtube.com/c/${slug}/videos`,
      `https://m.youtube.com/c/${slug}/streams`,
    ];
    const expected = kind === 'handle' ? handle : null; // only validate for explicit handle; user/custom may not match
    const ucid = await tryUrlsWithExpectedHandle(candidates, expected, slug);
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
  if (kind === 'handle') {
    return await tryUrlsWithExpectedHandle(lastResort, baseHandlePath(idOrPath));
  }
  if (kind === 'custom') {
    return await tryUrlsWithExpectedHandle(lastResort, null, idOrPath);
  }
  return await tryUrls(lastResort);
}