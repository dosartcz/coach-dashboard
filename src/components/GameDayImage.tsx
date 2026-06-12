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
  /** Illustration photo (data URL) — optional */
  photo?: string | null
}

/** Game Day announcement graphic, 1:1 — same visual language as the other exports. */
export default function GameDayImage({ match, venue, ourTeamId, photo }: Props) {
  const weAreHome = match.home_away === 'home'

  const dateLabel = new Date(match.date + 'T12:00:00').toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
  const metaItems = [
    [dateLabel, match.time ? match.time.slice(0, 5) : null].filter(Boolean).join('  ·  '),
    venue,
  ].filter(Boolean)

  // Light white outline around the logo's alpha shape (4-direction drop-shadow)
  const outline = {
    filter:
      'drop-shadow(4px 0 0 rgba(255,255,255,0.8)) drop-shadow(-4px 0 0 rgba(255,255,255,0.8)) ' +
      'drop-shadow(0 4px 0 rgba(255,255,255,0.8)) drop-shadow(0 -4px 0 rgba(255,255,255,0.8))',
  }

  const ourLogo = <div style={outline}><TeamLogo teamId={ourTeamId} size={230} /></div>
  const oppLogo = match.opponent_team_id
    ? <div style={outline}><TeamLogo teamId={match.opponent_team_id} size={230} /></div>
    : <span style={{ fontSize: 28, fontWeight: 700, textAlign: 'center' }}>{match.opponent_name}</span>
  const [leftLogo, rightLogo] = weAreHome ? [ourLogo, oppLogo] : [oppLogo, ourLogo]

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
        GAME DAY
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

      {/* Matchup — home team on the left */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 64 }}>
        <div style={{ width: 230, display: 'flex', justifyContent: 'center' }}>{leftLogo}</div>
        <span style={{ fontFamily: DISPLAY_FONT, fontSize: 72, color: GOLD, lineHeight: 1 }}>VS</span>
        <div style={{ width: 230, display: 'flex', justifyContent: 'center' }}>{rightLogo}</div>
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
