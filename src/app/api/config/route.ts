import { NextResponse } from 'next/server'

/** Client-side config — non-secret values needed by browser components. */
export async function GET() {
  return NextResponse.json({ teamId: process.env.TEAM_ID! })
}
