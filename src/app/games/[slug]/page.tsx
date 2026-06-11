import { fetchRoster, fetchPlayerStats, fetchSchedule, fetchGameSummary } from '@/lib/hockeytech'
import { getDb, ensureSchema } from '@/lib/db'
import { norm } from '@/lib/slug'
import MatchLineupBuilder from '@/components/MatchLineupBuilder'
import GameResult from '@/components/GameResult'
import FinalScoreActions from '@/components/FinalScoreActions'
import BackLink from '@/components/BackLink'
import GameStats, { type GcSummary } from '@/components/GameStats'
import type { Game, PlayerStats, RosterPlayer, LineupSlot, DbMatch } from '@/types/hockey'

export const revalidate = 0

/**
 * Resolve a match by slug "YYYY-MM-DD-opponent-name".
 * Numeric slugs (old links, calendar events) still resolve by id.
 */
async function getMatch(slug: string): Promise<DbMatch | null> {
  await ensureSchema()
  const db = getDb()

  let row
  if (/^\d+$/.test(slug)) {
    const result = await db.execute({ sql: 'SELECT * FROM games WHERE id = ?', args: [slug] })
    row = result.rows[0]
  } else {
    const date = slug.slice(0, 10)
    const oppSlug = slug.slice(11)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !oppSlug) return null
    const result = await db.execute({ sql: 'SELECT * FROM games WHERE date = ?', args: [date] })
    row = result.rows.find((r) => norm(r.opponent_name as string) === oppSlug)
  }
  if (!row) return null
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
    home_score: row.home_score != null ? Number(row.home_score) : null,
    away_score: row.away_score != null ? Number(row.away_score) : null,
    overtime: row.overtime as string | null,
    shootout: row.shootout as string | null,
    final: row.final as string | null,
    result_photo: row.result_photo as string | null,
  }
}

/** Manually added players from the DB, shaped like roster players for the lineup pool. */
async function getManualPlayers(): Promise<RosterPlayer[]> {
  try {
    const db = getDb()
    const result = await db.execute(`
      SELECT mp.*, ps.position_override, ps.status
      FROM manual_players mp
      LEFT JOIN player_settings ps ON ps.player_id = 'manual-' || mp.id
      ORDER BY mp.name
    `)
    return result.rows.map((row) => ({
      player_id: `manual-${row.id}`,
      name: row.name as string,
      position: row.position as string,
      tp_jersey_number: (row.jersey_number as string | null) ?? '',
      birthdate_year: '',
      h: '',
      w: '',
      hometown: '',
      flags: [],
      position_override: row.position_override as string | null,
      status: row.status as string | null,
      photo: row.photo as string | null,
    }))
  } catch {
    return []
  }
}

/** position_override + status set on the roster page, keyed by player_id. */
async function getPlayerSettings(): Promise<Map<string, { position_override: string | null; status: string | null }>> {
  try {
    const db = getDb()
    const result = await db.execute('SELECT player_id, position_override, status FROM player_settings')
    return new Map(
      result.rows.map((row) => [
        String(row.player_id),
        {
          position_override: row.position_override as string | null,
          status: row.status as string | null,
        },
      ])
    )
  } catch {
    return new Map()
  }
}

async function getLineup(matchId: string, type: 'opening' | 'alternative' | 'special'): Promise<LineupSlot[] | null> {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT slots_json FROM lineups WHERE match_id = ? AND type = ?',
    args: [matchId, type],
  })
  if (!result.rows[0]) return null
  return JSON.parse(result.rows[0].slots_json as string)
}

