import { NextRequest, NextResponse } from 'next/server'
import { getDb, ensureSchema } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema()
  const { id } = await params
  const type = req.nextUrl.searchParams.get('type') ?? 'opening'
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM lineups WHERE match_id = ? AND type = ?',
    args: [id, type],
  })
  if (!result.rows[0]) return NextResponse.json({ slots: null })
  return NextResponse.json({ slots: JSON.parse(result.rows[0].slots_json as string) })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema()
  const { id } = await params
  const db = getDb()
  const { type, slots } = await req.json()

  if (!type || !slots) {
    return NextResponse.json({ error: 'type and slots required' }, { status: 400 })
  }

  await db.execute({
    sql: `INSERT INTO lineups (match_id, type, slots_json, updated_at)
          VALUES (?, ?, ?, datetime('now'))
          ON CONFLICT(match_id, type)
          DO UPDATE SET slots_json = excluded.slots_json, updated_at = datetime('now')`,
    args: [id, type, JSON.stringify(slots)],
  })
  return NextResponse.json({ ok: true })
}
