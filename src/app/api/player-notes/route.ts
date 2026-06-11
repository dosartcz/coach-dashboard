import { NextRequest, NextResponse } from 'next/server'
import { getDb, ensureSchema } from '@/lib/db'

export async function GET(req: NextRequest) {
  await ensureSchema()
  const playerId = req.nextUrl.searchParams.get('playerId')
  const db = getDb()

  if (playerId) {
    const result = await db.execute({
      sql: 'SELECT * FROM player_notes WHERE player_id = ? ORDER BY created_at DESC',
      args: [playerId],
    })
    return NextResponse.json(result.rows)
  }

  const result = await db.execute('SELECT * FROM player_notes ORDER BY created_at DESC')
  return NextResponse.json(result.rows)
}

export async function POST(req: NextRequest) {
  await ensureSchema()
  const db = getDb()
  const { player_id, note } = await req.json()

  if (!player_id || !note) {
    return NextResponse.json({ error: 'player_id and note required' }, { status: 400 })
  }

  const result = await db.execute({
    sql: 'INSERT INTO player_notes (player_id, note) VALUES (?, ?)',
    args: [player_id, note],
  })
  const id = Number(result.lastInsertRowid)
  const row = await db.execute({ sql: 'SELECT * FROM player_notes WHERE id = ?', args: [id] })
  return NextResponse.json(row.rows[0], { status: 201 })
}
