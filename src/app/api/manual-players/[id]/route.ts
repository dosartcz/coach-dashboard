import { NextRequest, NextResponse } from 'next/server'
import { getDb, ensureSchema } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema()
  const { id } = await params
  const db = getDb()
  const row = await db.execute({ sql: 'SELECT * FROM manual_players WHERE id = ?', args: [id] })
  if (row.rows.length === 0) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(row.rows[0])
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema()
  const { id } = await params
  const db = getDb()
  const { name, position, jersey_number, notes } = await req.json()

  await db.execute({
    sql: 'UPDATE manual_players SET name=?, position=?, jersey_number=?, notes=? WHERE id=?',
    args: [name, position, jersey_number ?? null, notes ?? null, id],
  })
  const row = await db.execute({ sql: 'SELECT * FROM manual_players WHERE id = ?', args: [id] })
  return NextResponse.json(row.rows[0])
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema()
  const { id } = await params
  const db = getDb()
  await db.execute({ sql: 'DELETE FROM manual_players WHERE id = ?', args: [id] })
  return NextResponse.json({ ok: true })
}
