import { NextResponse } from 'next/server'
import { fetchRoster, fetchPlayerStats } from '@/lib/hockeytech'
import { getDb, ensureSchema } from '@/lib/db'
import type { PlayerStats, RosterPlayer } from '@/types/hockey'

export async function GET() {
  const teamId = process.env.TEAM_ID!

  const [rosterData, statsData] = await Promise.all([
    fetchRoster(teamId),
    fetchPlayerStats(teamId),
  ])

  await ensureSchema()
  const db = getDb()
  const settingsResult = await db.execute('SELECT player_id, position_override, status FROM player_settings')
  const overrides = new Map<string, { position_override: string | null; status: string | null }>(
    settingsResult.rows.map((r) => [r.player_id as string, { position_override: r.position_override as string | null, status: r.status as string | null }])
  )

  const sections = rosterData.roster[0].sections
  const statsMap = new Map<string, PlayerStats>(
    statsData[0].sections[0].data.map((d: { row: PlayerStats }) => [d.row.player_id, d.row])
  )

  const players: (RosterPlayer & { position_override: string | null; status: string | null })[] = sections.flatMap(
    (s: { data: Array<{ row: RosterPlayer }> }) =>
      s.data.map((d) => {
        const st = statsMap.get(d.row.player_id)
        const settings = overrides.get(d.row.player_id)
        return {
          ...d.row,
          gp: st?.games_played,
          g: st?.goals,
          a: st?.assists,
          pts: st?.points,
          pim: st?.penalty_minutes,
          position_override: settings?.position_override ?? null,
          status: settings?.status ?? null,
        }
      })
  )

  return NextResponse.json(players)
}
