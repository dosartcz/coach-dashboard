import { NextResponse } from 'next/server'
import { getDb, ensureSchema } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  await ensureSchema()
  const db = getDb()

  // Return cached value if we have it
  const cached = await db.execute({ sql: 'SELECT birthdate FROM player_bio WHERE player_id = ?', args: [id] })
  if (cached.rows.length > 0) {
    return NextResponse.json({ birthdate: cached.rows[0].birthdate as string })
  }

  // Fetch from HockeyTech
  try {
    const url = `https://lscluster.hockeytech.com/feed/?feed=statviewfeed&view=player&player_id=${id}&key=2589e0f644b1bb71&client_code=kijhl&site_id=2&league_id=1&lang=en&fmt=json`
    const res = await fetch(url, { next: { revalidate: 0 } })
    const text = await res.text()
    const json = JSON.parse(text.replace(/^\(/, '').replace(/\)$/, ''))
    const birthdate: string | null = json.info?.birthDate ?? null

    if (birthdate) {
      await db.execute({ sql: 'INSERT OR REPLACE INTO player_bio (player_id, birthdate) VALUES (?, ?)', args: [id, birthdate] })
    }

    return NextResponse.json({ birthdate })
  } catch {
    return NextResponse.json({ birthdate: null })
  }
}
