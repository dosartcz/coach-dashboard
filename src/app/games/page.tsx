'use client'
import { useState, useEffect, useCallback } from 'react'
import type { DbMatch } from '@/types/hockey'
import { matchSlug } from '@/lib/slug'
import { TeamLogo } from '@/components/TeamLogo'

interface LeagueTeam {
  id: string
  name: string
  city: string
  code: string
  nickname: string
  division_long_name: string
  team_logo_url: string
}

interface GameResult {
  ourScore: number
  theirScore: number
  label: string
  color: string
}

/** Build a result badge from DB columns (filled in by ↻ Sync). */
function gameResult(m: DbMatch): GameResult | undefined {
  if (m.home_score == null || m.away_score == null) return undefined
  if (m.type === 'api' && m.final !== '1') return undefined
  const our = m.home_away === 'home' ? m.home_score : m.away_score
  const their = m.home_away === 'home' ? m.away_score : m.home_score
  const suffix = m.shootout ? ' SO' : m.overtime ? ' OT' : ''
  const won = our > their
  const lost = our < their
  return {
    ourScore: our,
    theirScore: their,
    label: `${won ? 'W' : lost ? 'L' : 'T'} ${our}–${their}${suffix}`,
    color: won ? 'text-green-400' : lost ? 'text-red-400' : 'text-yellow-400',
  }
}

interface AddGameForm {
  date: string
  time: string
  opponent_team_id: string
  opponent_name: string
  home_away: 'home' | 'away'
  notes: string
}

