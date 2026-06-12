'use client'
import { useState, useEffect, useCallback } from 'react'
import type { PlayerNote } from '@/types/hockey'
import Link from 'next/link'
import { playerSlug } from '@/lib/slug'
import PlayerSilhouette from '@/components/PlayerSilhouette'

interface PlayerData {
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
  position_override?: string | null
  status?: string | null
  gp?: string
  g?: string
  a?: string
  pts?: string
  pim?: string
}

interface CareerRow {
  season_name: string
  team_name?: string
  games_played: string | number
  goals: string | number
  assists: string | number
  points: string | number
  penalty_minutes: string | number
  power_play_goals: string | number
  short_handed_goals: string | number
}

interface CareerSection {
  title: string
  data: CareerRow[]
}

const CAREER_COLS: { key: keyof CareerRow; label: string }[] = [
  { key: 'season_name', label: 'Season' },
  { key: 'team_name', label: 'Team' },
  { key: 'games_played', label: 'GP' },
  { key: 'goals', label: 'G' },
  { key: 'assists', label: 'A' },
  { key: 'points', label: 'PTS' },
  { key: 'penalty_minutes', label: 'PIM' },
  { key: 'power_play_goals', label: 'PPG' },
  { key: 'short_handed_goals', label: 'SHG' },
]

const F_POSITIONS = ['LW', 'C', 'RW'] as const
const D_POSITIONS = ['LD', 'RD'] as const

