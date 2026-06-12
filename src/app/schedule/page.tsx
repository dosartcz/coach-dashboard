'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { DbMatch, DbEvent } from '@/types/hockey'
import { matchSlug } from '@/lib/slug'
import { TeamLogo } from '@/components/TeamLogo'

// Club palette: red = games, gold = training, muted red = meetings
const EVENT_COLORS: Record<string, string> = {
  game:     'bg-grizzly-red text-white',
  training: 'bg-grizzly-gold text-white',
  meeting:  'bg-grizzly-red/40 text-white',
  other:    'bg-white/20 text-white',
}

const EVENT_LABELS: Record<string, string> = {
  game: 'Game', training: 'Training', meeting: 'Meeting', other: 'Event',
}

interface CalendarItem {
  id?: number
  date: string
  type: 'match' | 'event' | 'birthday'
  label: string
  link?: string
  color: string
  time?: string | null
}

interface Birthday {
  name: string
  birthdate: string
}

interface AddEventForm {
  date: string
  time: string
  title: string
  type: string
  notes: string
  opponent: string
  opponent_team_id: string
  home_away: 'home' | 'away'
}

interface Team {
  id: string
  name: string
  city: string
  nickname: string
  team_logo_url: string
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

export default function SchedulePage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [matches, setMatches] = useState<DbMatch[]>([])
  const [events, setEvents] = useState<DbEvent[]>([])
  const [birthdays, setBirthdays] = useState<Birthday[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addDate, setAddDate] = useState('')
  const [form, setForm] = useState<AddEventForm>({ date: '', time: '', title: '', type: 'training', notes: '', opponent: '', opponent_team_id: '', home_away: 'home' })
  const [teams, setTeams] = useState<Team[]>([])
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const mk = monthKey(year, month)
    try {
      const [matchRes, eventRes, bdayRes] = await Promise.all([
        fetch('/api/games'),
        fetch(`/api/events?month=${mk}`),
        fetch('/api/birthdays'),
      ])
      const allMatches: DbMatch[] = await matchRes.json()
      setMatches(allMatches.filter((m) => m.date.startsWith(mk)))
      setEvents(await eventRes.json())
      setBirthdays(await bdayRes.json())
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    fetch('/api/teams').then((r) => r.json()).then(setTeams).catch(() => {})
  }, [])

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) }
    else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0) }
    else setMonth((m) => m + 1)
  }

  // Build items map: date → CalendarItem[]
  const itemsByDate = new Map<string, CalendarItem[]>()

  for (const m of matches) {
    const items = itemsByDate.get(m.date) ?? []
    items.push({
      id: m.id,
      date: m.date,
      type: 'match',
      label: `${m.home_away === 'home' ? 'vs' : '@'} ${m.opponent_name}`,
      link: `/games/${matchSlug(m)}`,
      color: 'bg-grizzly-red text-white',
    })
    itemsByDate.set(m.date, items)
  }

  for (const e of events) {
    const items = itemsByDate.get(e.date) ?? []
    items.push({
      id: e.id,
      date: e.date,
      type: 'event',
      label: e.title,
      link: e.match_id ? `/games/${e.match_id}` : undefined,
      color: EVENT_COLORS[e.type] ?? EVENT_COLORS.other,
      time: e.time,
    })
    itemsByDate.set(e.date, items)
  }

  // Birthdays — match by MM-DD in the currently displayed year
  const mm = String(month + 1).padStart(2, '0')
  for (const b of birthdays) {
    if (!b.birthdate) continue
    const [, bMonth, bDay] = b.birthdate.split('-')
    if (bMonth !== mm) continue
    const dateStr = `${year}-${bMonth}-${bDay}`
    const items = itemsByDate.get(dateStr) ?? []
    const lastName = b.name.trim().split(' ').slice(1).join(' ') || b.name
    items.push({
      date: dateStr,
      type: 'birthday',
      label: `🎂 ${lastName}`,
      color: 'bg-amber-500/20 text-amber-300',
    })
    itemsByDate.set(dateStr, items)
  }

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to complete rows
  while (cells.length % 7 !== 0) cells.push(null)

  const todayStr = new Date().toISOString().split('T')[0]

  function openAdd(day?: number) {
    const d = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : ''
    setAddDate(d)
    setForm({ date: d, time: '', title: '', type: 'training', notes: '', opponent: '', opponent_team_id: '', home_away: 'home' })
    setShowAdd(true)
  }

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/games/sync', { method: 'POST' })
      const data = await res.json()
      setSyncResult(`${data.inserted} new game${data.inserted !== 1 ? 's' : ''} added`)
      await loadData()
    } finally {
      setSyncing(false)
    }
  }

  async function handleDeleteItem(item: CalendarItem) {
    if (!confirm(`Delete "${item.label}"?`)) return
    if (item.type === 'match') {
      await fetch(`/api/games/${item.id}`, { method: 'DELETE' })
      setMatches((prev) => prev.filter((m) => m.id !== item.id))
    } else if (item.type === 'event') {
      await fetch(`/api/events/${item.id}`, { method: 'DELETE' })
      setEvents((prev) => prev.filter((e) => e.id !== item.id))
    }
  }

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (form.type === 'game') {
        await fetch('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: form.date,
            opponent_name: form.opponent,
            opponent_team_id: form.opponent_team_id || null,
            home_away: form.home_away,
            notes: form.notes || null,
          }),
        })
      } else {
        await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }
      setShowAdd(false)
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  const monthName = new Date(year, month, 1).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-white font-bold text-xl">Schedule</h2>
          <p className="text-white/40 text-sm mt-1">Calendar view of games and events</p>
        </div>
        <div className="flex items-center gap-2">
          {syncResult && (
            <span className="text-white/40 text-xs">{syncResult}</span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="bg-white/10 text-white/60 text-sm font-semibold px-4 py-2 rounded hover:bg-white/20 hover:text-white transition-colors disabled:opacity-40"
          >
            {syncing ? 'Syncing…' : '↻ Sync'}
          </button>
          <button
            onClick={() => openAdd()}
            className="bg-grizzly-gold text-grizzly-navy text-sm font-bold px-4 py-2 rounded hover:bg-grizzly-gold/90 transition-colors"
          >
            + Add Event
          </button>
        </div>
      </div>

      {/* Add event modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-xl p-6 w-full max-w-md border border-white/10 relative">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              aria-label="Close"
              className="absolute top-3 right-3 text-white/30 hover:text-white text-lg leading-none transition-colors"
            >
              ✕
            </button>
            <h3 className="text-white font-bold text-lg mb-4">Add Event</h3>
            <form onSubmit={handleAddEvent} className="space-y-4">
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
              {form.type === 'game' ? (
                <div className="space-y-3">
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
                            setForm((f) => ({ ...f, opponent_team_id: '__manual__', opponent: '' }))
                          } else {
                            const team = teams.find((t) => t.id === val)
                            setForm((f) => ({ ...f, opponent_team_id: val, opponent: team ? `${team.city} ${team.nickname}` : '' }))
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
                        value={form.opponent}
                        onChange={(e) => setForm((f) => ({ ...f, opponent: e.target.value }))}
                        className="w-full mt-2 bg-white/10 text-white rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-grizzly-gold placeholder-white/20"
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-white/60 text-xs uppercase tracking-wider block mb-1">Location</label>
                    <div className="flex rounded-lg overflow-hidden bg-black/20">
                      {(['home', 'away'] as const).map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, home_away: val }))}
                          className={`flex-1 py-2 text-sm font-semibold transition-colors capitalize ${form.home_away === val ? 'bg-grizzly-gold text-grizzly-navy' : 'text-white/40 hover:text-white/70'}`}
                        >
                          {val === 'home' ? 'Home' : 'Away'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-white/60 text-xs uppercase tracking-wider block mb-1">Title</label>
                  <input
                    type="text"
                    required
                    placeholder="Event title"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full bg-white/10 text-white rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-grizzly-gold placeholder-white/20"
                  />
                </div>
              )}
              <div>
                <label className="text-white/60 text-xs uppercase tracking-wider block mb-1">Type</label>
                <div className="grid grid-cols-4 rounded-lg overflow-hidden bg-black/20">
                  {Object.entries(EVENT_LABELS).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: val }))}
                      className={`py-2 text-xs font-semibold transition-colors ${form.type === val ? `${EVENT_COLORS[val]} opacity-100` : 'text-white/40 hover:text-white/70'}`}
                    >
                      {label}
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
                  disabled={saving}
                  className="flex-1 bg-grizzly-gold text-grizzly-navy font-bold py-2 rounded hover:bg-grizzly-gold/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Add Event'}
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

      {/* Calendar */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <button onClick={prevMonth} className="text-white/40 hover:text-white transition-colors px-2 py-1 text-lg">‹</button>
          <h3 className="text-white font-bold text-lg">{monthName}</h3>
          <button onClick={nextMonth} className="text-white/40 hover:text-white transition-colors px-2 py-1 text-lg">›</button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-white/5">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center text-[11px] font-bold text-white/30 py-2">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        {loading ? (
          <div className="text-white/40 text-sm text-center py-12">Loading…</div>
        ) : (
          <div className="grid grid-cols-7 border-r border-b border-white/5">
            {cells.map((day, i) => {
              const dateStr = day
                ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                : ''
              const items = day ? (itemsByDate.get(dateStr) ?? []) : []
              const isToday = dateStr === todayStr

              return (
                <div
                  key={i}
                  onClick={() => day && openAdd(day)}
                  className={`min-h-[120px] p-1.5 border-t border-l border-white/5 transition-colors ${!day ? 'pointer-events-none' : 'cursor-pointer hover:bg-white/5'} ${isToday ? 'bg-grizzly-gold/5' : ''}`}
                >
                  {day && (
                    <>
                      <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-grizzly-gold text-grizzly-navy' : 'text-white/50'}`}>
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {items.map((item, ii) => (
                          <div key={ii} className="group/item relative flex items-center">
                            {item.link ? (
                              <Link
                                href={item.link}
                                onClick={(e) => e.stopPropagation()}
                                className={`flex-1 block text-[10px] font-medium px-1.5 py-0.5 rounded truncate ${item.color} ${item.id ? 'pr-4' : ''}`}
                                title={item.label}
                              >
                                {item.time && <span className="opacity-70">{item.time.slice(0, 5)} </span>}
                                {item.label}
                              </Link>
                            ) : (
                              <div
                                className={`flex-1 block text-[10px] font-medium px-1.5 py-0.5 rounded truncate ${item.color} ${item.id ? 'pr-4' : ''}`}
                                title={item.label}
                              >
                                {item.time && <span className="opacity-70">{item.time.slice(0, 5)} </span>}
                                {item.label}
                              </div>
                            )}
                            {item.id && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteItem(item) }}
                                className="absolute right-0.5 top-0.5 text-white/0 group-hover/item:text-white/60 hover:!text-red-400 text-[9px] leading-none transition-colors"
                                title="Delete"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap">
        {Object.entries(EVENT_LABELS).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${EVENT_COLORS[type]}`} />
            <span className="text-white/40 text-xs">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-500/20" />
          <span className="text-white/40 text-xs">Birthday</span>
        </div>
      </div>
    </div>
  )
}
