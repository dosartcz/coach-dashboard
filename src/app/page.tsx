import { fetchSchedule, fetchPlayerStats, fetchSeasonIds } from '@/lib/hockeytech'
import { getDb, ensureSchema } from '@/lib/db'
import { matchSlug } from '@/lib/slug'
import NextOpponent, { type NextGameInfo } from '@/components/NextOpponent'
import RecentResults from '@/components/RecentResults'
import Standings from '@/components/Standings'
import PlayerStatsWithToggle from '@/components/PlayerStatsWithToggle'
import type { Game, DbMatch, PlayerStats } from '@/types/hockey'

export const revalidate = 0

function rowToMatch(row: Record<string, unknown>): DbMatch {
  return {
    id: Number(row.id),
    date: row.date as string,
    time: row.time as string | null,
    opponent_name: row.opponent_name as string,
    opponent_team_id: row.opponent_team_id as string | null,
    home_away: row.home_away as string,
    type: row.type as string,
    api_game_id: row.api_game_id as string | null,
    notes: row.notes as string | null,
  }
}

async function getNextManualMatch(today: string): Promise<DbMatch | null> {
  try {
    await ensureSchema()
    const db = getDb()
    const result = await db.execute({
      sql: 'SELECT * FROM games WHERE date >= ? ORDER BY date ASC LIMIT 1',
      args: [today],
    })
    return result.rows[0] ? rowToMatch(result.rows[0] as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** Find the DB row of an api game so the hero can link to its lineup page. */
async function getDbMatchByApiId(apiGameId: string): Promise<DbMatch | null> {
  try {
    await ensureSchema()
    const db = getDb()
    const result = await db.execute({
      sql: 'SELECT * FROM games WHERE api_game_id = ?',
      args: [apiGameId],
    })
    return result.rows[0] ? rowToMatch(result.rows[0] as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export default async function DashboardPage() {
  const teamId = process.env.TEAM_ID!

  const [scheduleData, statsRaw, seasonIds] = await Promise.all([
    fetchSchedule(teamId),
    fetchPlayerStats(teamId).catch(() => null),
    fetchSeasonIds(),
  ])

  // Our team player stats (current season)
  const teamStats: PlayerStats[] =
    statsRaw?.[0]?.sections?.[0]?.data?.map((d: { row: PlayerStats }) => d.row) ?? []

  const allGames: Game[] = scheduleData.SiteKit.Schedule ?? []
  const today = new Date().toISOString().split('T')[0]

  const upcoming: Game[] = allGames
    .filter((g) => g.date_played >= today && g.final !== '1')
    .sort((a, b) => a.date_played.localeCompare(b.date_played))

  const past: Game[] = allGames
    .filter((g) => g.final === '1')
    .sort((a, b) => b.date_played.localeCompare(a.date_played))
    .slice(0, 8)

  const nextGame = upcoming[0] ?? null
  const nextOpponentId = nextGame
    ? nextGame.home_team === teamId
      ? nextGame.visiting_team
      : nextGame.home_team
    : null

  // If no official upcoming game, check the DB for manually added matches
  const nextManualMatch = !nextGame ? await getNextManualMatch(today) : null

  // Hero props
  let hero: { opponentId: string; game: NextGameInfo } | null = null
  if (nextGame && nextOpponentId) {
    const dbMatch = await getDbMatchByApiId(nextGame.game_id)
    const isHome = nextGame.home_team === teamId
    hero = {
      opponentId: nextOpponentId,
      game: {
        dateLabel: nextGame.date_with_day,
        time: nextGame.scheduled_time,
        venue: nextGame.venue_name,
        isHome,
        opponentName: isHome ? nextGame.visiting_team_name : nextGame.home_team_name,
        lineupHref: dbMatch ? `/games/${matchSlug(dbMatch)}` : undefined,
      },
    }
  } else if (nextManualMatch?.opponent_team_id) {
    hero = {
      opponentId: nextManualMatch.opponent_team_id,
      game: {
        dateLabel: new Date(nextManualMatch.date + 'T12:00:00').toLocaleDateString('en-CA', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        }),
        time: nextManualMatch.time,
        isHome: nextManualMatch.home_away === 'home',
        opponentName: nextManualMatch.opponent_name,
        lineupHref: `/games/${matchSlug(nextManualMatch)}`,
      },
    }
  }

  return (
    <div className="space-y-6">
      {/* Recent results */}
      <RecentResults pastGames={past} teamId={teamId} />

      {/* Next opponent — hero */}
      {hero ? (
        <NextOpponent opponentId={hero.opponentId} game={hero.game} />
      ) : nextManualMatch ? (
        <div className="bg-white/5 rounded-xl border border-white/10 p-6 flex flex-col gap-2">
          <p className="text-grizzly-gold text-xs font-bold uppercase tracking-wider">Next Game</p>
          <p className="text-white font-black text-2xl">
            {nextManualMatch.home_away === 'home' ? 'vs' : '@'} {nextManualMatch.opponent_name}
          </p>
          <p className="text-white/40 text-sm">
            {new Date(nextManualMatch.date + 'T12:00:00').toLocaleDateString('en-CA', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
            {nextManualMatch.time && ` · ${nextManualMatch.time.slice(0, 5)}`}
          </p>
          <a
            href={`/games/${matchSlug(nextManualMatch)}`}
            className="mt-2 self-start bg-grizzly-gold text-white text-sm font-bold px-5 py-2.5 rounded hover:bg-grizzly-gold/90 transition-colors"
          >
            Build Lineup →
          </a>
        </div>
      ) : (
        <div className="bg-white/5 rounded-xl border border-white/10 p-10 text-center text-white/40 text-sm">
          No upcoming games scheduled
        </div>
      )}

      {/* League standings — both teams highlighted */}
      <Standings ourTeamId={teamId} opponentTeamId={hero?.opponentId} />

      {/* Our team player stats */}
      {teamStats.length > 0 && (
        <div>
          <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-3">Team Stats</p>
          <PlayerStatsWithToggle
            initialPlayers={teamStats}
            regularSeasonId={seasonIds.regular}
            playoffSeasonId={seasonIds.playoffs}
          />
        </div>
      )}
    </div>
  )
}
