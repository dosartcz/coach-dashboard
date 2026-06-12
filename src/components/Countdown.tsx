'use client'
import { useState, useEffect } from 'react'

/**
 * Epoch millis for a date+time interpreted in America/Vancouver (BC),
 * regardless of the viewer's local timezone.
 */
function bcEpoch(date: string, time: string): number {
  const naive = new Date(`${date}T${time}`)
  const asVancouver = new Date(naive.toLocaleString('en-US', { timeZone: 'America/Vancouver' }))
  return naive.getTime() + (naive.getTime() - asVancouver.getTime())
}

/** Countdown to puck drop. Renders nothing once the game has started. */
export default function Countdown({ date, time }: { date: string; time?: string | null }) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now()) // client-only — avoids SSR hydration mismatch
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  if (now === null) return null

  const raw = time ?? '19:00:00'
  const normalized = raw.length === 5 ? `${raw}:00` : raw
  const target = bcEpoch(date, normalized)
  const diff = target - now
  if (diff <= 0) return null

  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor((diff % 86_400_000) / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)

  return (
    <p className="text-grizzly-gold text-sm font-bold tabular-nums mt-2">
      Puck drop in {d > 0 ? `${d}d ` : ''}{h}h {m}m
    </p>
  )
}
