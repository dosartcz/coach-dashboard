import { NextRequest, NextResponse } from 'next/server'
import { getDb, ensureSchema } from '@/lib/db'

export async function GET() {
  await ensureSchema()
  const db = getDb()
  const result = await db.execute(`
    SELECT mp.*, ps.position_override, ps.status
    FROM manual_players mp
    LEFT JOIN player_settings ps ON ps.player_id = 'manual-' || mp.id
    ORDER BY mp.name
  `)
  return NextResponse.json(result.rows)
}

export async function POST(req: NextRequest) {
  await ensureSchema()
  const db = getDb()
  const { name, position, jersey_number, notes, photo, birthdate, shoots } = await req.json()

  if (!name || !position) {
    return NextResponse.json({ error: 'name and position required' }, { status: 400 })
  }

  const result = await db.execute({
    sql: 'INSERT INTO manual_players (name, position, jersey_number, notes, photo, birthdate, shoots) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [name, position, jersey_number ?? null, notes ?? null, photo ?? null, birthdate ?? null, shoots ?? null],
  })
  const id = Number(result.lastInsertRowid)
  const row = await db.execute({ sql: 'SELECT * FROM manual_players WHERE id = ?', args: [id] })
  return NextResponse.json(row.rows[0], { status: 201 })
}
