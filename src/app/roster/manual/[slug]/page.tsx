'use client'
import { useState, useEffect, useCallback } from 'react'
import type { ManualPlayer, PlayerNote } from '@/types/hockey'

const NOTES_PER_PAGE = 5

function norm(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function manualPlayerSlug(player: ManualPlayer): string {
  const parts = player.name.trim().split(/\s+/)
  const first = parts[0] ?? ''
  const last = parts.slice(1).join(' ')
  const yy = player.birthdate ? player.birthdate.slice(2, 4) : ''
  const pieces = last ? [norm(last), norm(first)] : [norm(first)]
  if (yy) pieces.push(yy)
  pieces.push(String(player.id))
  return pieces.join('-')
}

export default function ManualPlayerDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('')
  const [player, setPlayer] = useState<ManualPlayer | null>(null)
  const [notes, setNotes] = useState<PlayerNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const [playerStatus, setPlayerStatus] = useState<string>('')
  const [savingStatus, setSavingStatus] = useState(false)
  const [posOverride, setPosOverride] = useState('')
  const [savingPos, setSavingPos] = useState(false)
  const [notesPage, setNotesPage] = useState(0)

  useEffect(() => {
    params.then(({ slug }) => setSlug(slug))
  }, [params])

  const playerId = player ? `manual-${player.id}` : ''

  const loadData = useCallback(async (slug: string) => {
    setLoading(true)
    try {
      // ID is always the last segment of the slug (e.g. "novak-jan-05-42" → "42")
      const segments = slug.split('-')
      const id = segments[segments.length - 1]
      if (!id || isNaN(Number(id))) { setNotFound(true); return }

      const pid = `manual-${id}`
      const [playerRes, notesRes, settingsRes] = await Promise.all([
        fetch(`/api/manual-players/${id}`),
        fetch(`/api/player-notes?playerId=${pid}`),
        fetch(`/api/player-settings?playerId=${pid}`),
      ])
      if (!playerRes.ok) { setNotFound(true); return }

      const [playerData, notesData, settingsData] = await Promise.all([
        playerRes.json(),
        notesRes.json(),
        settingsRes.json(),
      ])

      setPlayer(playerData)
      setNotes(notesData)
      setPlayerStatus(settingsData?.status ?? '')
      setPosOverride(settingsData?.position_override ?? '')
      setNotesPage(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (slug) loadData(slug)
  }, [slug, loadData])

  async function saveStatus(val: string) {
    if (!playerId || savingStatus) return
    const next = playerStatus === val ? '' : val
    setPlayerStatus(next)
    setSavingStatus(true)
    try {
      await fetch('/api/player-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId, status: next || null }),
      })
    } finally {
      setSavingStatus(false)
    }
  }

  async function savePositionOverride(pos: string) {
    if (!playerId || savingPos) return
    const next = posOverride === pos ? '' : pos
    setPosOverride(next)
    setSavingPos(true)
    try {
      await fetch('/api/player-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId, position_override: next || null }),
      })
    } finally {
      setSavingPos(false)
    }
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault()
    if (!newNote.trim() || !playerId) return
    setSavingNote(true)
    try {
      const res = await fetch('/api/player-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId, note: newNote.trim() }),
      })
      const saved: PlayerNote = await res.json()
      setNotes((prev) => [saved, ...prev])
      setNotesPage(0)
      setNewNote('')
    } finally {
      setSavingNote(false)
    }
  }

  async function deleteNote(noteId: number) {
    await fetch(`/api/player-notes/${noteId}`, { method: 'DELETE' })
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== noteId)
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
        <a href="/roster" className="underline text-grizzly-gold">Back to roster</a>
      </div>
    )
  }

  const nameParts = player.name.trim().split(' ')
  const firstName = nameParts[0]
  const lastName = nameParts.slice(1).join(' ') || firstName

  const isForward = player.position === 'F'
  const isDefence = player.position === 'D'
  const showPositionPreference = isForward || isDefence
  const positionOptions = isForward ? (['LW', 'C', 'RW'] as const) : (['LD', 'RD'] as const)
  const posLabel = posOverride || player.position

  return (
    <div className="space-y-6">
      <a href="/roster" className="text-white/40 text-sm hover:text-grizzly-gold transition-colors">
        ← Roster
      </a>

      {/* Profile card */}
      <div className="bg-white rounded-xl overflow-hidden flex items-stretch shadow-lg gap-4" style={{ height: 160 }}>
        {/* Jersey number */}
        <div className="flex-shrink-0 self-stretch flex items-center justify-center" style={{ aspectRatio: '1 / 1', backgroundColor: '#87703e' }}>
          <span className="text-white font-black leading-none" style={{ fontSize: '4rem' }}>
            {player.jersey_number ? `#${player.jersey_number}` : '#'}
          </span>
        </div>

        {/* Photo or silhouette */}
        <div className="flex-shrink-0 self-stretch overflow-hidden bg-gray-100 flex items-center justify-center" style={{ width: 195 }}>
          {player.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={player.photo}
              alt=""
              style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
            />
          ) : (
            <svg viewBox="0 0 80 90" xmlns="http://www.w3.org/2000/svg" style={{ width: '55%', height: '55%' }}>
              <ellipse cx="40" cy="28" rx="18" ry="20" fill="#d1d5db" />
              <path d="M8 90 Q8 58 40 58 Q72 58 72 90Z" fill="#d1d5db" />
            </svg>
          )}
        </div>

        {/* Name + bio */}
        <div className="flex-1 px-6 py-4 flex flex-col justify-center min-w-0">
          <div className="leading-tight" style={{ fontSize: '3rem' }}>
            <span className="text-gray-900 font-bold">{lastName}</span>
            <span className="text-gray-900 font-light">, {firstName}</span>
          </div>
          {(() => {
            const items = [
              player.shoots && `Shoots ${player.shoots}`,
              player.birthdate,
            ].filter(Boolean) as string[]
            return items.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-y-0.5 text-sm text-gray-700">
                {items.map((item, i) => (
                  <span key={i} className="flex items-center">
                    {i > 0 && <span className="mx-2 text-gray-400">|</span>}
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-2 text-sm text-gray-400">Manually Added</div>
            )
          })()}
        </div>

        {/* Status icon + Position */}
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

      {/* Status + Position — side by side */}
      <div className="flex flex-col sm:flex-row gap-4">
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
