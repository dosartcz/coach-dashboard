import { NextRequest, NextResponse } from 'next/server'
import { getDb, ensureSchema } from '@/lib/db'
import { autoSyncGames } from '@/lib/sync'

export async function GET() {
  await ensureSchema()
  // Refresh schedule + results from HockeyTech at most once per hour
  await autoSyncGames()
  const db = getDb()
  const result = await db.execute('SELECT * FROM games ORDER BY date DESC')
  return NextResponse.json(result.rows)
}

export async function POST(req: NextRequest) {
  await ensureSchema()
  const db = getDb()
  const body = await req.json()
  const { date, time, opponent_name, opponent_team_id, home_away, notes } = body

  if (!date || !opponent_name) {
    return NextResponse.json({ error: 'date and opponent_name required' }, { status: 400 })
  }

  const result = await db.execute({
    sql: `INSERT INTO games (date, time, opponent_name, opponent_team_id, home_away, type, notes)
          VALUES (?, ?, ?, ?, ?, 'manual', ?)`,
    args: [date, time ?? null, opponent_name, opponent_team_id ?? null, home_away ?? 'home', notes ?? null],
  })
  const id = Number(result.lastInsertRowid)
  const row = await db.execute({ sql: 'SELECT * FROM games WHERE id = ?', args: [id] })
  return NextResponse.json(row.rows[0], { status: 201 })
}
