import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabaseServerClient';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // OAuth flow sends `code`, magic link sends `token_hash` + `type`
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  // Determine where to redirect after successful auth
  const redirect = searchParams.get('redirect');
  const destination = redirect && redirect.startsWith('/') ? redirect : '/dashboard';

  const url = request.nextUrl.clone();
  url.pathname = destination;
  url.searchParams.delete('code');
  url.searchParams.delete('token_hash');
  url.searchParams.delete('type');
  url.searchParams.delete('redirect');

  const response = NextResponse.redirect(url);

  if (code) {
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[auth/callback] exchangeCodeForSession error:', error.message, error);
      console.error('[auth/callback] request cookies:', request.cookies.getAll().map(c => c.name));
      const errorUrl = request.nextUrl.clone();
      errorUrl.pathname = '/signin';
      errorUrl.searchParams.set('error', 'Unable to complete sign in. Please try again.');
      return NextResponse.redirect(errorUrl);
    }
  } else if (tokenHash && type) {
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'magiclink' | 'email',
    });
    if (error) {
      console.error('[auth/callback] verifyOtp error:', error.message, { type, tokenHash: tokenHash.slice(0, 8) + '...' });
      const errorUrl = request.nextUrl.clone();
      errorUrl.pathname = '/signin';
      errorUrl.searchParams.set('error', 'Unable to verify sign-in link. It may have expired. Please try again.');
      return NextResponse.redirect(errorUrl);
    }
  } else {
    console.warn('[auth/callback] No code or token_hash in callback URL. Params:', Object.fromEntries(searchParams));
  }

  return response;
}
