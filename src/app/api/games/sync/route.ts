import { NextResponse } from 'next/server'
import { syncGames } from '@/lib/sync'

export async function POST() {
  const result = await syncGames()
  return NextResponse.json(result)
}
