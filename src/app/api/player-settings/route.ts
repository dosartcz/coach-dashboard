import { NextRequest, NextResponse } from 'next/server'
import { getDb, ensureSchema } from '@/lib/db'

export async function GET(req: NextRequest) {
  await ensureSchema()
  const playerId = req.nextUrl.searchParams.get('playerId')
  if (!playerId) return NextResponse.json({ error: 'playerId required' }, { status: 400 })
  const db = getDb()
  const result = await db.execute({ sql: 'SELECT * FROM player_settings WHERE player_id = ?', args: [playerId] })
  return NextResponse.json(result.rows[0] ?? null)
}

export async function PUT(req: NextRequest) {
  await ensureSchema()
  const body = await req.json()
  const { player_id } = body
  if (!player_id) return NextResponse.json({ error: 'player_id required' }, { status: 400 })
  const db = getDb()

  if ('position_override' in body) {
    const val = body.position_override || null
    await db.execute({
      sql: `INSERT INTO player_settings (player_id, position_override)
            VALUES (?, ?)
            ON CONFLICT(player_id) DO UPDATE SET position_override = excluded.position_override`,
      args: [player_id, val],
    })
  }

  if ('status' in body) {
    const val = body.status || null
    await db.execute({
      sql: `INSERT INTO player_settings (player_id, status)
            VALUES (?, ?)
            ON CONFLICT(player_id) DO UPDATE SET status = excluded.status`,
      args: [player_id, val],
    })
  }

  return NextResponse.json({ ok: true })
}