export default function GamesPage() {
  const [games, setGames] = useState<DbMatch[]>([])
  const [teams, setTeams] = useState<LeagueTeam[]>([])
  const [upcomingPage, setUpcomingPage] = useState(0)
  const [pastPage, setPastPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const PAGE_SIZE = 8
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<AddGameForm>({ date: '', time: '', opponent_team_id: '', opponent_name: '', home_away: 'home', notes: '' })
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  const loadGames = useCallback(async () => {
    setLoading(true)
    try {
      const [gamesRes, teamsRes] = await Promise.all([
        fetch('/api/games'),
        fetch('/api/teams'),
      ])
      const data = await gamesRes.json()
      const teamsData = await teamsRes.json()
      setTeams(teamsData)

      setGames(
        [...data].sort((a: DbMatch, b: DbMatch) => {
          const aUp = a.date >= today
          const bUp = b.date >= today
          if (aUp && !bUp) return -1
          if (!aUp && bUp) return 1
          if (aUp) return a.date.localeCompare(b.date)
          return b.date.localeCompare(a.date)
        })
      )
    } finally {
      setLoading(false)
    }
  }, [today])

  useEffect(() => { loadGames() }, [loadGames])

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/games/sync', { method: 'POST' })
      const data = await res.json()
      alert(`Synced: ${data.inserted} new games imported (${data.total} total in schedule).`)
      await loadGames()
    } catch {
      alert('Sync failed. Check console.')
    } finally {
      setSyncing(false)
    }
  }

  async function handleAddGame(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const isManual = !form.opponent_team_id || form.opponent_team_id === '__manual__'
      const selectedTeam = isManual ? null : teams.find((t) => t.id === form.opponent_team_id)
      const payload = {
        date: form.date,
        time: form.time || null,
        opponent_team_id: isManual ? null : form.opponent_team_id,
        opponent_name: selectedTeam ? `${selectedTeam.city} ${selectedTeam.nickname}` : form.opponent_name,
        home_away: form.home_away,
        notes: form.notes,
      }
      await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setShowAdd(false)
      setForm({ date: '', time: '', opponent_team_id: '', opponent_name: '', home_away: 'home', notes: '' })
      await loadGames()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this game?')) return
    await fetch(`/api/games/${id}`, { method: 'DELETE' })
    setGames((prev) => prev.filter((m) => m.id !== id))
  }

  const upcomingAll = games.filter((m) => m.date >= today)
  const upcomingTotalPages = Math.ceil(upcomingAll.length / PAGE_SIZE)
  const upcoming = upcomingAll.slice(upcomingPage * PAGE_SIZE, (upcomingPage + 1) * PAGE_SIZE)

  const pastAll = games.filter((m) => m.date < today)
  const pastTotalPages = Math.ceil(pastAll.length / PAGE_SIZE)
  const past = pastAll.slice(pastPage * PAGE_SIZE, (pastPage + 1) * PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-xl">Games</h2>
          <p className="text-white/40 text-sm mt-1">Manage games and lineups</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="bg-white/10 text-white text-sm font-medium px-4 py-2 rounded hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : '↻ Sync'}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-grizzly-gold text-grizzly-navy text-sm font-bold px-4 py-2 rounded hover:bg-grizzly-gold/90 transition-colors"
          >
            + Add Game
          </button>
        </div>
      </div>

      {/* Add game modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] rounded-xl p-6 w-full max-w-md border border-white/10 relative">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              aria-label="Close"
              className="absolute top-3 right-3 text-white/30 hover:text-white text-lg leading-none transition-colors"
            >
              ✕
            </button>
            <h3 className="text-white font-bold text-lg mb-4">Add Game</h3>
            <form onSubmit={handleAddGame} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60 text-xs uppercase tracking-wider block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full bg-white/10 text-white rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-grizzly-gold"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-xs uppercase tracking-wider block mb-1">Time</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                    className="w-full bg-white/10 text-white rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-grizzly-gold"
                  />
                </div>
              </div>
              <div>
                <label className="text-white/60 text-xs uppercase tracking-wider block mb-1">Opponent</label>
                <div className="flex items-center gap-2">
                  {form.opponent_team_id && form.opponent_team_id !== '__manual__' && (
                    <TeamLogo teamId={form.opponent_team_id} size={32} />
                  )}
                  <select
                    required
                    value={form.opponent_team_id}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '__manual__') {
                        setForm((f) => ({ ...f, opponent_team_id: '__manual__', opponent_name: '' }))
                      } else {
                        const team = teams.find((t) => t.id === val)
                        setForm((f) => ({ ...f, opponent_team_id: val, opponent_name: team ? `${team.city} ${team.nickname}` : '' }))
                      }
                    }}
                    className="flex-1 bg-white/10 text-white rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-grizzly-gold"
                  >
                    <option value="" disabled>Select opponent…</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>{team.city} {team.nickname}</option>
                    ))}
                    <option value="__manual__">Enter manually…</option>
                  </select>
                </div>
                {form.opponent_team_id === '__manual__' && (
                  <input
                    type="text"
                    required
                    placeholder="Team name"
                    value={form.opponent_name}
                    onChange={(e) => setForm((f) => ({ ...f, opponent_name: e.target.value }))}
                    className="w-full mt-2 bg-white/10 text-white rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-grizzly-gold placeholder-white/20"
                  />
                )}
              </div>
              <div>
                <label className="text-white/60 text-xs uppercase tracking-wider block mb-1">Home / Away</label>
                <div className="flex rounded-lg overflow-hidden bg-black/20">
                  {(['home', 'away'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, home_away: v }))}
                      className={`flex-1 py-2 text-sm font-semibold transition-colors ${form.home_away === v ? 'bg-grizzly-red text-white' : 'text-white/40 hover:text-white/70'}`}
                    >
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-white/60 text-xs uppercase tracking-wider block mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full bg-white/10 text-white rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-grizzly-gold resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving || (!form.opponent_team_id || (form.opponent_team_id === '__manual__' && !form.opponent_name))}
                  className="flex-1 bg-grizzly-gold text-grizzly-navy font-bold py-2 rounded hover:bg-grizzly-gold/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Add Game'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 bg-white/10 text-white py-2 rounded hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-white/40 text-sm text-center py-12">Loading…</div>
      ) : games.length === 0 ? (
        <div className="bg-white/5 rounded-xl p-10 text-center">
          <p className="text-white/40 mb-4">No games yet.</p>
          <p className="text-white/30 text-sm">Use &quot;Sync from HockeyTech&quot; to import the season schedule, or add a game manually.</p>
        </div>
      ) : (
        <>
          {upcomingAll.length > 0 && (
            <section>
              <h3 className="text-grizzly-gold text-xs font-bold uppercase tracking-wider mb-3">Upcoming</h3>
              <div className="space-y-2">
                {upcoming.map((m) => (
                  <GameRow key={m.id} game={m} onDelete={() => handleDelete(m.id)} result={gameResult(m)} />
                ))}
              </div>
              {upcomingTotalPages > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <button
                    onClick={() => setUpcomingPage((p) => Math.max(0, p - 1))}
                    disabled={upcomingPage === 0}
                    className="text-white/40 hover:text-white text-sm px-3 py-1 rounded disabled:opacity-20 transition-colors"
                  >
                    ‹ Earlier
                  </button>
                  <span className="text-white/30 text-xs">
                    {upcomingPage + 1} / {upcomingTotalPages}
                  </span>
                  <button
                    onClick={() => setUpcomingPage((p) => Math.min(upcomingTotalPages - 1, p + 1))}
                    disabled={upcomingPage >= upcomingTotalPages - 1}
                    className="text-white/40 hover:text-white text-sm px-3 py-1 rounded disabled:opacity-20 transition-colors"
                  >
                    Later ›
                  </button>
                </div>
              )}
            </section>
          )}
          {pastAll.length > 0 && (
            <section>
              <h3 className="text-white/30 text-xs font-bold uppercase tracking-wider mb-3">Past</h3>
              <div className="space-y-2">
                {past.map((m) => (
                  <GameRow key={m.id} game={m} past onDelete={() => handleDelete(m.id)} result={gameResult(m)} />
                ))}
              </div>
              {pastTotalPages > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <button
                    onClick={() => setPastPage((p) => Math.max(0, p - 1))}
                    disabled={pastPage === 0}
                    className="text-white/40 hover:text-white text-sm px-3 py-1 rounded disabled:opacity-20 transition-colors"
                  >
                    ‹ Newer
                  </button>
                  <span className="text-white/30 text-xs">
                    {pastPage + 1} / {pastTotalPages}
                  </span>
                  <button
                    onClick={() => setPastPage((p) => Math.min(pastTotalPages - 1, p + 1))}
                    disabled={pastPage >= pastTotalPages - 1}
                    className="text-white/40 hover:text-white text-sm px-3 py-1 rounded disabled:opacity-20 transition-colors"
                  >
                    Older ›
                  </button>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}

function GameRow({ game, onDelete, past, result }: { game: DbMatch; onDelete: () => void; past?: boolean; result?: GameResult }) {
  const canDelete = !(past && game.type === 'api')
  return (
    <div className="relative group">
    <a
      href={`/games/${matchSlug(game)}`}
      className={`flex items-center gap-4 rounded-xl px-4 py-3 border transition-colors ${
      past
        ? 'bg-white/5 border-white/10 hover:border-white/30'
        : 'bg-white border-white/20 hover:border-grizzly-gold/60'
    }`}>
      {/* Date + time */}
      <div className="w-40 flex-shrink-0">
        <div className={`text-sm font-bold ${past ? 'text-white/50' : 'text-black'}`}>
          {new Date(game.date + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}
          {game.time && <span className={`ml-2 ${past ? 'text-white/30' : 'text-black/40'}`}>{game.time.slice(0, 5)}</span>}
        </div>
      </div>

      {/* Home/Away badge */}
      <div className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded ${
        game.home_away === 'home'
          ? past ? 'bg-grizzly-gold/40 text-white/50' : 'bg-grizzly-gold text-white'
          : past ? 'bg-grizzly-red/40 text-white/50' : 'bg-grizzly-red text-white'
      }`}>
        {game.home_away === 'home' ? 'HOME' : 'AWAY'}
      </div>

      {/* Logo + name */}
      <div className="flex items-center gap-3 flex-1 min-w-0 ml-2">
        {game.opponent_team_id && (
          <span style={{ opacity: past ? 0.6 : 1 }} className="shrink-0">
            <TeamLogo teamId={game.opponent_team_id} size={28} />
          </span>
        )}
        <div className="min-w-0">
          <span className={`font-semibold truncate block ${past ? 'text-white/60' : 'text-black'}`}>
            {game.opponent_name}
          </span>
          {game.notes && (
            <p className={`text-xs truncate mt-0.5 ${past ? 'text-white/30' : 'text-black/40'}`}>{game.notes}</p>
          )}
        </div>
      </div>

      {/* Result / lineup hint */}
      <div className="flex items-center gap-2 flex-shrink-0 pr-5">
        {past ? (
          result && (
            <span className={`text-sm font-bold tabular-nums ${result.color}`}>
              {result.label}
            </span>
          )
        ) : (
          <span className="border border-black/20 text-black text-xs font-bold px-3 py-1.5 rounded group-hover:bg-grizzly-gold group-hover:border-grizzly-gold group-hover:text-white transition-colors">
            Lineup
          </span>
        )}
      </div>
    </a>
    {/* Delete — sibling of the link (a button must not be nested in an anchor) */}
    {canDelete && (
      <button
        onClick={onDelete}
        className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm transition-colors opacity-0 group-hover:opacity-100 leading-none ${
          past ? 'text-white/30 hover:text-red-400' : 'text-black/30 hover:text-red-500'
        }`}
      >
        ✕
      </button>
    )}
    </div>
  )
}
