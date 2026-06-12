import { NextResponse } from 'next/server'
import { fetchSchedule, OUR_TEAM_ID } from '@/lib/hockeytech'
import type { Game } from '@/types/hockey'

export async function GET() {
  try {
    const data = await fetchSchedule(OUR_TEAM_ID)
    const games: Game[] = data.SiteKit.Schedule ?? []
    const today = new Date().toISOString().split('T')[0]

    const upcoming = games
      .filter((g) => g.date_played >= today && g.final !== '1')
      .sort((a, b) => a.date_played.localeCompare(b.date_played))

    const past = games
      .filter((g) => g.final === '1')
      .sort((a, b) => b.date_played.localeCompare(a.date_played))

    const nextGame = upcoming[0] ?? null
    const nextOpponentId = nextGame
      ? nextGame.home_team === OUR_TEAM_ID
        ? nextGame.visiting_team
        : nextGame.home_team
      : null

    return NextResponse.json({ upcoming, past, nextGame, nextOpponentId })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 })
  }
}
