import { NextResponse } from 'next/server'

export interface CareerRow {
  season_name: string
  team_name?: string
  games_played: string | number
  goals: string | number
  assists: string | number
  points: string | number
  penalty_minutes: string | number
  power_play_goals: string | number
  short_handed_goals: string | number
}

export interface CareerSection {
  title: string
  data: CareerRow[]
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const url = `https://lscluster.hockeytech.com/feed/?feed=statviewfeed&view=player&player_id=${id}&key=2589e0f644b1bb71&client_code=kijhl&site_id=2&league_id=1&lang=en&fmt=json`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    const text = await res.text()
    const json = JSON.parse(text.replace(/^\s*\(/, '').replace(/\)\s*$/, ''))

    const raw: CareerSection[] = (json.careerStats?.[0]?.sections ?? []).map(
      (s: { title: string; data: Array<{ row: CareerRow }> }) => ({
        title: s.title,
        data: s.data.map((d) => d.row),
      })
    )

    return NextResponse.json(raw)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
