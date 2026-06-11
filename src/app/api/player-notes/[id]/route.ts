import { NextRequest, NextResponse } from 'next/server'
import { getDb, ensureSchema } from '@/lib/db'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema()
  const { id } = await params
  const db = getDb()
  await db.execute({ sql: 'DELETE FROM player_notes WHERE id = ?', args: [id] })
  return NextResponse.json({ ok: true })
}
