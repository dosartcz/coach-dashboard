import { NextResponse } from 'next/server'
import { getDb, ensureSchema } from '@/lib/db'
import { fetchRoster, OUR_TEAM_ID } from '@/lib/hockeytech'
import type { RosterPlayer } from '@/types/hockey'

export async function GET() {
  await ensureSchema()
  const db = getDb()
  const teamId = OUR_TEAM_ID

  // Build player_id → name map from current roster (cached 1h)
  const rosterData = await fetchRoster(teamId)
  const sections = rosterData.roster[0].sections
  const nameMap = new Map<string, string>()
  for (const section of sections) {
    for (const { row } of section.data as Array<{ row: RosterPlayer }>) {
      nameMap.set(row.player_id, row.name)
    }
  }

  // Cached birthdates for API players
  const bioRows = await db.execute('SELECT player_id, birthdate FROM player_bio WHERE birthdate IS NOT NULL')
  const birthdays: { name: string; birthdate: string }[] = []

  for (const row of bioRows.rows) {
    const name = nameMap.get(row.player_id as string)
    if (name) {
      birthdays.push({ name, birthdate: row.birthdate as string })
    }
  }

  // Manual players with birthdates
  const manualRows = await db.execute('SELECT name, birthdate FROM manual_players WHERE birthdate IS NOT NULL')
  for (const row of manualRows.rows) {
    birthdays.push({ name: row.name as string, birthdate: row.birthdate as string })
  }

  return NextResponse.json(birthdays)
}
