import { NextResponse } from 'next/server';

const SESSION_COOKIE_PREFIX = '__Host-kaizen_session=';
const SESSION_CHECK_TIMEOUT_MS = 2000;

export const config = {
  matcher: [
    '/today',
    '/quests',
    '/habits',
    '/progress',
    '/profile',
    '/settings',
    '/onboarding',
  ],
};

/**
 * @param {import('next/server').NextRequest} request
 * @returns {Promise<import('next/server').NextResponse>}
 */
export async function proxy(request) {
  const matches = request.headers
    .get('cookie')
    ?.split(';')
    .map((cookie) => cookie.trim())
    .filter((cookie) => cookie.startsWith(SESSION_COOKIE_PREFIX));
  const cookie = matches?.length === 1 ? matches[0] : undefined;
  const origin = process.env.API_INTERNAL_ORIGIN;
  let verified = false;

  if (cookie && cookie !== SESSION_COOKIE_PREFIX && origin) {
    try {
      const sessionEndpoint = new URL('/api/v1/auth/session', origin);
      const response = await fetch(sessionEndpoint, {
        method: 'GET',
        headers: { cookie },
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(SESSION_CHECK_TIMEOUT_MS),
      });
      verified = response.status === 200;
      void response.body?.cancel().catch(() => {});
    } catch {
      // Express is the authority even when its session endpoint is unavailable.
    }
  }

  const response = verified
    ? NextResponse.next()
    : NextResponse.redirect(new URL('/login', request.url));
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
