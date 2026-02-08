import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabaseServerClient';

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
  '/login', // redirects to /signin
  '/reset-password',
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next({ request });

  // Skip static files and API routes (except auth callback)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.')
  ) {
    return response;
  }

  const supabase = createSupabaseMiddlewareClient(request, response);

  // Refresh session — important for Supabase SSR cookie management
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes and dynamic church pages pass through
  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith('/church/')) {
    return response;
  }

  // Protected: /dashboard/*
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/signin';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Protected: /admin/*
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/signin';
      return NextResponse.redirect(url);
    }
    // Fine-grained role checks happen at the page level
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
