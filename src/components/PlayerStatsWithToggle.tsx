'use client'
import { useState } from 'react'
import type { PlayerStats } from '@/types/hockey'
import PlayerStatsTable from './PlayerStatsTable'

interface Props {
  initialPlayers: PlayerStats[]
  regularSeasonId: string | null
  playoffSeasonId: string
}

export default function PlayerStatsWithToggle({
  initialPlayers,
  regularSeasonId,
  playoffSeasonId,
}: Props) {
  const [active, setActive] = useState<'playoff' | 'regular'>('playoff')
  const [players, setPlayers] = useState<PlayerStats[]>(initialPlayers)
  const [loading, setLoading] = useState(false)

  async function switchTo(type: 'playoff' | 'regular') {
    if (type === active) return
    setActive(type)
    setLoading(true)
    const seasonId = type === 'regular' ? regularSeasonId : playoffSeasonId
    try {
      const res = await fetch(`/api/players?season=${seasonId}`)
      const data = await res.json()
      setPlayers(data.players ?? [])
    } catch {
      // keep current data on error
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { key: 'playoff' as const, label: 'Playoff' },
    ...(regularSeasonId ? [{ key: 'regular' as const, label: 'Regular Season' }] : []),
  ]

  return (
    <div>
      <div className="flex items-center gap-1 mb-3">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => switchTo(key)}
            className={`text-xs font-bold px-3 py-1 rounded transition-colors ${
              active === key
                ? 'bg-grizzly-gold text-grizzly-navy'
                : 'bg-white/10 text-white/50 hover:bg-white/20'
            }`}
          >
            {label}
          </button>
        ))}
        {loading && <span className="text-white/30 text-xs px-2">Loading…</span>}
      </div>
      <PlayerStatsTable players={players} />
    </div>
  )
}
