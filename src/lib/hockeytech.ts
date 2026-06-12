const BASE = 'https://lscluster.hockeytech.com/feed/index.php'

// Public HockeyTech feed constants for the KIJHL (same key the league site uses).
// Env vars override them, but none are required on deploy.
const params = () => ({
  key: process.env.HT_KEY ?? '2589e0f644b1bb71',
  client_code: process.env.HT_CLIENT ?? 'kijhl',
  league_id: process.env.HT_LEAGUE ?? '1',
  site_id: process.env.HT_SITE ?? '2',
  lang: 'en',
  fmt: 'json',
})

export const HT_CLIENT_CODE = process.env.HT_CLIENT ?? 'kijhl'

/** Our team id (Revelstoke Grizzlies). Env var overrides for a different team. */
export const OUR_TEAM_ID = process.env.TEAM_ID ?? '19'

function buildUrl(extra: Record<string, string>) {
  const p = new URLSearchParams({ ...params(), ...extra })
  return `${BASE}?${p.toString()}`
}

/**
 * Current season — detected automatically from the league feed:
 * 1. `HT_SEASON` env var, when set (manual override)
 * 2. the season whose start/end dates contain today (career seasons preferred)
 * 3. off-season: the most recently FINISHED career season (e.g. last playoffs,
 *    so "recent games" really are the latest games played)
 * 4. the league's own default season (Parameters.season_id)
 */
export async function getCurrentSeasonId(): Promise<string> {
  if (process.env.HT_SEASON) return process.env.HT_SEASON
  try {
    const url = buildUrl({ feed: 'modulekit', view: 'seasons' })
    const res = await fetch(url, { next: { revalidate: 3600 } })
    const data = JSON.parse(await res.text())
    const seasons: SeasonInfo[] = data.SiteKit?.Seasons ?? []
    const today = new Date().toISOString().slice(0, 10)

    const active =
      seasons.find((s) => s.career === '1' && s.start_date <= today && today <= s.end_date) ??
      seasons.find((s) => s.start_date <= today && today <= s.end_date)
    if (active) return active.season_id

    const lastFinished = seasons
      .filter((s) => s.career === '1' && s.end_date < today)
      .sort((a, b) => b.end_date.localeCompare(a.end_date))[0]
    if (lastFinished) return lastFinished.season_id

    const leagueDefault = data.SiteKit?.Parameters?.season_id
    if (leagueDefault) return String(leagueDefault)
  } catch { /* fall through */ }
  return '67' // last known season — only reached if the feed is down
}

export async function fetchRoster(teamId: string) {
  const url = buildUrl({
    feed: 'statviewfeed',
    view: 'roster',
    season: await getCurrentSeasonId(),
    team_id: teamId,
  })
  const res = await fetch(url, { next: { revalidate: 3600 } })
  const text = await res.text()
  const json = text.replace(/^\s*\(/, '').replace(/\)\s*$/, '')
  return JSON.parse(json)
}

export async function fetchPlayerStats(teamId?: string, season?: string) {
  const extra: Record<string, string> = {
    feed: 'statviewfeed',
    view: 'players',
    context: 'overall',
    season: season ?? (await getCurrentSeasonId()),
  }
  if (teamId) extra.team_id = teamId
  const url = buildUrl(extra)
  const res = await fetch(url, { next: { revalidate: 600 } })
  const text = await res.text()
  // Strip JSONP wrapper if present: ([...])
  const json = text.replace(/^\s*\(/, '').replace(/\)\s*$/, '')
  return JSON.parse(json)
}

/**
 * Regular-season + playoff ids for the current year.
 * `playoffs` is always the "current" season id (used as the default stats context);
 * `regular` is the matching regular season of the same year pair when it exists.
 */
