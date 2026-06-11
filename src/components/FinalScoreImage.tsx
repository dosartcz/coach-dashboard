'use client'
import { TeamLogo } from './TeamLogo'
import type { DbMatch } from '@/types/hockey'

const HASHTAGS = ['#RevelstokeGrizzlies', '#BeAGrizzly', '#KIJHL']
const GOLD = '#87703e'
const DISPLAY_FONT = 'var(--font-display), system-ui, sans-serif'

interface Props {
  match: DbMatch
  venue?: string | null
  ourTeamId: string
  ourScore: number
  theirScore: number
  suffix: string
  /** Illustration photo (data URL) — optional */
  photo?: string | null
}

/** Final Score graphic, 1:1 — same visual language as the lineup export. */
export default function FinalScoreImage({ match, venue, ourTeamId, ourScore, theirScore, suffix, photo }: Props) {
  const weAreHome = match.home_away === 'home'
  const homeScore = weAreHome ? ourScore : theirScore
  const awayScore = weAreHome ? theirScore : ourScore

  const dateLabel = new Date(match.date + 'T12:00:00').toLocaleDateString('en-CA', {
    weekday: 'short', month: 'long', day: 'numeric',
  })
  const metaItems = [dateLabel, venue].filter(Boolean)

  const homeLogo = weAreHome
    ? <TeamLogo teamId={ourTeamId} size={210} />
    : match.opponent_team_id
      ? <TeamLogo teamId={match.opponent_team_id} size={210} />
      : <span style={{ fontSize: 26, fontWeight: 700, textAlign: 'center' }}>{match.opponent_name}</span>
  const awayLogo = weAreHome
    ? match.opponent_team_id
      ? <TeamLogo teamId={match.opponent_team_id} size={210} />
      : <span style={{ fontSize: 26, fontWeight: 700, textAlign: 'center' }}>{match.opponent_name}</span>
    : <TeamLogo teamId={ourTeamId} size={210} />

  return (
    <div
      style={{
        backgroundColor: '#111111',
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.22), rgba(0,0,0,0.22)), url(/revelstoke-bg-1-1.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        width: 1080,
        height: 1080,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#fff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: 48,
      }}
    >
      {/* Title */}
      <div style={{ fontFamily: DISPLAY_FONT, fontSize: 92, fontWeight: 400, lineHeight: 1, textAlign: 'center', letterSpacing: '0.04em', flexShrink: 0 }}>
        FINAL SCORE
      </div>

      {/* Photo frame */}
      {photo && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28, flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt=""
            style={{
              width: 800,
              height: 440,
              objectFit: 'cover',
              borderRadius: 14,
              border: '6px solid rgba(255,255,255,0.92)',
            }}
          />
        </div>
      )}

      {/* Meta line */}
      {metaItems.length > 0 && (
        <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginTop: photo ? 26 : 36, flexShrink: 0 }}>
          {metaItems.join('  |  ')}
        </div>
      )}

      {/* Score row — home team on the left */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 56 }}>
        <div style={{ width: 210, display: 'flex', justifyContent: 'center' }}>{homeLogo}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          <span style={{ fontFamily: DISPLAY_FONT, fontSize: 190, fontWeight: 400, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {homeScore}
          </span>
          <span style={{ fontSize: 130, fontWeight: 200, color: 'rgba(255,255,255,0.25)', lineHeight: 1 }}>|</span>
          <span style={{ fontFamily: DISPLAY_FONT, fontSize: 190, fontWeight: 400, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {awayScore}
          </span>
        </div>
        <div style={{ width: 210, display: 'flex', justifyContent: 'center' }}>{awayLogo}</div>
      </div>

      {/* Suffix (Final / OT / SO) */}
      <div style={{ fontFamily: DISPLAY_FONT, fontSize: 28, color: GOLD, textAlign: 'center', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: -16, flexShrink: 0 }}>
        {suffix === 'Final' ? 'FINAL' : `FINAL · ${suffix}`}
      </div>

      {/* Footer — sponsor + hashtags */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 26, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Sponsored by
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/save-on-foods.png" alt="Save-On-Foods" style={{ height: 44, width: 'auto' }} />
        </div>
        <div style={{ display: 'flex', gap: 22, fontSize: 17, color: GOLD, fontWeight: 700 }}>
          {HASHTAGS.map((h) => <span key={h}>{h}</span>)}
        </div>
      </div>
    </div>
  )
}
