import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE, computeToken, safeEqual } from '@/lib/auth'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: '' }))
  const expected = process.env.DASHBOARD_PASSWORD

  if (!expected) {
    return NextResponse.json({ error: 'DASHBOARD_PASSWORD is not configured' }, { status: 500 })
  }
  if (typeof password !== 'string' || !safeEqual(password, expected)) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
  }

  const token = await computeToken()
  const res = NextResponse.json({ ok: true })
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })
  return res
}