export default function PlayerDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('')
  const [player, setPlayer] = useState<PlayerData | null>(null)
  const [careerSections, setCareerSections] = useState<CareerSection[]>([])
  const [notes, setNotes] = useState<PlayerNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingNote, setSavingNote] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [posOverride, setPosOverride] = useState('')
  const [savingPos, setSavingPos] = useState(false)
  const [birthDateFull, setBirthDateFull] = useState<string | null>(null)
  const [playerStatus, setPlayerStatus] = useState<string>('')
  const [savingStatus, setSavingStatus] = useState(false)
  const [notesPage, setNotesPage] = useState(0)
  const NOTES_PER_PAGE = 5

  useEffect(() => {
    params.then(({ slug }) => setSlug(slug))
  }, [params])

  const loadPlayer = useCallback(async (slug: string) => {
    setLoading(true)
    try {
      const [rosterRes, seasonRes] = await Promise.all([
        fetch('/api/roster'),
        fetch('/api/season-ids'),
      ])
      const roster: PlayerData[] = await rosterRes.json()
      const seasons: { regular: string | null; playoffs: string } = await seasonRes.json()

      const found = roster.find((p) => playerSlug(p.name, p.birthdate_year) === slug)
      if (!found) { setNotFound(true); return }
      setPlayer(found)
      setPosOverride(found.position_override ?? '')
      setPlayerStatus(found.status ?? '')

      const notesRes = await fetch(`/api/player-notes?playerId=${found.player_id}`)
      setNotes(await notesRes.json())
      setNotesPage(0)

      // Non-blocking: career stats + birthdate in parallel
      Promise.all([
        fetch(`/api/player-career/${found.player_id}`).then((r) => r.json()).catch(() => []),
        fetch(`/api/player-bio/${found.player_id}`).then((r) => r.json()).catch(() => ({})),
      ]).then(([career, bio]) => {
        if (Array.isArray(career)) setCareerSections(career)
        if (bio?.birthdate) setBirthDateFull(bio.birthdate)
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (slug) loadPlayer(slug)
  }, [slug, loadPlayer])

  async function saveStatus(val: string) {
    if (!player || savingStatus) return
    const next = playerStatus === val ? '' : val
    setPlayerStatus(next)
    setSavingStatus(true)
    try {
      await fetch('/api/player-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: player.player_id, status: next || null }),
      })
    } finally {
      setSavingStatus(false)
    }
  }

  async function savePositionOverride(pos: string) {
    if (!player || savingPos) return
    const next = posOverride === pos ? '' : pos
    setPosOverride(next)
    setSavingPos(true)
    try {
      await fetch('/api/player-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: player.player_id, position_override: next || null }),
      })
    } finally {
      setSavingPos(false)
    }
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault()
    if (!newNote.trim() || !player) return
    setSavingNote(true)
    try {
      const res = await fetch('/api/player-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: player.player_id, note: newNote.trim() }),
      })
      const saved: PlayerNote = await res.json()
      setNotes((prev) => [saved, ...prev])
      setNotesPage(0)
      setNewNote('')
    } finally {
      setSavingNote(false)
    }
  }

  async function deleteNote(id: number) {
    await fetch(`/api/player-notes/${id}`, { method: 'DELETE' })
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id)
      const maxPage = Math.max(0, Math.ceil(next.length / NOTES_PER_PAGE) - 1)
      setNotesPage((p) => Math.min(p, maxPage))
      return next
    })
  }

  if (loading) return <div className="text-white/40 text-sm text-center py-24">Loading…</div>

  if (notFound || !player) {
    return (
      <div className="text-center py-24 text-white/40">
        Player not found.{' '}
        <Link href="/roster" className="underline text-grizzly-gold">Back to roster</Link>
      </div>
    )
  }

  const nameParts = player.name.trim().split(' ')
  const firstName = nameParts[0]
  const lastName = nameParts.slice(1).join(' ') || firstName

  const isForward = player.position === 'F'
  const isDefence = player.position === 'D'
  const showPositionPreference = isForward || isDefence
  const positionOptions = isForward ? F_POSITIONS : D_POSITIONS
  const posLabel = posOverride || (player.position === 'D' ? 'D' : player.position === 'G' ? 'G' : 'F')

  const dateDisplay = birthDateFull
    ? birthDateFull  // ISO: "2005-07-25"
    : player.birthdate_year
      ? player.birthdate_year.replace(/^'/, '20')
      : null

  const bioItems = [
    player.shoots && `Shoots ${player.shoots}`,
    player.catches && `Catches ${player.catches}`,
    player.h,
    player.w && `${player.w} lbs`,
    dateDisplay,
    player.hometown?.replace(/\s*,\s*/g, ', ').replace(/,\s*$/, '').trim(),
  ].filter(Boolean) as string[]


  return (
    <div className="space-y-6">
      <Link href="/roster" className="text-white/40 text-sm hover:text-grizzly-gold transition-colors">
        ← Roster
      </Link>

      {/* Profile card — white bg, full width */}
      <div className="bg-white rounded-xl overflow-hidden flex items-stretch shadow-lg gap-4" style={{ height: 160 }}>
        {/* Jersey number — always square via aspect-ratio */}
        <div className="flex-shrink-0 self-stretch flex items-center justify-center" style={{ aspectRatio: '1 / 1', backgroundColor: '#87703e' }}>
          <span className="text-white font-black leading-none" style={{ fontSize: '4rem' }}>
            #{player.tp_jersey_number}
          </span>
        </div>

        {/* Photo — wider than tall so cover crops from bottom only */}
        <div className="flex-shrink-0 self-stretch overflow-hidden" style={{ width: 195 }}>
          <PlayerPhoto playerId={player.player_id} />
        </div>

        {/* Name + details */}
        <div className="flex-1 px-6 py-4 flex flex-col justify-center min-w-0">
          <div className="leading-tight" style={{ fontSize: '3rem' }}>
            <span className="text-gray-900 font-bold">{lastName}</span>
            <span className="text-gray-900 font-light">, {firstName}</span>
          </div>
          {bioItems.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-y-0.5 text-sm text-gray-700">
              {bioItems.map((item, i) => (
                <span key={i} className="flex items-center">
                  {i > 0 && <span className="mx-2 text-gray-400">|</span>}
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Status icon + Position — right edge */}
        <div className="flex items-center gap-6 px-6 flex-shrink-0">
          {playerStatus === 'injury' && (
            <span className="font-black leading-none select-none" style={{ fontSize: '3rem', color: '#E8000D' }}>✚</span>
          )}
          {playerStatus === 'not_available' && (
            <span className="text-gray-900 font-black leading-none select-none" style={{ fontSize: '3rem' }}>⊘</span>
          )}
          <span className="text-gray-700 font-black leading-none" style={{ fontSize: '4rem' }}>
            {posLabel}
          </span>
        </div>
      </div>

      {/* Career stats */}
      {careerSections.length > 0 ? (
        <div className="bg-white/5 rounded-xl p-5 border border-white/10 space-y-4">
          <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider">Stats</h3>
          {careerSections.map((section) => {
            const rows = section.data.filter((r) => r.season_name !== 'Total')
            const total = section.data.find((r) => r.season_name === 'Total')
            const isPlayoffs = section.title.toLowerCase().includes('playoff')
            return (
              <div key={section.title} className="overflow-x-auto">
                <table className="w-full text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {CAREER_COLS.map(({ key, label }) => (
                        <th key={key} className={`pb-1.5 text-xs font-bold uppercase tracking-wider border-b border-white/10 ${key === 'season_name' ? 'text-left pr-4 text-white/40' : key === 'team_name' ? 'text-left pr-4 text-white/30' : 'text-center px-2 text-white/30'}`}>
                          {key === 'season_name' ? section.title : label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        {CAREER_COLS.map(({ key }) => (
                          <td key={key} className={`py-2 text-white/80 ${key === 'season_name' ? 'pr-4 text-left' : key === 'team_name' ? 'pr-4 text-left text-white/50' : 'px-2 text-center'} ${key === 'points' ? 'text-grizzly-gold font-bold' : ''}`}>
                            {row[key] ?? '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {total && (
                      <tr className="border-t border-white/20">
                        {CAREER_COLS.map(({ key }) => (
                          <td key={key} className={`py-2 font-bold text-white ${key === 'season_name' ? 'pr-4 text-left text-white/50 text-xs uppercase tracking-wider' : key === 'team_name' ? 'pr-4' : 'px-2 text-center'} ${key === 'points' ? 'text-grizzly-gold' : ''}`}>
                            {key === 'season_name' ? 'Total' : key === 'team_name' ? '' : (total[key] ?? '')}
                          </td>
                        ))}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-white/20 text-sm text-center py-4">Loading stats…</div>
      )}

      {/* Status + Position override — side by side on desktop */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Player status */}
        <div className="bg-white/5 rounded-xl p-5 border border-white/10 flex-1">
          <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">Status Update</h3>
          <div className="flex gap-2">
            {(['injury', 'not_available'] as const).map((val) => (
              <button
                key={val}
                onClick={() => saveStatus(val)}
                disabled={savingStatus}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-colors ${
                  playerStatus === val
                    ? 'bg-grizzly-red text-white'
                    : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white'
                }`}
              >
                <span>{val === 'injury' ? '✚' : '⊘'}</span>
                {val === 'injury' ? 'Injury' : 'Not Available'}
              </button>
            ))}
            {playerStatus && (
              <button
                onClick={() => saveStatus(playerStatus)}
                disabled={savingStatus}
                className="px-4 py-2 rounded-lg text-sm text-white/30 hover:text-white/60 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Position preference — forwards + defence */}
        {showPositionPreference && (
        <div className="bg-white/5 rounded-xl p-5 border border-white/10 flex-1">
          <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">Position Preference</h3>
          <div className="flex gap-2">
            {positionOptions.map((pos) => (
              <button
                key={pos}
                onClick={() => savePositionOverride(pos)}
                disabled={savingPos}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-colors ${
                  posOverride === pos
                    ? 'bg-grizzly-gold text-grizzly-navy'
                    : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white'
                }`}
              >
                {pos}
              </button>
            ))}
            {posOverride && (
              <button
                onClick={() => savePositionOverride(posOverride)}
                disabled={savingPos}
                className="px-4 py-2 rounded-lg text-sm text-white/30 hover:text-white/60 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Notes */}
      <div className="bg-white/5 rounded-xl p-5 border border-white/10">
        <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">Coach Notes</h3>
        <form onSubmit={addNote} className="flex flex-col gap-2 mb-4">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note about this player…"
            rows={2}
            className="w-full bg-white/5 text-white rounded-lg px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-grizzly-gold resize-none placeholder-white/20"
          />
          <button
            type="submit"
            disabled={savingNote || !newNote.trim()}
            className="bg-grizzly-gold text-grizzly-navy text-sm font-bold px-4 py-2 rounded-lg hover:bg-grizzly-gold/90 transition-colors disabled:opacity-40 self-start"
          >
            Save
          </button>
        </form>
        <div className="space-y-2">
          {notes.length === 0 ? (
            <p className="text-white/20 text-sm text-center py-4">No notes yet.</p>
          ) : (
            <>
              {notes.slice(notesPage * NOTES_PER_PAGE, (notesPage + 1) * NOTES_PER_PAGE).map((note) => (
                <div key={note.id} className="flex items-start gap-3 bg-white/5 rounded-lg px-4 py-3 border border-white/5 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm">{note.note}</p>
                    <p className="text-white/30 text-xs mt-1">{new Date(note.created_at).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="text-white/20 hover:text-red-400 text-xs transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                  >
                    Delete
                  </button>
                </div>
              ))}
              {notes.length > NOTES_PER_PAGE && (
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => setNotesPage((p) => p - 1)}
                    disabled={notesPage === 0}
                    className="text-white/30 hover:text-white/60 text-sm disabled:opacity-0 transition-colors"
                  >
                    ← Newer
                  </button>
                  <span className="text-white/20 text-xs">
                    {notesPage + 1} / {Math.ceil(notes.length / NOTES_PER_PAGE)}
                  </span>
                  <button
                    onClick={() => setNotesPage((p) => p + 1)}
                    disabled={(notesPage + 1) * NOTES_PER_PAGE >= notes.length}
                    className="text-white/30 hover:text-white/60 text-sm disabled:opacity-0 transition-colors"
                  >
                    Older →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function PlayerPhoto({ playerId }: { playerId: string }) {
  const [err, setErr] = useState(false)
  if (err) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <PlayerSilhouette />
      </div>
    )
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={`https://assets.leaguestat.com/kijhl/240x240/${playerId}.jpg`}
      alt=""
      style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
      onError={() => setErr(true)}
    />
  )
}
