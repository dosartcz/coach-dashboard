import { NextResponse } from 'next/server'
import { fetchTeams } from '@/lib/hockeytech'

export const revalidate = 86400

export async function GET() {
  const teams = await fetchTeams()
  // Exclude own team
  const filtered = teams.filter((t) => t.id !== process.env.TEAM_ID)
  return NextResponse.json(filtered)
}
