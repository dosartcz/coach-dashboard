'use client'
import { useState, useMemo } from 'react'
import type { PlayerStats } from '@/types/hockey'

type SortKey = keyof PlayerStats
type SortDir = 'asc' | 'desc'

const COLS: { key: SortKey; label: string; title: string }[] = [
  { key: 'jersey_number', label: '#', title: 'Jersey' },
  { key: 'name', label: 'Name', title: 'Name' },
  { key: 'position', label: 'Pos', title: 'Position' },
  { key: 'games_played', label: 'GP', title: 'Games Played' },
  { key: 'goals', label: 'G', title: 'Goals' },
  { key: 'assists', label: 'A', title: 'Assists' },
  { key: 'points', label: 'PTS', title: 'Points' },
  { key: 'points_per_game', label: 'Pt/G', title: 'Points per Game' },
  { key: 'power_play_goals', label: 'PPG', title: 'Power Play Goals' },
  { key: 'power_play_assists', label: 'PPA', title: 'Power Play Assists' },
  { key: 'short_handed_goals', label: 'SHG', title: 'Short Handed Goals' },
  { key: 'game_winning_goals', label: 'GWG', title: 'Game Winning Goals' },
  { key: 'penalty_minutes', label: 'PIM', title: 'Penalty Minutes' },
]

export default function PlayerStatsTable({ players }: { players: PlayerStats[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('points')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filter, setFilter] = useState('')

  const sorted = useMemo(() => {
    const filtered = players.filter(
      (p) =>
        !filter ||
        p.name.toLowerCase().includes(filter.toLowerCase()) ||
        p.position.toLowerCase().includes(filter.toLowerCase())
    )
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const an = parseFloat(av as string)
      const bn = parseFloat(bv as string)
      const cmp = isNaN(an) ? String(av).localeCompare(String(bv)) : an - bn
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [players, sortKey, sortDir, filter])

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  return (
    <div className="bg-white/5 rounded-xl overflow-hidden">
      <div className="p-3 border-b border-white/10 flex items-center gap-3">
        <input
          type="text"
          placeholder="Filter by name or position…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-white/10 rounded px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-grizzly-gold/50 w-64"
        />
        <span className="text-white/30 text-xs ml-auto">{sorted.length} players</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-white/5 text-white/40">
              {COLS.map((c) => (
                <th
                  key={c.key}
                  title={c.title}
                  onClick={() => handleSort(c.key)}
                  className={`px-3 py-2 font-medium cursor-pointer select-none hover:text-grizzly-gold transition-colors whitespace-nowrap
                    ${c.key === 'name' ? 'text-left' : 'text-center'}
                    ${sortKey === c.key ? 'text-grizzly-gold' : ''}`}
                >
                  {c.label}
                  {sortKey === c.key && (
                    <span className="ml-0.5">{sortDir === 'desc' ? '↓' : '↑'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => (
              <tr
                key={p.player_id}
                className={`border-t border-white/5 hover:bg-white/5 transition-colors ${
                  i % 2 === 0 ? '' : 'bg-white/[0.02]'
                }`}
              >
                <td className="px-3 py-2 text-center text-white/40">{p.jersey_number}</td>
                <td className="px-3 py-2 text-white font-medium whitespace-nowrap">
                  {p.name}
                  {p.rookie === '1' && (
                    <span className="ml-1.5 text-[10px] bg-grizzly-gold/20 text-grizzly-gold rounded px-1 py-0.5 font-bold">R</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center text-white/50">{p.position}</td>
                <td className="px-3 py-2 text-center text-white/60">{p.games_played}</td>
                <td className="px-3 py-2 text-center text-white/80">{p.goals}</td>
                <td className="px-3 py-2 text-center text-white/80">{p.assists}</td>
                <td className="px-3 py-2 text-center font-bold text-grizzly-gold">{p.points}</td>
                <td className="px-3 py-2 text-center text-white/60">{p.points_per_game}</td>
                <td className="px-3 py-2 text-center text-white/60">{p.power_play_goals}</td>
                <td className="px-3 py-2 text-center text-white/60">{p.power_play_assists}</td>
                <td className="px-3 py-2 text-center text-white/60">{p.short_handed_goals}</td>
                <td className="px-3 py-2 text-center text-white/60">{p.game_winning_goals}</td>
                <td className="px-3 py-2 text-center text-white/60">{p.penalty_minutes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
