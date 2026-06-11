'use client'
import { TeamLogo } from './TeamLogo'
import type { LineupSlot, DbMatch } from '@/types/hockey'

// Proxy URLs for export (avoids CORS issues when html-to-image fetches images)
const exportPhoto = (id: string) => `/api/img?id=${id}`

const HASHTAGS = ['#RevelstokeGrizzlies', '#BeAGrizzly', '#KIJHL']
const GOLD = '#87703e'
const DISPLAY_FONT = 'var(--font-display), system-ui, sans-serif'

interface Props {
  slots: LineupSlot[]
  format: 'square' | 'story'
  match: DbMatch
  venue?: string | null
  ourTeamId: string
  /** player_id → transparent cutout (PNG data URL) */
  cutouts?: Record<string, string>
}

/** Player card — same look as the in-app lineup card: number | photo | name. */
function PlayerCard({ slot, height, scale = 1, cutout }: { slot: LineupSlot; height: number; scale?: number; cutout?: string }) {
  if (!slot.player) {
    return (
      <div
        style={{
          flex: 1,
          height,
          borderRadius: 10,
          border: '1px dashed rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.2)',
          fontSize: 16 * scale,
          fontWeight: 700,
        }}
      >
        {slot.label}
      </div>
    )
  }
  const parts = slot.player.name.trim().split(' ')
  const firstName = parts[0]
  const lastName = parts.slice(1).join(' ') || firstName
  const displayFirst = `${lastName}, ${firstName}`.length > 15 ? `${firstName[0]}.` : firstName

  return (
    <div
      style={{
        flex: 1,
        height,
        borderRadius: 10,
        overflow: 'hidden',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'stretch',
        minWidth: 0,
      }}
    >
      {/* Number */}
      <div
        style={{
          flexShrink: 0,
          width: 64 * scale,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: GOLD,
          fontFamily: DISPLAY_FONT,
          fontWeight: 400,
          fontSize: 26 * scale,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        #{slot.player.tp_jersey_number}
      </div>
      {/* Photo — no backdrop, cutouts sit directly on the white card */}
      <div style={{ flexShrink: 0, width: 58 * scale }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={(cutout?.startsWith('data:') ? cutout : null) || slot.player.photo || exportPhoto(slot.player.player_id)}
          alt=""
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
        />
      </div>
      {/* Name */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 12,
          paddingRight: 8,
          minWidth: 0,
          fontSize: 23 * scale,
          lineHeight: 1.1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        <span style={{ fontWeight: 700, color: '#000' }}>{lastName}</span>
        <span style={{ color: 'rgba(0,0,0,0.3)' }}>,&nbsp;</span>
        <span style={{ fontWeight: 300, color: 'rgba(0,0,0,0.7)' }}>{displayFirst}</span>
      </div>
    </div>
  )
}

export default function LineupImageExport({ slots, format, match, venue, ourTeamId, cutouts = {} }: Props) {
  const story = format === 'story'
  const W = 1080
  const H = story ? 1920 : 1080
  const pad = 48
  const cardH = story ? 84 : 62
  const scale = story ? 1.15 : 1
  const gap = story ? 14 : 10

  const lines = [
    slots.filter((s) => s.id.startsWith('l1')),
    slots.filter((s) => s.id.startsWith('l2')),
    slots.filter((s) => s.id.startsWith('l3')),
    slots.filter((s) => s.id.startsWith('l4')),
  ]
  const pairs = [
    slots.filter((s) => s.id.startsWith('p1')),
    slots.filter((s) => s.id.startsWith('p2')),
    slots.filter((s) => s.id.startsWith('p3')),
  ]
  const goalies = slots.filter((s) => s.id.startsWith('g'))

  const dateLabel = new Date(match.date + 'T12:00:00').toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
  const metaItems = [dateLabel, match.time ? match.time.slice(0, 5) : null, venue].filter(Boolean)

  const sectionLabel = (text: string) => (
    <div
      style={{
        fontSize: story ? 17 : 14,
        color: 'rgba(255,255,255,0.35)',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        marginBottom: 6,
      }}
    >
      {text}
    </div>
  )

  const logoSize = story ? 170 : 150

  // ── 9:16 story — simple text layout: vertical badges + "number | NAME" ──────
  if (story) {
    const entry = (slot: LineupSlot, i: number) => {
      if (!slot.player) return <div key={slot.id + i} style={{ flex: 1 }} />
      const last = slot.player.name.trim().split(' ').slice(-1)[0]
      return (
        <div key={slot.id} style={{ display: 'flex', alignItems: 'baseline', gap: 12, flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: DISPLAY_FONT, color: GOLD, fontWeight: 400, fontSize: 32, width: 52, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
            {slot.player.tp_jersey_number}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 26, fontWeight: 300 }}>|</span>
          <span
            style={{
              fontFamily: DISPLAY_FONT, color: '#fff', fontWeight: 400, fontSize: 32, textTransform: 'uppercase',
              letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden',
            }}
          >
            {last}
          </span>
        </div>
      )
    }

    const badge = (text: string) => (
      <div
        style={{
          display: 'inline-flex',
          background: '#ffffff',
          borderRadius: 10,
          color: '#000000',
          mixBlendMode: 'screen', // knockout — letters show the background through
          fontFamily: DISPLAY_FONT,
          fontWeight: 400,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          fontSize: 21,
          padding: '8px 20px',
        }}
      >
        {text}
      </div>
    )

    const section = (label: string, rows: LineupSlot[][]) => (
      <div>
        <div style={{ marginBottom: 20 }}>{badge(label)}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26, minWidth: 0 }}>
          {rows.map((row, ri) => (
            <div key={ri} style={{ display: 'flex', gap: 20 }}>
              {row.map((s, i) => entry(s, i))}
            </div>
          ))}
        </div>
      </div>
    )

    return (
      <div
        style={{
          backgroundColor: '#111111',
          backgroundImage: 'url(/revelstoke-bg-9-16.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          width: W,
          height: H,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#fff',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: 64,
        }}
      >
        {/* Header — pushed down, phones overlay their UI at the top of stories */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, marginTop: 72 }}>
          <div>
            <div style={{ fontFamily: DISPLAY_FONT, fontSize: 98, fontWeight: 400, lineHeight: 0.95, color: 'rgba(255,255,255,0.6)' }}>STARTING</div>
            <div style={{ fontFamily: DISPLAY_FONT, fontSize: 98, fontWeight: 400, lineHeight: 0.95 }}>LINEUP</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <TeamLogo teamId={ourTeamId} size={217} />
            {match.opponent_team_id ? (
              <TeamLogo teamId={match.opponent_team_id} size={217} />
            ) : (
              <span style={{ fontSize: 24, fontWeight: 700 }}>{match.opponent_name}</span>
            )}
          </div>
        </div>
        <div style={{ marginTop: 20, paddingBottom: 28 }}>
          <div style={{ fontSize: 25, color: 'rgba(255,255,255,0.92)' }}>
            {[dateLabel, match.time ? match.time.slice(0, 5) : null].filter(Boolean).join('  ·  ')}
          </div>
          {venue && (
            <div style={{ fontSize: 25, color: 'rgba(255,255,255,0.92)', marginTop: 6 }}>{venue}</div>
          )}
        </div>

        {/* Sections */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', marginTop: 8, paddingBottom: 56 }}>
          {section('Offense', lines)}
          {section('Defense', pairs)}
          {section('Goalies', [goalies])}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 24,
            paddingTop: 26,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Sponsored by
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/save-on-foods.png" alt="Save-On-Foods" style={{ height: 52, width: 'auto' }} />
          </div>
          <div style={{ display: 'flex', gap: 28, fontSize: 21, color: GOLD, fontWeight: 700 }}>
            {HASHTAGS.map((h) => <span key={h}>{h}</span>)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        backgroundColor: '#111111',
        backgroundImage: 'url(/revelstoke-bg-1-1.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        width: W,
        height: H,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#fff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: pad,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: story ? 64 : 60, fontWeight: 400, letterSpacing: '0.02em', lineHeight: 1 }}>
            STARTING LINEUP
          </div>
          <div style={{ fontSize: story ? 24 : 20, color: 'rgba(255,255,255,0.55)', marginTop: 12 }}>
            {metaItems.join('  ·  ')}
          </div>
        </div>
        {/* Matchup logos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0, marginLeft: 24 }}>
          <TeamLogo teamId={ourTeamId} size={logoSize} />
          {match.opponent_team_id ? (
            <TeamLogo teamId={match.opponent_team_id} size={logoSize} />
          ) : (
            <span style={{ fontSize: 22, fontWeight: 700 }}>{match.opponent_name}</span>
          )}
        </div>
      </div>

      {/* Lineup — evenly distributed */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-evenly',
          marginTop: story ? 28 : 20,
        }}
      >
        {lines.map((line, i) => (
          <div key={i}>
            {sectionLabel(`Line ${i + 1}`)}
            <div style={{ display: 'flex', gap }}>{line.map((s) => <PlayerCard key={s.id} slot={s} height={cardH} scale={scale} cutout={s.player ? cutouts[s.player.player_id] : undefined} />)}</div>
          </div>
        ))}

        <div>
          {sectionLabel('Defence')}
          <div style={{ display: 'flex', flexDirection: 'column', gap }}>
            {pairs.map((pair, i) => (
              <div key={i} style={{ display: 'flex', gap }}>
                {pair.map((s) => (
                  <PlayerCard key={s.id} slot={s} height={cardH} scale={scale} cutout={s.player ? cutouts[s.player.player_id] : undefined} />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div>
          {sectionLabel('Goalies')}
          <div style={{ display: 'flex', gap }}>
            {goalies.map((s) => (
              <PlayerCard key={s.id} slot={s} height={cardH} scale={scale} cutout={s.player ? cutouts[s.player.player_id] : undefined} />
            ))}
          </div>
        </div>
      </div>

      {/* Footer — sponsors + hashtags */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: story ? 28 : 20,
          paddingTop: story ? 24 : 18,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Sponsored by
          </span>
          {/* Sponsor placeholder — swap for real logos */}
          <div
            style={{
              width: 140,
              height: 44,
              background: '#ffffff',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(0,0,0,0.25)',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            SPONSOR
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: story ? 20 : 17, color: GOLD, fontWeight: 700 }}>
          {HASHTAGS.map((h) => <span key={h}>{h}</span>)}
        </div>
      </div>
    </div>
  )
}
