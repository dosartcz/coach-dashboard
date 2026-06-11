'use client'
import { TeamLogo } from './TeamLogo'
import type { LineupSlot, DbMatch } from '@/types/hockey'

const HASHTAGS = ['#RevelstokeGrizzlies', '#BeAGrizzly', '#KIJHL']
const GOLD = '#87703e'
const DISPLAY_FONT = 'var(--font-display), system-ui, sans-serif'

interface Props {
  slots: LineupSlot[]
  format: 'square' | 'story'
  match: DbMatch
  venue?: string | null
  ourTeamId: string
  /** player_id → transparent cutout (PNG data URL) — kept for future photo variants */
  cutouts?: Record<string, string>
}

/**
 * Social media lineup graphic. Both formats share one centered text layout:
 * logos → STARTING LINEUP → date/time/venue → badged sections → sponsor footer.
 */
export default function LineupImageExport({ slots, format, match, venue, ourTeamId }: Props) {
  const story = format === 'story'

  // Size config per format
  const cfg = story
    ? {
        w: 1080, h: 1920, pad: 64, bg: '/revelstoke-bg-9-16.png',
        headerTop: 72, logo: 240, logoGap: 32,
        title: 86, meta: 25,
        badge: 21, badgeGapBottom: 20,
        num: 48, numW: 54, sep: 48, last: 32, lastSmall: 26, first: 19,
        rowGap: 26, entryGap: 20, sectionsBottom: 56,
        footerTop: 26, sponsor: 52, tags: 21, tagGap: 28,
      }
    : {
        w: 1080, h: 1080, pad: 48, bg: '/revelstoke-bg-1-1.png',
        headerTop: 8, logo: 150, logoGap: 24,
        title: 64, meta: 20,
        badge: 17, badgeGapBottom: 14,
        num: 38, numW: 44, sep: 38, last: 26, lastSmall: 21, first: 16,
        rowGap: 16, entryGap: 16, sectionsBottom: 20,
        footerTop: 18, sponsor: 44, tags: 17, tagGap: 22,
      }

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

  const entry = (slot: LineupSlot, i: number) => {
    if (!slot.player) return <div key={slot.id + i} style={{ flex: 1 }} />
    const parts = slot.player.name.trim().split(' ')
    const first = parts[0]
    const last = parts.slice(-1)[0]
    return (
      <div key={slot.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
        <span style={{ fontFamily: DISPLAY_FONT, color: GOLD, fontWeight: 400, fontSize: cfg.num, lineHeight: 1, width: cfg.numW, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
          {slot.player.tp_jersey_number}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: cfg.sep, fontWeight: 200, lineHeight: 1 }}>|</span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: DISPLAY_FONT, color: '#fff', fontWeight: 400,
              fontSize: last.length > 14 ? cfg.lastSmall : cfg.last,
              lineHeight: 1, textTransform: 'uppercase',
              letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden',
            }}
          >
            {last}
          </div>
          <div
            style={{
              fontSize: cfg.first, fontWeight: 300, color: 'rgba(255,255,255,0.65)', marginTop: 2,
              whiteSpace: 'nowrap', overflow: 'hidden',
            }}
          >
            {first}
          </div>
        </div>
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
        fontSize: cfg.badge,
        padding: story ? '8px 20px' : '6px 16px',
      }}
    >
      {text}
    </div>
  )

  const section = (label: string, rows: LineupSlot[][], rowWidth = '100%') => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: cfg.badgeGapBottom }}>{badge(label)}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: cfg.rowGap, minWidth: 0, width: '100%', margin: '0 auto' }}>
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: cfg.entryGap, width: rowWidth, margin: '0 auto' }}>
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
        backgroundImage: `linear-gradient(rgba(0,0,0,0.22), rgba(0,0,0,0.22)), url(${cfg.bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        width: cfg.w,
        height: cfg.h,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#fff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: cfg.pad,
      }}
    >
      {/* Header — centered; in story it sits below the phone UI zone */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, marginTop: cfg.headerTop }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: cfg.logoGap }}>
          <TeamLogo teamId={ourTeamId} size={cfg.logo} />
          {match.opponent_team_id ? (
            <TeamLogo teamId={match.opponent_team_id} size={cfg.logo} />
          ) : (
            <span style={{ fontSize: 24, fontWeight: 700 }}>{match.opponent_name}</span>
          )}
        </div>
        <div style={{ fontFamily: DISPLAY_FONT, fontSize: cfg.title, fontWeight: 400, lineHeight: 1, marginTop: story ? 18 : 12, textAlign: 'center', whiteSpace: 'nowrap' }}>
          STARTING LINEUP
        </div>
        <div style={{ fontSize: cfg.meta, color: 'rgba(255,255,255,0.65)', marginTop: story ? 14 : 10, paddingBottom: story ? 24 : 12, textAlign: 'center' }}>
          {metaItems.join('  ·  ')}
        </div>
      </div>

      {/* Sections */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', marginTop: 8, paddingBottom: cfg.sectionsBottom }}>
        {section('Offense', lines)}
        {section('Defense', pairs, '66%')}
        {section('Goalies', [goalies], '66%')}
      </div>

      {/* Footer — sponsors + hashtags */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: cfg.footerTop,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Sponsored by
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/save-on-foods.png" alt="Save-On-Foods" style={{ height: cfg.sponsor, width: 'auto' }} />
        </div>
        <div style={{ display: 'flex', gap: cfg.tagGap, fontSize: cfg.tags, color: GOLD, fontWeight: 700 }}>
          {HASHTAGS.map((h) => <span key={h}>{h}</span>)}
        </div>
      </div>
    </div>
  )
}
