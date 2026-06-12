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
  format?: 'square' | 'story'
  /** Illustration photo (data URL) — optional */
  photo?: string | null
}

/** Game Result graphic (1:1 / 9:16) — same visual language as the lineup export. */
export default function FinalScoreImage({ match, venue, ourTeamId, ourScore, theirScore, suffix, format = 'square', photo }: Props) {
  const story = format === 'story'
  const cfg = story
    ? {
        w: 1080, h: 1920, pad: 64, bg: '/revelstoke-bg-9-16.png', topGap: 72,
        title: 110, photoW: 880, photoH: 640, photoGap: 40, meta: 27,
        logo: 260, score: 230, sep: 150, scoreGap: 44, result: 38,
        sponsor: 52, tags: 21, tagGap: 28, footerTop: 26,
      }
    : {
        w: 1080, h: 1080, pad: 48, bg: '/revelstoke-bg-1-1.png', topGap: 0,
        title: 92, photoW: 800, photoH: 440, photoGap: 28, meta: 24,
        logo: 210, score: 190, sep: 130, scoreGap: 36, result: 32,
        sponsor: 44, tags: 17, tagGap: 22, footerTop: 26,
      }

  const won = ourScore > theirScore
  const resultLabel = `${suffix === 'OT' ? 'OT ' : suffix === 'SO' ? 'SO ' : ''}${won ? 'WIN' : ourScore < theirScore ? 'LOSS' : 'TIE'}`
  const weAreHome = match.home_away === 'home'
  const homeScore = weAreHome ? ourScore : theirScore
  const awayScore = weAreHome ? theirScore : ourScore

  const dateLabel = new Date(match.date + 'T12:00:00').toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
  const metaItems = [dateLabel, venue].filter(Boolean)

  // Light white outline around the logo's alpha shape (4-direction drop-shadow)
  const outline = {
    filter:
      'drop-shadow(4px 0 0 rgba(255,255,255,0.8)) drop-shadow(-4px 0 0 rgba(255,255,255,0.8)) ' +
      'drop-shadow(0 4px 0 rgba(255,255,255,0.8)) drop-shadow(0 -4px 0 rgba(255,255,255,0.8))',
  }

  const homeLogo = weAreHome
    ? <div style={outline}><TeamLogo teamId={ourTeamId} size={cfg.logo} /></div>
    : match.opponent_team_id
      ? <div style={outline}><TeamLogo teamId={match.opponent_team_id} size={cfg.logo} /></div>
      : <span style={{ fontSize: 26, fontWeight: 700, textAlign: 'center' }}>{match.opponent_name}</span>
  const awayLogo = weAreHome
    ? match.opponent_team_id
      ? <div style={outline}><TeamLogo teamId={match.opponent_team_id} size={cfg.logo} /></div>
      : <span style={{ fontSize: 26, fontWeight: 700, textAlign: 'center' }}>{match.opponent_name}</span>
    : <div style={outline}><TeamLogo teamId={ourTeamId} size={cfg.logo} /></div>

  // Story stacks logos above the score; square keeps everything on one row
  const scoreNumbers = (
    <div style={{ display: 'flex', alignItems: 'center', gap: cfg.scoreGap }}>
      <span style={{ fontFamily: DISPLAY_FONT, fontSize: cfg.score, fontWeight: 400, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {homeScore}
      </span>
      <span style={{ fontSize: cfg.sep, fontWeight: 200, color: 'rgba(255,255,255,0.25)', lineHeight: 1 }}>|</span>
      <span style={{ fontFamily: DISPLAY_FONT, fontSize: cfg.score, fontWeight: 400, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {awayScore}
      </span>
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
      {/* Title — story keeps a safe zone for the phone UI */}
      <div style={{ fontFamily: DISPLAY_FONT, fontSize: cfg.title, fontWeight: 400, lineHeight: 1, textAlign: 'center', letterSpacing: '0.04em', flexShrink: 0, marginTop: cfg.topGap }}>
        GAME RESULT
      </div>

      {/* Photo frame */}
      {photo && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: cfg.photoGap, flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt=""
            style={{
              width: cfg.photoW,
              height: cfg.photoH,
              objectFit: 'cover',
              borderRadius: 14,
              border: '6px solid rgba(255,255,255,0.92)',
            }}
          />
        </div>
      )}

      {/* Meta line */}
      {metaItems.length > 0 && (
        <div style={{ fontSize: cfg.meta, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginTop: photo ? cfg.photoGap : 36, flexShrink: 0 }}>
          {metaItems.join('  |  ')}
        </div>
      )}

      {/* Score block — home team on the left */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {story ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 120 }}>
              <div style={{ width: cfg.logo, display: 'flex', justifyContent: 'center' }}>{homeLogo}</div>
              <div style={{ width: cfg.logo, display: 'flex', justifyContent: 'center' }}>{awayLogo}</div>
            </div>
            <div style={{ marginTop: 36 }}>{scoreNumbers}</div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 56 }}>
            <div style={{ width: cfg.logo, display: 'flex', justifyContent: 'center' }}>{homeLogo}</div>
            {scoreNumbers}
            <div style={{ width: cfg.logo, display: 'flex', justifyContent: 'center' }}>{awayLogo}</div>
          </div>
        )}
        <div style={{ fontFamily: DISPLAY_FONT, fontSize: cfg.result, color: GOLD, textAlign: 'center', letterSpacing: '0.25em', marginTop: 22 }}>
          {resultLabel}
        </div>
      </div>

      {/* Footer — sponsor + hashtags */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: cfg.footerTop, flexShrink: 0 }}>
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
