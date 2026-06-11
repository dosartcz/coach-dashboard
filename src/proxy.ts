import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE, computeToken, safeEqual } from '@/lib/auth'

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public paths
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/img') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  const cookie = req.cookies.get(AUTH_COOKIE)?.value
  if (cookie) {
    const expected = await computeToken()
    if (safeEqual(cookie, expected)) return NextResponse.next()
  }

  // API → 401, pages → redirect to /login
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = req.nextUrl.clone()
  url.pathname = '/login'
  url.search = ''
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
