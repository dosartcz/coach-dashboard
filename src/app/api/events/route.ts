import { NextRequest, NextResponse } from 'next/server'
import { getDb, ensureSchema } from '@/lib/db'

export async function GET(req: NextRequest) {
  await ensureSchema()
  const db = getDb()
  const month = req.nextUrl.searchParams.get('month') // YYYY-MM

  if (month) {
    const result = await db.execute({
      sql: `SELECT * FROM events WHERE date LIKE ? ORDER BY date, time`,
      args: [`${month}%`],
    })
    return NextResponse.json(result.rows)
  }

  const result = await db.execute('SELECT * FROM events ORDER BY date, time')
  return NextResponse.json(result.rows)
}

export async function POST(req: NextRequest) {
  await ensureSchema()
  const db = getDb()
  const { date, time, title, type, notes, match_id } = await req.json()

  if (!date || !title) {
    return NextResponse.json({ error: 'date and title required' }, { status: 400 })
  }

  const result = await db.execute({
    sql: 'INSERT INTO events (date, time, title, type, notes, match_id) VALUES (?, ?, ?, ?, ?, ?)',
    args: [date, time ?? null, title, type ?? 'other', notes ?? null, match_id ?? null],
  })
  const id = Number(result.lastInsertRowid)
  const row = await db.execute({ sql: 'SELECT * FROM events WHERE id = ?', args: [id] })
  return NextResponse.json(row.rows[0], { status: 201 })
}
