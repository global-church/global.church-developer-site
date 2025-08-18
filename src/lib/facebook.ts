// src/lib/facebook.ts
type SocialMediaLike =
  | string
  | string[]
  | { [k: string]: string | null | undefined }
  | null
  | undefined;

/** Returns a normalized Facebook Page URL (https) or null. */
export function getFacebookPageUrl(social_media: SocialMediaLike): string | null {
  const collect = (val: unknown): string[] => {
    if (!val) return [];
    if (typeof val === 'string') return [val];
    if (Array.isArray(val)) return val.filter((x): x is string => typeof x === 'string');
    if (typeof val === 'object') {
      return Object.values(val as Record<string, unknown>).filter((x): x is string => typeof x === 'string');
    }
    return [];
  };

  const candidates = collect(social_media)
    .map(s => s.trim())
    .filter(Boolean);

  // Prefer obvious FB domains first
  const byScore = (u: string) => {
    try {
      const url = new URL(u.startsWith('http') ? u : `https://${u}`);
      const host = url.hostname.replace(/^www\./, '');
      if (!['facebook.com', 'm.facebook.com', 'fb.com'].includes(host)) return 0;
      const path = url.pathname.replace(/\/+$/, '');
      if (!path || path === '/') return 0; // require a page-like path
      // Exclude direct post URLs or groups; prefer /<page> or /pages/<page>/<id>
      if (/\/groups\//i.test(url.pathname)) return 1;
      if (/\/people\//i.test(url.pathname)) return 1;
      if (/\/profile\.php/i.test(url.pathname)) return 1;
      if (/\/posts?\//i.test(url.pathname)) return 1;
      return 10;
    } catch {
      return 0;
    }
  };

  const best = candidates
    .sort((a, b) => byScore(b) - byScore(a))
    .find(u => byScore(u) > 0);

  if (!best) return null;

  try {
    const url = new URL(best.startsWith('http') ? best : `https://${best}`);
    // normalize to https://www.facebook.com/…
    const pathname = url.pathname.replace(/\/+$/, ''); // drop trailing slash
    if (!pathname || pathname === '/') return null;
    return `https://www.facebook.com${pathname}`;
  } catch {
    return null;
  }
}