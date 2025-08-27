// src/app/api/facebook/validate/route.ts
import { NextResponse } from 'next/server';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

// reserved for future heuristics; keep as a const to avoid unused-var rule
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const looksUnavailable: ((html: string) => boolean) | undefined = undefined;

export const revalidate = 0; // do not cache at the route level; we set Cache-Control manually

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fbUrl = searchParams.get('fb_url');
  if (!fbUrl) {
    return NextResponse.json({ ok: false, reason: 'fb_url required' }, { status: 400 });
  }

  try {
    // Prefer m.facebook.com for simpler HTML that is less likely to be blocked
    let target = fbUrl;
    try {
      const url = new URL(fbUrl);
      const host = url.hostname.replace(/^www\./, '');
      if (host === 'facebook.com' || host === 'm.facebook.com' || host === 'fb.com') {
        url.hostname = 'm.facebook.com';
        target = url.toString();
      }
    } catch {}

    const res = await fetch(target, { headers: HEADERS, redirect: 'follow' as const, cache: 'no-store' });
    // Hard 404/410/403 etc.
    if (!res.ok) {
      const resp = NextResponse.json({ ok: false, status: res.status }, { status: 200 });
      resp.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=600');
      return resp;
    }

    // If we received a successful response, consider it valid.
    // Heuristics can be too aggressive and cause false negatives.
    const resp = NextResponse.json({ ok: true }, { status: 200 });

    // Cache the validation result briefly to avoid hammering Meta
    resp.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=600');
    return resp;
  } catch {
    const resp = NextResponse.json({ ok: false, reason: 'fetch_error' }, { status: 200 });
    resp.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return resp;
  }
}