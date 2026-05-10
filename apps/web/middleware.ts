import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/sign-in', '/sign-up', '/docs'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith('/docs/')) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api');

  if (isPublic) return NextResponse.next();

  const sessionToken =
    request.cookies.get('better-auth.session_token') ??
    request.cookies.get('__Secure-better-auth.session_token');

  if (!sessionToken) {
    const signIn = new URL('/sign-in', request.url);
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
