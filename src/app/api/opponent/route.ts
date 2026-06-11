import { NextRequest, NextResponse } from 'next/server'
import { fetchPlayerStats, fetchRoster } from '@/lib/hockeytech'
import type { PlayerStats, RosterPlayer } from '@/types/hockey'

export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get('teamId')
  if (!teamId) return NextResponse.json({ error: 'teamId required' }, { status: 400 })

  try {
    const [statsData, rosterData] = await Promise.all([
      fetchPlayerStats(teamId),
      fetchRoster(teamId),
    ])

    const players: PlayerStats[] = statsData[0].sections[0].data.map(
      (d: { row: PlayerStats }) => d.row
    )

    const rosterSections = rosterData.roster[0].sections
    const rosterPlayers: RosterPlayer[] = rosterSections.flatMap(
      (s: { data: Array<{ row: RosterPlayer }> }) => s.data.map((d) => d.row)
    )

    return NextResponse.json({
      players,
      roster: rosterPlayers,
      teamLogo: rosterData.teamLogo,
      seasonName: rosterData.seasonName,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch opponent data' }, { status: 500 })
  }
}
