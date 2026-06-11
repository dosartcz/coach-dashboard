const BASE = 'https://lscluster.hockeytech.com/feed/index.php'

const params = () => ({
  key: process.env.HT_KEY!,
  client_code: process.env.HT_CLIENT!,
  league_id: process.env.HT_LEAGUE!,
  site_id: process.env.HT_SITE!,
  lang: 'en',
  fmt: 'json',
})

function buildUrl(extra: Record<string, string>) {
  const p = new URLSearchParams({ ...params(), ...extra })
  return `${BASE}?${p.toString()}`
}

export async function fetchRoster(teamId: string) {
  const url = buildUrl({
    feed: 'statviewfeed',
    view: 'roster',
    season: process.env.HT_SEASON!,
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
    season: season ?? process.env.HT_SEASON!,
  }
  if (teamId) extra.team_id = teamId
  const url = buildUrl(extra)
  const res = await fetch(url, { next: { revalidate: 600 } })
  const text = await res.text()
  // Strip JSONP wrapper if present: ([...])
  const json = text.replace(/^\s*\(/, '').replace(/\)\s*$/, '')
  return JSON.parse(json)
}

export async function fetchSeasonIds(): Promise<{ regular: string | null; playoffs: string }> {
  const playoffsId = process.env.HT_SEASON!
  try {
    const url = buildUrl({ feed: 'modulekit', view: 'seasons' })
    const res = await fetch(url, { next: { revalidate: 86400 } })
    const text = await res.text()
    const data = JSON.parse(text)
    const seasons: Array<{ season_id: string; season_name: string; playoff: string; career: string }> =
      data.SiteKit?.Seasons ?? []

    const playoff = seasons.find((s) => s.season_id === playoffsId)
    if (!playoff) return { regular: null, playoffs: playoffsId }

    // Match year pair e.g. "2025-26" or "2025/26"
    const yearPair = playoff.season_name.match(/\d{4}[/-]\d{2,4}/)?.[0]
    const regular = yearPair
      ? seasons.find(
          (s) =>
            s.playoff === '0' &&
            s.career === '1' &&
            s.season_id !== playoffsId &&
            s.season_name.replace(/-/g, '/').includes(yearPair.replace(/-/g, '/'))
        )
      : null

    return { regular: regular?.season_id ?? null, playoffs: playoffsId }
  } catch {
    return { regular: null, playoffs: playoffsId }
  }
}

export async function fetchTeams() {
  const url = buildUrl({
    feed: 'modulekit',
    view: 'teamsbyseason',
    season_id: process.env.HT_SEASON!,
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
  const url = buildUrl({
    feed: 'modulekit',
    view: 'schedule',
    season_id: seasonId ?? process.env.HT_SEASON!,
    team_id: teamId,
  })
  // Older seasons never change — cache them for a day
  const revalidate = seasonId && seasonId !== process.env.HT_SEASON ? 86400 : 600
  const res = await fetch(url, { next: { revalidate } })
  const text = await res.text()
  return JSON.parse(text)
}

export interface SeasonInfo {
  season_id: string
  season_name: string
  playoff: string
  career: string
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
    key: process.env.HT_KEY!,
    client_code: process.env.HT_CLIENT!,
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
    season: seasonId ?? process.env.HT_SEASON!,
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
