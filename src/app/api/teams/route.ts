import { NextResponse } from 'next/server'
import { fetchTeams, OUR_TEAM_ID } from '@/lib/hockeytech'

export const revalidate = 86400

export async function GET() {
  const teams = await fetchTeams()
  // Exclude own team
  const filtered = teams.filter((t) => t.id !== OUR_TEAM_ID)
  return NextResponse.json(filtered)
}
