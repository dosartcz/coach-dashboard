import { NextRequest, NextResponse } from 'next/server'
import { getDb, ensureSchema } from '@/lib/db'

/**
 * Partial update of a game's result fields.
 * Accepts any of: home_score, away_score, overtime, shootout, final, result_photo.
 * Used for manual result entry (API delays) and the Final Score image photo.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema()
  const { id } = await params
  const db = getDb()
  const body = await req.json()

  const allowed = ['home_score', 'away_score', 'overtime', 'shootout', 'final', 'result_photo'] as const
  const sets: string[] = []
  const args: (string | number | null)[] = []
  for (const key of allowed) {
    if (key in body) {
      sets.push(`${key} = ?`)
      args.push(body[key] ?? null)
    }
  }
  if (sets.length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  args.push(id)
  await db.execute({ sql: `UPDATE games SET ${sets.join(', ')} WHERE id = ?`, args })
  const row = await db.execute({ sql: 'SELECT * FROM games WHERE id = ?', args: [id] })
  return NextResponse.json(row.rows[0])
}
