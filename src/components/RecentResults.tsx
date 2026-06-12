'use client'
import Link from 'next/link'
import { matchSlug } from '@/lib/slug'
import { TeamLogo } from './TeamLogo'
import type { Game } from '@/types/hockey'

interface Props {
  pastGames: Game[]
  teamId: string
}

export default function RecentResults({ pastGames, teamId }: Props) {
  const games = pastGames.slice(0, 5)
  if (games.length === 0) return null

  return (
    <div>
      <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-3">Recent Results</p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {games.map((g) => {
          const isHome = g.home_team === teamId
          const opponentName = isHome ? g.visiting_team_name : g.home_team_name
          const slug = matchSlug({ date: g.date_played, opponent_name: opponentName })
          const status = g.shootout === '1' ? 'Final SO' : g.overtime === '1' ? 'Final OT' : 'Final'
          const dateLabel = new Date(g.date_played + 'T12:00:00').toLocaleDateString('en-CA', {
            weekday: 'short', month: 'short', day: 'numeric',
          })
          return (
            <Link key={g.game_id} href={`/games/${slug}`} className="block group">
              <p className="text-white/40 text-[11px] mb-1.5 px-1">{dateLabel}</p>
              <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 flex items-center gap-3 group-hover:border-grizzly-gold/50 group-hover:bg-white/10 transition-colors">
                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* Away team */}
                  <div className="flex items-center gap-2">
                    <TeamLogo teamId={g.visiting_team} size={24} />
                    <span className="text-white font-bold text-sm">{g.visiting_team_code}</span>
                    <span className="text-white font-bold text-sm tabular-nums ml-auto">{g.visiting_goal_count}</span>
                  </div>
                  {/* Home team */}
                  <div className="flex items-center gap-2">
                    <TeamLogo teamId={g.home_team} size={24} />
                    <span className="text-white font-bold text-sm">{g.home_team_code}</span>
                    <span className="text-white font-bold text-sm tabular-nums ml-auto">{g.home_goal_count}</span>
                  </div>
                </div>
                <span className="text-white/30 text-[10px] shrink-0">{status}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
