import { NextRequest } from 'next/server'

const ALLOWED_HOST = 'assets.leaguestat.com'

/**
 * Image proxy — avoids CORS issues when html-to-image fetches external URLs.
 * ?id=123456   → proxies https://assets.leaguestat.com/kijhl/240x240/123456.jpg
 * ?path=kijhl/logos/19.jpg → proxies https://assets.leaguestat.com/kijhl/logos/19.jpg
 */
export async function GET(req: NextRequest) {
  let remoteUrl: string

  const id = req.nextUrl.searchParams.get('id')
  const path = req.nextUrl.searchParams.get('path')

  if (id) {
    if (!/^\d+$/.test(id)) return new Response('Invalid id', { status: 400 })
    remoteUrl = `https://${ALLOWED_HOST}/kijhl/240x240/${id}.jpg`
  } else if (path) {
    // Sanitise: no leading slash, no "..", only safe chars
    if (!/^[\w/.\-]+$/.test(path) || path.includes('..')) {
      return new Response('Invalid path', { status: 400 })
    }
    remoteUrl = `https://${ALLOWED_HOST}/${path}`
  } else {
    return new Response('Missing id or path', { status: 400 })
  }

  try {
    const res = await fetch(remoteUrl, { next: { revalidate: 86400 } })
    if (!res.ok) return new Response('Not found', { status: 404 })
    const buf = await res.arrayBuffer()
    return new Response(buf, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new Response('Failed', { status: 502 })
  }
}
