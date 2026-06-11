export interface PlayerStats {
  player_id: string
  name: string
  position: string
  jersey_number: string
  team_code: string
  birthdate_year: string
  games_played: string
  goals: string
  assists: string
  points: string
  points_per_game: string
  penalty_minutes: string
  power_play_goals: string
  power_play_assists: string
  short_handed_goals: string
  short_handed_assists: string
  game_winning_goals: string
  rookie: string
  active: string
}

export interface RosterPlayer {
  player_id: string
  name: string
  position: string
  tp_jersey_number: string
  birthdate?: string
  birthdate_year: string
  h: string
  w: string
  shoots?: string
  catches?: string
  hometown: string
  flags: string[]
  position_override?: string | null
  /** Custom photo (data URL) — manual players only */
  photo?: string | null
  status?: string | null
  // Merged from PlayerStats
  gp?: string
  g?: string
  a?: string
  pts?: string
  pim?: string
}

export interface RosterSection {
  title: string
  data: Array<{ row: RosterPlayer }>
}

export interface Game {
  game_id: string
  date_played: string
  date: string
  date_with_day: string
  GameDateISO8601: string
  home_team: string
  visiting_team: string
  home_team_name: string
  home_team_code: string
  visiting_team_name: string
  visiting_team_code: string
  home_goal_count: string
  visiting_goal_count: string
  game_status: string
  final: string
  venue_name: string
  venue_location: string
  scheduled_time: string
  overtime: string
  shootout: string
}

export interface LineupSlot {
  id: string
  label: string
  position: 'F' | 'D' | 'G'
  player: RosterPlayer | null
}

export interface ManualPlayer {
  id: number
  name: string
  position: string
  jersey_number: string | null
  notes: string | null
  photo: string | null
  birthdate: string | null
  shoots: string | null
  position_override: string | null
  status: string | null
}

export interface DbMatch {
  id: number
  date: string
  time?: string | null
  opponent_name: string
  opponent_team_id: string | null
  home_away: string
  type: string
  api_game_id: string | null
  notes: string | null
  home_score?: number | null
  away_score?: number | null
  overtime?: string | null
  shootout?: string | null
  final?: string | null
  result_photo?: string | null
}

export interface DbLineup {
  id: number
  match_id: number
  type: string
  slots_json: string
  created_at: string
  updated_at: string
}

export interface DbEvent {
  id: number
  date: string
  time: string | null
  title: string
  type: string
  notes: string | null
  match_id: number | null
}

export interface PlayerNote {
  id: number
  player_id: string
  note: string
  created_at: string
}
