import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = new Set([
  '/',
  '/about',
  '/explorer',
  '/schema',
  '/api-docs',
  '/mcp-server',
  '/faq',
  '/feedback',
  '/methodology',
  '/security-privacy',
  '/request-access',
  '/signin',
  '/signup',
  '/login',
  '/reset-password',
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next({ request });

  // Skip static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.')
  ) {
    return response;
  }

  // Public routes and dynamic church pages pass through
  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith('/church/')) {
    return response;
  }

  // Protected routes: check for Privy auth token cookie
  if (pathname.startsWith('/developer') || pathname.startsWith('/admin')) {
    const privyToken = request.cookies.get('privy-token')?.value;
    const allCookieNames = request.cookies.getAll().map((c) => c.name);
    console.log('[middleware]', pathname, 'privy-token:', privyToken ? 'present' : 'MISSING', 'cookies:', allCookieNames);

    if (!privyToken) {
      const url = request.nextUrl.clone();
      url.pathname = '/signin';
      if (pathname.startsWith('/developer')) {
        url.searchParams.set('redirect', pathname);
      }
      return NextResponse.redirect(url);
    }

    // Token exists — let the page-level auth verify it fully
    // (middleware can't do async Privy verification efficiently;
    //  the server components verify the token and get the user ID)
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