export async function fetchSeasonIds(): Promise<{ regular: string | null; playoffs: string }> {
  const current = await getCurrentSeasonId()
  try {
    const seasons = await fetchSeasons()
    const cur = seasons.find((s) => s.season_id === current)
    if (!cur) return { regular: null, playoffs: current }

    // Match year pair e.g. "2025-26" or "2025/26"
    const yearPair = cur.season_name.match(/\d{4}[/-]\d{2,4}/)?.[0]?.replace(/-/g, '/')
    const mate = (playoff: '0' | '1') =>
      yearPair
        ? seasons.find(
            (s) =>
              s.playoff === playoff &&
              s.career === '1' &&
              s.season_id !== current &&
              s.season_name.replace(/-/g, '/').includes(yearPair)
          )
        : undefined

    if (cur.playoff === '1') {
      return { regular: mate('0')?.season_id ?? null, playoffs: current }
    }
    // Current season is a regular season — playoffs may not be published yet
    return { regular: current, playoffs: mate('1')?.season_id ?? current }
  } catch {
    return { regular: null, playoffs: current }
  }
}

export async function fetchTeams() {
  const url = buildUrl({
    feed: 'modulekit',
    view: 'teamsbyseason',
    season_id: await getCurrentSeasonId(),
  })
  const res = await fetch(url, { next: { revalidate: 86400 } })
  const text = await res.text()
  const data = JSON.parse(text)
  return data.SiteKit.Teamsbyseason as Array<{
    id: string
    name: string
    city: string
    code: string
    nickname: string
    division_long_name: string
    team_logo_url: string
  }>
}

export async function fetchSchedule(teamId: string, seasonId?: string) {
  const current = await getCurrentSeasonId()
  const sid = seasonId ?? current
  const url = buildUrl({
    feed: 'modulekit',
    view: 'schedule',
    season_id: sid,
    team_id: teamId,
  })
  // Older seasons never change — cache them for a day
  const revalidate = sid !== current ? 86400 : 600
  const res = await fetch(url, { next: { revalidate } })
  const text = await res.text()
  return JSON.parse(text)
}

export interface SeasonInfo {
  season_id: string
  season_name: string
  playoff: string
  career: string
  start_date: string
  end_date: string
}

/** All seasons known to the league, newest first. */
export async function fetchSeasons(): Promise<SeasonInfo[]> {
  const url = buildUrl({ feed: 'modulekit', view: 'seasons' })
  const res = await fetch(url, { next: { revalidate: 86400 } })
  const text = await res.text()
  const data = JSON.parse(text)
  const seasons: SeasonInfo[] = data.SiteKit?.Seasons ?? []
  return seasons.sort((a, b) => Number(b.season_id) - Number(a.season_id))
}

/** Full game summary from the Game Center feed (goals, penalties, goalies, shots, 3 stars…). */
export async function fetchGameSummary(gameId: string) {
  const p = new URLSearchParams({
    feed: 'gc',
    key: params().key,
    client_code: params().client_code,
    game_id: gameId,
    lang_code: 'en',
    fmt: 'json',
    tab: 'gamesummary',
  })
  const res = await fetch(`${BASE}?${p.toString()}`, { next: { revalidate: 600 } })
  const text = await res.text()
  const data = JSON.parse(text)
  return data.GC?.Gamesummary ?? null
}

export interface StandingsTeam {
  id: string
  team_code: string
  name: string
  games_played: string
  wins: string
  losses: string
  ot_losses: string
  shootout_losses: string
  points: number
  goals_diff: string
  rank: number
  past_10: string
}

export interface StandingsDivision {
  division: string
  teams: StandingsTeam[]
}

/** League standings grouped by division. */
export async function fetchStandings(seasonId?: string): Promise<StandingsDivision[]> {
  const url = buildUrl({
    feed: 'statviewfeed',
    view: 'teams',
    groupTeamsBy: 'division',
    context: 'overall',
    season: seasonId ?? (await getCurrentSeasonId()),
    special: 'false',
  })
  const res = await fetch(url, { next: { revalidate: 600 } })
  const text = await res.text()
  const json = text.replace(/^\s*\(/, '').replace(/\)\s*$/, '')
  const data = JSON.parse(json)
  const sections = data?.[0]?.sections ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return sections.map((s: any) => ({
    division: s.headers?.name?.properties?.label ?? '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    teams: (s.data ?? []).map((d: any) => ({
      id: String(d.prop?.team_code?.playerStatsLink ?? ''),
      ...d.row,
    })),
  }))
}
