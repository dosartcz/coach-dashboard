import { fetchPlayerStats, fetchSeasonIds, fetchSchedule, fetchSeasons } from '@/lib/hockeytech'
import { TeamLogo } from './TeamLogo'
import TopScorersWithToggle from './TopScorersWithToggle'
import Countdown from './Countdown'
import type { Game, PlayerStats } from '@/types/hockey'

export interface NextGameInfo {
  /** YYYY-MM-DD — used for the countdown */
  date: string
  dateLabel: string
  time?: string | null
  venue?: string | null
  isHome: boolean
  opponentName: string
  lineupHref?: string
}

interface Props {
  opponentId: string
  game: NextGameInfo
}

export default async function NextOpponent({ opponentId, game }: Props) {
  const [scheduleData, statsData, { regular, playoffs }] = await Promise.all([
    fetchSchedule(opponentId).catch(() => null),
    fetchPlayerStats(opponentId),
    fetchSeasonIds(),
  ])

  // Initial players (playoff = current season) — top 10
  const initialPlayers: PlayerStats[] = (
    statsData[0]?.sections?.[0]?.data?.map((d: { row: PlayerStats }) => d.row) ?? []
  ).slice(0, 10)

  // Opponent form — last 5 finished games
  const opponentGames: Game[] = scheduleData?.SiteKit?.Schedule ?? []
  const finished = opponentGames
    .filter((g) => g.final === '1')
    .sort((a, b) => b.date_played.localeCompare(a.date_played))
  const form = finished.slice(0, 5)

  // Head to head — search back through past seasons until we have 5 mutual games
  const ourId = process.env.TEAM_ID!
  const isMutual = (g: Game) => g.home_team === ourId || g.visiting_team === ourId
  let headToHead = finished.filter(isMutual)
  if (headToHead.length < 5) {
    try {
      const seasons = await fetchSeasons()
      const pastSeasonIds = seasons
        .map((s) => s.season_id)
        .filter((id) => id !== process.env.HT_SEASON)
        .slice(0, 8)
      const pastSchedules = await Promise.all(
        pastSeasonIds.map((id) => fetchSchedule(opponentId, id).catch(() => null))
      )
      const pastMutual = pastSchedules
        .flatMap((d) => (d?.SiteKit?.Schedule ?? []) as Game[])
        .filter((g) => g.final === '1' && isMutual(g))
      const seen = new Set(headToHead.map((g) => g.game_id))
      for (const g of pastMutual) {
        if (!seen.has(g.game_id)) {
          seen.add(g.game_id)
          headToHead.push(g)
        }
      }
      headToHead.sort((a, b) => b.date_played.localeCompare(a.date_played))
    } catch { /* current season only */ }
  }
  headToHead = headToHead.slice(0, 5)

  const detailItems = [
    game.isHome ? 'Home' : 'Away',
    game.dateLabel,
    game.time ? game.time.slice(0, 5) : null,
    game.venue,
  ].filter(Boolean)

  return (
    <div className="bg-white/5 rounded-xl overflow-hidden border border-white/10">
      {/* Hero header */}
      <div className="p-6 border-b border-white/10 flex items-center gap-6 bg-white">
        <TeamLogo teamId={opponentId} size={88} />
        <div className="flex-1 min-w-0">
          <p className="text-grizzly-gold text-xs font-bold uppercase tracking-wider">Next Opponent</p>
          <h2 className="text-gray-900 font-black text-3xl leading-tight mt-1 truncate">
            {game.opponentName}
          </h2>
          <p className="text-gray-500 text-sm mt-2">{detailItems.join(' · ')}</p>
          <Countdown date={game.date} time={game.time} />
        </div>
        {game.lineupHref && (
          <a
            href={game.lineupHref}
            className="flex-shrink-0 bg-grizzly-gold text-white text-sm font-bold px-5 py-2.5 rounded hover:bg-grizzly-gold/90 transition-colors"
          >
            Build Lineup
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/10">
        {/* Top scorers with toggle */}
        <TopScorersWithToggle
          teamId={opponentId}
          initialPlayers={initialPlayers}
          regularSeasonId={regular}
          playoffSeasonId={playoffs}
        />

        {/* Form + head to head */}
        <div className="p-4 space-y-5">
          <div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Form — Last 5</p>
            {form.length === 0 ? (
              <p className="text-white/30 text-xs py-4 text-center">No finished games yet</p>
            ) : (
              <div className="space-y-1.5">
                {form.map((g) => {
                  const isHome = g.home_team === opponentId
                  const theirGoals = parseInt(isHome ? g.home_goal_count : g.visiting_goal_count)
                  const oppGoals = parseInt(isHome ? g.visiting_goal_count : g.home_goal_count)
                  const won = theirGoals > oppGoals
                  const suffix = g.shootout === '1' ? ' SO' : g.overtime === '1' ? ' OT' : ''
                  const vsName = isHome ? g.visiting_team_name : g.home_team_name
                  const dateLabel = new Date(g.date_played + 'T12:00:00').toLocaleDateString('en-CA', {
                    month: 'short', day: 'numeric',
                  })
                  return (
                    <div key={g.game_id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-white/40 w-14 shrink-0">{dateLabel}</span>
                        <span className="text-white/80 truncate">{vsName}</span>
                      </div>
                      <span className={`font-bold shrink-0 ml-2 tabular-nums ${won ? 'text-green-400' : 'text-red-400'}`}>
                        {won ? 'W' : 'L'} {theirGoals}–{oppGoals}{suffix}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {headToHead.length > 0 && (
            <div>
              <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Head to Head</p>
              <div className="space-y-1.5">
                {headToHead.map((g) => {
                  const weAreHome = g.home_team === ourId
                  const ourGoals = parseInt(weAreHome ? g.home_goal_count : g.visiting_goal_count)
                  const theirGoals = parseInt(weAreHome ? g.visiting_goal_count : g.home_goal_count)
                  const won = ourGoals > theirGoals
                  const suffix = g.shootout === '1' ? ' SO' : g.overtime === '1' ? ' OT' : ''
                  const dateLabel = new Date(g.date_played + 'T12:00:00').toLocaleDateString('en-CA', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })
                  return (
                    <div key={g.game_id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-white/40 w-24 shrink-0">{dateLabel}</span>
                        <span className="text-white/80 truncate">{weAreHome ? 'Home' : 'Away'}</span>
                      </div>
                      <span className={`font-bold shrink-0 ml-2 tabular-nums ${won ? 'text-green-400' : 'text-red-400'}`}>
                        {won ? 'W' : 'L'} {ourGoals}–{theirGoals}{suffix}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
