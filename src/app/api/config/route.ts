import { OUR_TEAM_ID } from '@/lib/hockeytech'
import { NextResponse } from 'next/server'

/** Client-side config — non-secret values needed by browser components. */
export async function GET() {
  return NextResponse.json({ teamId: OUR_TEAM_ID })
}
