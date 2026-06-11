import { NextRequest, NextResponse } from 'next/server'
import { getDb, ensureSchema } from '@/lib/db'

/** Map of player_id → transparent cutout photo (PNG data URL). */
export async function GET() {
  await ensureSchema()
  const db = getDb()
  const result = await db.execute('SELECT player_id, photo FROM player_cutouts')
  const map: Record<string, string> = {}
  for (const row of result.rows) map[String(row.player_id)] = String(row.photo)
  return NextResponse.json(map)
}

export async function PUT(req: NextRequest) {
  await ensureSchema()
  const db = getDb()
  const { player_id, photo } = await req.json()
  if (!player_id || !photo) {
    return NextResponse.json({ error: 'player_id and photo required' }, { status: 400 })
  }
  await db.execute({
    sql: `INSERT INTO player_cutouts (player_id, photo) VALUES (?, ?)
          ON CONFLICT(player_id) DO UPDATE SET photo = excluded.photo, created_at = datetime('now')`,
    args: [player_id, photo],
  })
  return NextResponse.json({ ok: true })
}

/** DELETE ?playerId=… removes one cutout; without a param removes all (forces reprocessing). */
export async function DELETE(req: NextRequest) {
  await ensureSchema()
  const db = getDb()
  const playerId = req.nextUrl.searchParams.get('playerId')
  if (playerId) {
    await db.execute({ sql: 'DELETE FROM player_cutouts WHERE player_id = ?', args: [playerId] })
  } else {
    await db.execute('DELETE FROM player_cutouts')
  }
  return NextResponse.json({ ok: true })
}
