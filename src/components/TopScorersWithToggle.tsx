'use client'
import { useState, useEffect } from 'react'
import type { PlayerStats } from '@/types/hockey'

interface Props {
  teamId: string
  initialPlayers: PlayerStats[]
  regularSeasonId: string | null
  playoffSeasonId: string
}

export default function TopScorersWithToggle({
  teamId,
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
      const res = await fetch(`/api/players?teamId=${teamId}&season=${seasonId}`)
      const data = await res.json()
      const rows: PlayerStats[] = data.players ?? []
      setPlayers(rows.slice(0, 10))
    } catch {
      // keep current
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { key: 'playoff' as const, label: 'Playoff' },
    ...(regularSeasonId ? [{ key: 'regular' as const, label: 'Regular Season' }] : []),
  ]

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-white/50 text-xs font-bold uppercase tracking-wider">Top Scorers</p>
        <div className="flex gap-1">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => switchTo(key)}
              className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${
                active === key
                  ? 'bg-grizzly-gold text-grizzly-navy'
                  : 'bg-white/10 text-white/40 hover:bg-white/20'
              }`}
            >
              {label}
            </button>
          ))}
          {loading && <span className="text-white/20 text-[10px] px-1">…</span>}
        </div>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-white/40">
            <th className="text-left pb-1 font-medium">Player</th>
            <th className="text-center pb-1 font-medium w-8">GP</th>
            <th className="text-center pb-1 font-medium w-8">G</th>
            <th className="text-center pb-1 font-medium w-8">A</th>
            <th className="text-center pb-1 font-medium w-10 text-grizzly-gold">PTS</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.player_id} className="border-t border-white/5">
              <td className="py-1 text-white/80">
                <span className="text-white/40 mr-1">#{p.jersey_number}</span>
                {p.name}
                <span className="text-white/30 ml-1">{p.position}</span>
              </td>
              <td className="text-center text-white/50">{p.games_played}</td>
              <td className="text-center text-white/70">{p.goals}</td>
              <td className="text-center text-white/70">{p.assists}</td>
              <td className="text-center font-bold text-grizzly-gold">{p.points}</td>
            </tr>
          ))}
          {players.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-white/30 text-xs">
                No stats available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
