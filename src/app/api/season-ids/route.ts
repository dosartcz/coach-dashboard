import { NextResponse } from 'next/server'
import { fetchSeasonIds } from '@/lib/hockeytech'

export async function GET() {
  const ids = await fetchSeasonIds()
  return NextResponse.json(ids)
}
