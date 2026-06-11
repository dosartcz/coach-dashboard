import { NextRequest, NextResponse } from 'next/server'
import { fetchPlayerStats } from '@/lib/hockeytech'
import type { PlayerStats } from '@/types/hockey'

export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get('teamId') ?? process.env.TEAM_ID!
  const season = req.nextUrl.searchParams.get('season') ?? undefined
  try {
    const data = await fetchPlayerStats(teamId, season)
    const rows: PlayerStats[] = data[0].sections[0].data.map(
      (d: { row: PlayerStats }) => d.row
    )
    return NextResponse.json({ players: rows })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 })
  }
}
