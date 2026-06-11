import { NextRequest, NextResponse } from 'next/server'
import { getDb, ensureSchema } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema()
  const { id } = await params
  const db = getDb()
  const { date, time, title, type, notes, match_id } = await req.json()

  await db.execute({
    sql: 'UPDATE events SET date=?, time=?, title=?, type=?, notes=?, match_id=? WHERE id=?',
    args: [date, time ?? null, title, type ?? 'other', notes ?? null, match_id ?? null, id],
  })
  const row = await db.execute({ sql: 'SELECT * FROM events WHERE id = ?', args: [id] })
  return NextResponse.json(row.rows[0])
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema()
  const { id } = await params
  const db = getDb()
  await db.execute({ sql: 'DELETE FROM events WHERE id = ?', args: [id] })
  return NextResponse.json({ ok: true })
}
