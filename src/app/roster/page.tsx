'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { ManualPlayer } from '@/types/hockey'
import Link from 'next/link'
import { playerSlug, manualPlayerSlug } from '@/lib/slug'
import PlayerSilhouette from '@/components/PlayerSilhouette'

interface ApiPlayer {
  player_id: string
  name: string
  position: string
  tp_jersey_number: string
  birthdate_year?: string
  position_override?: string | null
  status?: string | null
  gp?: string
  g?: string
  a?: string
  pts?: string
  pim?: string
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

interface AddPlayerForm {
  name: string
  position: string
  jersey_number: string
  notes: string
  photo: string
  birthdate: string
  shoots: string
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<ApiPlayer[]>([])
  const [manualPlayers, setManualPlayers] = useState<ManualPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<AddPlayerForm>({ name: '', position: 'F', jersey_number: '', notes: '', photo: '', birthdate: '', shoots: '' })
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [posFilter, setPosFilter] = useState<'all' | 'F' | 'D' | 'G'>('all')
  const [cutoutProgress, setCutoutProgress] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [rosterRes, manualRes] = await Promise.all([
        fetch('/api/roster'),
        fetch('/api/manual-players'),
      ])
      const roster = await rosterRes.json()
      const manual = await manualRes.json()
      setPlayers(roster)
      setManualPlayers(manual)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Auto-process photo cutouts in the background — no coach interaction needed
  const cutoutRunning = useRef(false)
  useEffect(() => {
    if (loading || cutoutRunning.current) return
    if (players.length === 0 && manualPlayers.length === 0) return
    cutoutRunning.current = true
    handleProcessCutouts().finally(() => { cutoutRunning.current = false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, players, manualPlayers])

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch('/api/manual-players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setShowAdd(false)
      setForm({ name: '', position: 'F', jersey_number: '', notes: '', photo: '', birthdate: '', shoots: '' })
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      await Promise.all([
        loadData(),
        fetch('/api/birthdays/sync', { method: 'POST' }),
      ])
    } finally {
      setSyncing(false)
    }
  }

  /** Downscale a cutout blob to a compact PNG data URL for DB storage. */
  async function blobToDataUrl(blob: Blob, width = 240): Promise<string> {
    const bmp = await createImageBitmap(blob)
    const ratio = width / bmp.width
    const c = document.createElement('canvas')
    c.width = width
    c.height = Math.round(bmp.height * ratio)
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
    return c.toDataURL('image/png')
  }

  /** ML background removal for all player photos — results cached in the DB.
   *  Runs automatically in the background whenever players are missing a cutout. */
  async function handleProcessCutouts() {
    setCutoutProgress(null)
    try {
      const { removeBackground } = await import('@imgly/background-removal')
      const existing: Record<string, string> = await fetch('/api/player-cutouts').then((r) => r.json())

      const targets = [
        ...players.filter((p) => p.player_id).map((p) => ({ id: p.player_id, src: `/api/img?id=${p.player_id}` })),
        ...manualPlayers.filter((p) => p.photo).map((p) => ({ id: `manual-${p.id}`, src: p.photo! })),
      ].filter((t) => !existing[t.id])

      if (targets.length === 0) return

      let done = 0
      let failed = 0
      for (const t of targets) {
        setCutoutProgress(`Processing ${done + 1}/${targets.length}…`)
        try {
          // Fetch the photo ourselves — the library can't handle relative URLs
          const res = await fetch(t.src)
          if (!res.ok) {
            // No photo on the server — remember that so we don't retry every visit
            await fetch('/api/player-cutouts', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ player_id: t.id, photo: 'none' }),
            })
            done++
            continue
          }
          const srcBlob = await res.blob()
          const blob = await removeBackground(srcBlob)
          const photo = await blobToDataUrl(blob)
          await fetch('/api/player-cutouts', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player_id: t.id, photo }),
          })
        } catch (e) {
          console.error('Cutout failed for', t.id, e)
          failed++
        }
        done++
      }
      setCutoutProgress(failed > 0 ? `Done — ${failed} failed` : 'Done ✓')
    } catch (e) {
      console.error(e)
      setCutoutProgress('Failed — check console')
    } finally {
      setTimeout(() => setCutoutProgress(null), 4000)
    }
  }

  async function handleDeleteManual(id: number) {
    if (!confirm('Remove this player?')) return
    await fetch(`/api/manual-players/${id}`, { method: 'DELETE' })
    setManualPlayers((prev) => prev.filter((p) => p.id !== id))
  }

  const filtered = posFilter === 'all' ? players : players.filter((p) => p.position === posFilter)
  const filteredManual = posFilter === 'all'
    ? manualPlayers
    : manualPlayers.filter((p) => p.position === posFilter)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-xl">Roster</h2>
          <p className="text-white/40 text-sm mt-1">Player details and stats</p>
        </div>
        <div className="flex items-center gap-2">
          {cutoutProgress && <span className="text-white/40 text-xs">{cutoutProgress}</span>}
          <button
            onClick={handleSync}
            disabled={syncing || loading}
            className="bg-white/10 text-white/60 text-sm font-semibold px-4 py-2 rounded hover:bg-white/20 hover:text-white transition-colors disabled:opacity-40"
          >
            {syncing ? 'Syncing…' : '↻ Sync'}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-grizzly-gold text-grizzly-navy text-sm font-bold px-4 py-2 rounded hover:bg-grizzly-gold/90 transition-colors"
          >
            + Add Manually
          </button>
        </div>
      </div>

      {/* Add player modal */}
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
            <h3 className="text-white font-bold text-lg mb-4">Add Player</h3>
            <form onSubmit={handleAddPlayer} className="space-y-4">
              <div>
                <label className="text-white/60 text-xs uppercase tracking-wider block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="First Last"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white/10 text-white rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-grizzly-gold placeholder-white/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60 text-xs uppercase tracking-wider block mb-1">Position</label>
                  <select
                    value={form.position}
                    onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                    className="w-full bg-white/10 text-white rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-grizzly-gold"
                  >
                    <option value="F">Forward</option>
                    <option value="D">Defence</option>
                    <option value="G">Goalie</option>
                  </select>
                </div>
                <div>
                  <label className="text-white/60 text-xs uppercase tracking-wider block mb-1">Jersey #</label>
                  <input
                    type="text"
                    placeholder="00"
                    value={form.jersey_number}
                    onChange={(e) => setForm((f) => ({ ...f, jersey_number: e.target.value }))}
                    className="w-full bg-white/10 text-white rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-grizzly-gold placeholder-white/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60 text-xs uppercase tracking-wider block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={form.birthdate}
                    onChange={(e) => setForm((f) => ({ ...f, birthdate: e.target.value }))}
                    className="w-full bg-white/10 text-white rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-grizzly-gold [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-xs uppercase tracking-wider block mb-1">Shoots</label>
                  <select
                    value={form.shoots}
                    onChange={(e) => setForm((f) => ({ ...f, shoots: e.target.value }))}
                    className="w-full bg-white/10 text-white rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-grizzly-gold"
                  >
                    <option value="">—</option>
                    <option value="L">L</option>
                    <option value="R">R</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-white/60 text-xs uppercase tracking-wider block mb-1">Photo</label>
                <div className="flex items-center gap-3">
                  {form.photo && (
                    <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.photo} alt="" className="w-full h-full object-cover object-top" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = (ev) => {
                        const result = ev.target?.result
                        if (typeof result === 'string') setForm((f) => ({ ...f, photo: result }))
                      }
                      reader.readAsDataURL(file)
                    }}
                    className="text-white/60 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
                  />
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
                  disabled={saving}
                  className="flex-1 bg-grizzly-gold text-grizzly-navy font-bold py-2 rounded hover:bg-grizzly-gold/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Add Player'}
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
      ) : (
        <>
          {/* Position filter tabs */}
          <div className="flex rounded-lg overflow-hidden bg-black/20 w-fit">
            {(['all', 'F', 'D', 'G'] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => setPosFilter(pos)}
                className={`px-5 py-2 text-sm font-semibold transition-colors ${posFilter === pos ? 'bg-grizzly-gold text-grizzly-navy' : 'text-white/40 hover:text-white/70'}`}
              >
                {pos === 'all' ? 'All' : pos === 'F' ? 'Forwards' : pos === 'D' ? 'Defence' : 'Goalies'}
                <span className={`ml-1.5 text-xs ${posFilter === pos ? 'text-grizzly-navy/60' : 'text-white/20'}`}>
                  {pos === 'all'
                  ? players.length + manualPlayers.length
                  : players.filter((p) => p.position === pos).length +
                    manualPlayers.filter((p) => p.position === pos).length}
                </span>
              </button>
            ))}
          </div>

          {/* API Players grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {filtered.map((player, i) => (
              <Link
                key={player.player_id || `player-${i}`}
                href={`/roster/${playerSlug(player.name, player.birthdate_year)}`}
                className="bg-white hover:bg-gray-50 rounded-xl overflow-hidden flex items-stretch border border-gray-100 hover:border-grizzly-gold/40 transition-colors shadow-sm group"
                style={{ height: 90 }}
              >
                {/* Number */}
                <div className="flex-shrink-0 flex items-center justify-center px-3" style={{ minWidth: 56 }}>
                  <span className="text-grizzly-gold font-black leading-none" style={{ fontSize: '1.5rem' }}>#{player.tp_jersey_number}</span>
                </div>
                {/* Photo */}
                <div className="flex-shrink-0 overflow-hidden" style={{ width: 80 }}>
                  <PlayerPhoto playerId={player.player_id} />
                </div>
                {/* Name + position + status */}
                <div className="flex flex-col justify-center px-3 min-w-0">
                  <div className="text-gray-900 font-bold leading-none truncate" style={{ fontSize: '1rem' }}>
                    {player.name.split(' ').slice(-1)[0]}
                  </div>
                  <div className="text-gray-500 text-xs leading-none truncate mt-0.5">
                    {player.name.split(' ')[0]}
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-gray-900 text-xs font-bold">{player.position_override ?? player.position}</span>
                    {player.status === 'injury' && <span className="font-bold leading-none" style={{ color: '#E8000D', fontSize: '1rem' }}>✚</span>}
                    {player.status === 'not_available' && <span className="text-gray-700 font-bold leading-none" style={{ fontSize: '1rem' }}>⊘</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Manual Players section */}
          {filteredManual.length > 0 && (
            <section>
              <h3 className="text-white/30 text-xs font-bold uppercase tracking-wider mb-3">Manually Added Players</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {filteredManual.map((player) => (
                  <div key={player.id} className="relative group">
                  <Link
                    href={`/roster/manual/${manualPlayerSlug(player)}`}
                    className="bg-white hover:bg-gray-50 rounded-xl overflow-hidden flex items-stretch border border-gray-100 hover:border-grizzly-gold/40 transition-colors shadow-sm"
                    style={{ height: 90 }}
                  >
                    {/* Number */}
                    <div className="flex-shrink-0 flex items-center justify-center px-3" style={{ minWidth: 56 }}>
                      <span className="text-grizzly-gold font-black leading-none" style={{ fontSize: '1.5rem' }}>
                        {player.jersey_number ? `#${player.jersey_number}` : '#'}
                      </span>
                    </div>
                    {/* Photo or silhouette */}
                    <div className="flex-shrink-0 overflow-hidden bg-gray-100 flex items-center justify-center" style={{ width: 80 }}>
                      {player.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={player.photo} alt="" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
                      ) : (
                        <PlayerSilhouette />
                      )}
                    </div>
                    {/* Name + position + status */}
                    <div className="flex flex-col justify-center px-3 min-w-0">
                      <div className="text-gray-900 font-bold leading-none truncate" style={{ fontSize: '1rem' }}>
                        {player.name.split(' ').slice(-1)[0]}
                      </div>
                      <div className="text-gray-500 text-xs leading-none truncate mt-0.5">
                        {player.name.split(' ')[0]}
                      </div>
                      <div className="flex items-baseline gap-1.5 mt-2">
                        <span className="text-gray-900 text-xs font-bold">{player.position_override ?? player.position}</span>
                        {player.status === 'injury' && <span className="font-bold leading-none" style={{ color: '#E8000D', fontSize: '1rem' }}>✚</span>}
                        {player.status === 'not_available' && <span className="text-gray-700 font-bold leading-none" style={{ fontSize: '1rem' }}>⊘</span>}
                      </div>
                    </div>
                  </Link>
                  {/* Delete button — sibling of the link (a button must not be nested in an anchor) */}
                  <button
                    onClick={() => handleDeleteManual(player.id)}
                    className="absolute top-1 right-1 hidden group-hover:flex text-gray-300 hover:text-red-400 text-sm transition-colors leading-none"
                  >
                    ×
                  </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
