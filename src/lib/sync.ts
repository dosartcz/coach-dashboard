import { getDb, ensureSchema } from './db'
import { fetchSchedule } from './hockeytech'
import type { Game } from '@/types/hockey'

const AUTO_SYNC_MAX_AGE_MIN = 60

/** Import/refresh the season schedule + results from HockeyTech into the DB. */
export async function syncGames(): Promise<{ inserted: number; skipped: number; total: number }> {
  await ensureSchema()
  const db = getDb()

  const teamId = process.env.TEAM_ID!
  const scheduleData = await fetchSchedule(teamId)
  const games: Game[] = scheduleData.SiteKit.Schedule ?? []

  let inserted = 0
  let skipped = 0

  for (const game of games) {
    const isHome = game.home_team === teamId
    const opponentName = isHome ? game.visiting_team_name : game.home_team_name
    const opponentId = isHome ? game.visiting_team : game.home_team

    // Store scores only for finished games — the feed returns "0" for unplayed ones
    const isFinal = game.final === '1'
    const homeScore = isFinal && game.home_goal_count !== '' ? Number(game.home_goal_count) : null
    const awayScore = isFinal && game.visiting_goal_count !== '' ? Number(game.visiting_goal_count) : null
    const scheduledTime = game.scheduled_time ?? null
    const overtime = game.overtime && game.overtime !== '0' ? game.overtime : null
    const shootout = game.shootout && game.shootout !== '0' ? game.shootout : null

    const result = await db.execute({
      sql: `INSERT OR IGNORE INTO games
            (date, time, opponent_name, opponent_team_id, home_away, type, api_game_id, home_score, away_score, overtime, shootout, final)
            VALUES (?, ?, ?, ?, ?, 'api', ?, ?, ?, ?, ?, ?)`,
      args: [game.date_played, scheduledTime, opponentName, opponentId, isHome ? 'home' : 'away', game.game_id, homeScore, awayScore, overtime, shootout, isFinal ? '1' : null],
    })
    if (result.rowsAffected > 0) {
      inserted++
    } else {
      // Update scores for existing games (scores may have changed)
      await db.execute({
        sql: `UPDATE games SET home_score=?, away_score=?, overtime=?, shootout=?, final=?, time=COALESCE(time, ?) WHERE api_game_id=?`,
        args: [homeScore, awayScore, overtime, shootout, isFinal ? '1' : null, scheduledTime, game.game_id],
      })
      skipped++
    }
  }

  await db.execute({
    sql: `INSERT INTO meta (key, value) VALUES ('last_games_sync', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    args: [new Date().toISOString()],
  })

  return { inserted, skipped, total: games.length }
}

/**
 * Run syncGames automatically if the last sync is older than AUTO_SYNC_MAX_AGE_MIN.
 * Never throws — a feed outage must not break page loads.
 */
export async function autoSyncGames(): Promise<void> {
  try {
    await ensureSchema()
    const db = getDb()
    const row = await db.execute(`SELECT value FROM meta WHERE key = 'last_games_sync'`)
    const last = row.rows[0]?.value as string | undefined
    if (last && Date.now() - new Date(last).getTime() < AUTO_SYNC_MAX_AGE_MIN * 60_000) return
    await syncGames()
  } catch (e) {
    console.error('Auto-sync failed:', e)
  }
}
