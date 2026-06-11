import { NextRequest, NextResponse } from 'next/server'
import { getDb, ensureSchema } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema()
  const { id } = await params
  const db = getDb()
  const result = await db.execute({ sql: 'SELECT * FROM games WHERE id = ?', args: [id] })
  if (!result.rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(result.rows[0])
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema()
  const { id } = await params
  const db = getDb()
  const body = await req.json()
  const { date, opponent_name, opponent_team_id, home_away, notes } = body

  await db.execute({
    sql: `UPDATE games SET date=?, opponent_name=?, opponent_team_id=?, home_away=?, notes=? WHERE id=?`,
    args: [date, opponent_name, opponent_team_id ?? null, home_away, notes ?? null, id],
  })
  const row = await db.execute({ sql: 'SELECT * FROM games WHERE id = ?', args: [id] })
  return NextResponse.json(row.rows[0])
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema()
  const { id } = await params
  const db = getDb()
  await db.execute({ sql: 'DELETE FROM games WHERE id = ?', args: [id] })
  return NextResponse.json({ ok: true })
}