export default async function MatchDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const teamId = process.env.TEAM_ID!
  const today = new Date().toISOString().split('T')[0]

  const match = await getMatch(slug)

  if (!match) {
    return (
      <div className="text-center py-24 text-white/40">
        Game not found.{' '}
        <a href="/games" className="underline text-grizzly-gold">Back to games</a>
      </div>
    )
  }

  const isPast = match.date < today
  const isApiGame = match.type === 'api' && !!match.api_game_id
  const hasDbScore = match.home_score != null && match.away_score != null

  // Fallback: live API fetch for past api games not yet synced into the DB
  let apiGame: Game | null = null
  if (isPast && isApiGame && !hasDbScore) {
    try {
      const scheduleData = await fetchSchedule(teamId)
      const allGames: Game[] = scheduleData.SiteKit.Schedule ?? []
      apiGame = allGames.find((g) => g.game_id === match.api_game_id) ?? null
    } catch { /* ignore */ }
  }

  // Fetch roster + lineups only for upcoming games
  let players: RosterPlayer[] = []
  let openingSlots: LineupSlot[] | null = null
  let alternativeSlots: LineupSlot[] | null = null
  let specialSlots: LineupSlot[] | null = null
  let upcomingVenue: string | null = null

  if (!isPast && isApiGame) {
    // Venue for the image export header
    try {
      const sd = await fetchSchedule(teamId)
      const g = ((sd.SiteKit?.Schedule ?? []) as Game[]).find((x) => x.game_id === match.api_game_id)
      upcomingVenue = g?.venue_name ?? null
    } catch { /* optional */ }
  } else if (!isPast) {
    // Manual game — derive the venue from the schedule: home → our arena,
    // away → the opponent's arena (their home games carry the venue name)
    try {
      const hostId = match.home_away === 'home' ? teamId : match.opponent_team_id
      if (hostId) {
        const sd = await fetchSchedule(hostId)
        const g = ((sd.SiteKit?.Schedule ?? []) as Game[]).find(
          (x) => x.home_team === hostId && x.venue_name
        )
        upcomingVenue = g?.venue_name ?? null
      }
    } catch { /* optional */ }
  }

  if (!isPast) {
    const [rosterData, statsRaw, manualPlayers, settings, opening, alternative, special] = await Promise.all([
      fetchRoster(teamId),
      fetchPlayerStats(teamId),
      getManualPlayers(),
      getPlayerSettings(),
      getLineup(String(match.id), 'opening'),
      getLineup(String(match.id), 'alternative'),
      getLineup(String(match.id), 'special'),
    ])
    openingSlots = opening
    alternativeSlots = alternative
    specialSlots = special
    const sections = rosterData.roster[0].sections
    const statsMap = new Map<string, PlayerStats>(
      statsRaw[0].sections[0].data.map((d: { row: PlayerStats }) => [d.row.player_id, d.row])
    )
    players = sections.flatMap(
      (s: { data: Array<{ row: RosterPlayer }> }) =>
        s.data.map((d: { row: RosterPlayer }) => {
          const st = statsMap.get(d.row.player_id)
          const set = settings.get(d.row.player_id)
          return {
            ...d.row,
            gp: st?.games_played, g: st?.goals, a: st?.assists, pts: st?.points, pim: st?.penalty_minutes,
            position_override: set?.position_override ?? null,
            status: set?.status ?? null,
          }
        })
    )
    players = [...players, ...manualPlayers]
  }

  // Full game stats from the Game Center feed (past league games only)
  let summary: GcSummary | null = null
  if (isPast && isApiGame) {
    try {
      summary = await fetchGameSummary(match.api_game_id!)
      if (summary && !summary.goals) summary = null // not played / no data
    } catch { /* ignore — stats are optional */ }
  }

  const matchDateLabel = new Date(match.date + 'T12:00:00').toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  const clientCode = process.env.HT_CLIENT!
  const reportLinks = isApiGame
    ? {
        report: `https://lscluster.hockeytech.com/game_reports/official-game-report.php?client_code=${clientCode}&game_id=${match.api_game_id}&lang_id=1`,
        boxScore: `https://lscluster.hockeytech.com/game_reports/text-game-report.php?client_code=${clientCode}&game_id=${match.api_game_id}&lang_id=1`,
      }
    : null

  // Build score props — DB first (filled in by Sync), live API as fallback
  let scoreProps: { ourScore: number; theirScore: number; suffix: string } | null = null
  if (hasDbScore && (match.type !== 'api' || match.final === '1')) {
    const ourScore = match.home_away === 'home' ? match.home_score! : match.away_score!
    const theirScore = match.home_away === 'home' ? match.away_score! : match.home_score!
    scoreProps = {
      ourScore,
      theirScore,
      suffix: match.shootout ? 'SO' : match.overtime ? 'OT' : 'Final',
    }
  } else if (apiGame) {
    const isHome = apiGame.home_team === teamId
    const ourGoals = parseInt(isHome ? apiGame.home_goal_count : apiGame.visiting_goal_count)
    const theirGoals = parseInt(isHome ? apiGame.visiting_goal_count : apiGame.home_goal_count)
    const ot = apiGame.overtime === '1'
    const so = apiGame.shootout === '1'
    scoreProps = { ourScore: ourGoals, theirScore: theirGoals, suffix: ot ? 'OT' : so ? 'SO' : 'Final' }
  }

  return (
    <div className="space-y-6">
      <div>
        <BackLink />
        <div className="mt-3 flex items-start justify-between">
          <div>
            {!(isPast && scoreProps) && (
              <h2 className="text-xl">
                <span className="text-white/50 font-normal">{matchDateLabel}</span>
                <span className="text-white/25 mx-3">|</span>
                <span className="text-white font-bold">{match.opponent_name}</span>
              </h2>
            )}
            {match.notes && <p className="text-white/30 text-sm mt-1 italic">{match.notes}</p>}
          </div>
        </div>
      </div>

      {isPast ? (
        scoreProps ? (
          <>
            <FinalScoreActions match={match} venue={summary?.venue} ourTeamId={teamId} score={scoreProps} />
            <GameResult
              ourScore={scoreProps.ourScore}
              theirScore={scoreProps.theirScore}
              suffix={scoreProps.suffix}
              teamId={teamId}
              opponentId={match.opponent_team_id}
              opponentName={match.opponent_name}
              dateLabel={matchDateLabel}
              venue={summary?.venue}
              reportUrl={reportLinks?.report}
              boxScoreUrl={reportLinks?.boxScore}
            />
            {summary && <GameStats summary={summary} ourSide={match.home_away === 'home' ? 'home' : 'visitor'} />}
          </>
        ) : (
          <FinalScoreActions match={match} venue={summary?.venue} ourTeamId={teamId} score={null} />
        )
      ) : (
        <MatchLineupBuilder
          match={match}
          players={players}
          venue={upcomingVenue}
          ourTeamId={teamId}
          initialOpening={openingSlots}
          initialAlternative={alternativeSlots}
          initialSpecial={specialSlots}
        />
      )}
    </div>
  )
}
