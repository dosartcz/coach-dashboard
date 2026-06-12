import { NextResponse } from 'next/server'
import { getDb, ensureSchema } from '@/lib/db'
import { fetchRoster, OUR_TEAM_ID } from '@/lib/hockeytech'
import type { RosterPlayer } from '@/types/hockey'

export async function POST() {
  await ensureSchema()
  const db = getDb()
  const teamId = OUR_TEAM_ID

  // Get current roster
  const rosterData = await fetchRoster(teamId)
  const sections = rosterData.roster[0].sections
  const playerIds: string[] = []
  for (const section of sections) {
    for (const { row } of section.data as Array<{ row: RosterPlayer }>) {
      playerIds.push(row.player_id)
    }
  }

  // Find which ones are already cached
  const cached = await db.execute('SELECT player_id FROM player_bio WHERE birthdate IS NOT NULL')
  const cachedIds = new Set(cached.rows.map((r) => r.player_id as string))
  const missing = playerIds.filter((id) => !cachedIds.has(id))

  // Fetch missing birthdates in parallel
  let synced = 0
  await Promise.all(
    missing.map(async (id) => {
      try {
        const url = `https://lscluster.hockeytech.com/feed/?feed=statviewfeed&view=player&player_id=${id}&key=2589e0f644b1bb71&client_code=kijhl&site_id=2&league_id=1&lang=en&fmt=json`
        const res = await fetch(url)
        const text = await res.text()
        const json = JSON.parse(text.replace(/^\s*\(/, '').replace(/\)\s*$/, ''))
        const birthdate: string | null = json.info?.birthDate ?? null
        if (birthdate) {
          await db.execute({
            sql: 'INSERT OR REPLACE INTO player_bio (player_id, birthdate) VALUES (?, ?)',
            args: [id, birthdate],
          })
          synced++
        }
      } catch {
        // skip player on error
      }
    })
  )

  return NextResponse.json({ synced, skipped: playerIds.length - missing.length, total: playerIds.length })
}
