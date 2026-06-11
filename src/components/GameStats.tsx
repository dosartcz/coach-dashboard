// Server component — renders post-game stats from the HockeyTech Game Center feed.

interface GcPlayer {
  player_id: string | null
  jersey_number: string | null
  first_name: string | null
  last_name: string | null
}

interface GcGoal {
  time: string
  period_id: string
  home: string
  power_play: string
  short_handed: string
  empty_net: string
  penalty_shot: string
  game_winning: string
  goal_scorer: GcPlayer
  assist1_player: GcPlayer
  assist2_player: GcPlayer
}

interface GcPenalty {
  time_off_formatted: string
  period_id: string
  home: string
  lang_penalty_description: string
  minutes_formatted: string
  player_penalized_info: GcPlayer
}

interface GcGoalie {
  first_name: string
  last_name: string
  saves: string
  shots_against: number | string
  goals_against: string
  secs_mmss: string
  win: string
  loss: string
  shutout: string
}

interface GcMvp {
  first_name: string
  last_name: string
  jersey_number: string
  home: number
}

interface GcTeam {
  name: string
  code: string
}

export interface GcSummary {
  meta: { attendance: string }
  periods: Record<string, { id: string; long_name: string }>
  home: GcTeam
  visitor: GcTeam
  venue: string
  referee1: string
  referee2: string
  linesman1: string
  linesman2: string
  goals: GcGoal[]
  penalties: GcPenalty[]
  goalies: { home: GcGoalie[]; visitor: GcGoalie[] }
  /** 2 = player of the game per team, 3 = classic three stars */
  mvp_type: number
  mvps: (GcMvp | null)[]
  goalsByPeriod: { home: Record<string, number>; visitor: Record<string, number> }
  shotsByPeriod: { home: Record<string, number>; visitor: Record<string, number> }
  totalGoals: { home: number; visitor: number }
  totalShots: { home: number; visitor: number }
  powerPlayGoals: { home: number; visitor: number }
  powerPlayCount: { home: number; visitor: number }
}

interface Props {
  summary: GcSummary
  ourSide: 'home' | 'visitor'
}

function playerName(p: GcPlayer): string {
  if (!p?.last_name) return ''
  return `${p.last_name}${p.first_name ? `, ${p.first_name}` : ''}`
}

function GoalBadges({ g }: { g: GcGoal }) {
  const badges: string[] = []
  if (g.power_play === '1') badges.push('PP')
  if (g.short_handed === '1') badges.push('SH')
  if (g.empty_net === '1') badges.push('EN')
  if (g.penalty_shot === '1') badges.push('PS')
  if (g.game_winning === '1') badges.push('GWG')
  if (badges.length === 0) return null
  return (
    <span className="inline-flex gap-1 ml-1.5">
      {badges.map((b) => (
        <span key={b} className="text-[9px] font-bold bg-grizzly-gold/20 text-grizzly-gold rounded px-1 py-0.5 leading-none">
          {b}
        </span>
      ))}
    </span>
  )
}

function GoalEntry({ g }: { g: GcGoal }) {
  const assists = [g.assist1_player, g.assist2_player].map(playerName).filter(Boolean)
  return (
    <div className="py-1.5">
      <div className="text-sm">
        <span className="text-white/40 tabular-nums mr-2">{g.time}</span>
        <span className="text-white font-semibold">
          #{g.goal_scorer.jersey_number} {playerName(g.goal_scorer)}
        </span>
        <GoalBadges g={g} />
      </div>
      {assists.length > 0 && (
        <div className="text-xs text-white/40 ml-12">{assists.join(' · ')}</div>
      )}
    </div>
  )
}

const SECTION_TITLE = 'text-white/40 text-xs font-bold uppercase tracking-wider mb-3'

export default function GameStats({ summary, ourSide }: Props) {
  const theirSide = ourSide === 'home' ? 'visitor' : 'home'
  const us = summary[ourSide]
  const them = summary[theirSide]

  const periodList = Object.values(summary.periods)
  const stars = (summary.mvps ?? []).filter(Boolean) as GcMvp[]
  const sideName = (home: string | number) =>
    String(home) === '1' ? summary.home.code : summary.visitor.code

  return (
    <div className="space-y-6">
      {/* Score & shots by period */}
      <div className="bg-white/5 rounded-xl p-5 border border-white/10">
        <h3 className={SECTION_TITLE}>Score &amp; Shots by Period</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/30 text-xs">
              <th className="text-left pb-2 font-medium">Team</th>
              {periodList.map((p) => (
                <th key={p.id} className="text-center pb-2 font-medium w-16">{p.long_name}</th>
              ))}
              <th className="text-center pb-2 font-bold w-16 text-white/50">T</th>
            </tr>
          </thead>
          <tbody>
            {([ourSide, theirSide] as const).map((side) => (
              <tr key={side} className="border-t border-white/5">
                <td className={`py-2 font-semibold ${side === ourSide ? 'text-grizzly-gold' : 'text-white/70'}`}>
                  {summary[side].name}
                </td>
                {periodList.map((p) => (
                  <td key={p.id} className="py-2 text-center tabular-nums">
                    <span className="text-white font-bold">{summary.goalsByPeriod[side]?.[p.id] ?? 0}</span>
                    <span className="text-white/30 text-xs ml-1">({summary.shotsByPeriod[side]?.[p.id] ?? 0})</span>
                  </td>
                ))}
                <td className="py-2 text-center tabular-nums border-l border-white/10">
                  <span className="text-white font-black">{summary.totalGoals[side]}</span>
                  <span className="text-white/30 text-xs ml-1">({summary.totalShots[side]})</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-white/40 text-xs mt-3">
          Goals (shots on goal) · Power play: {us.code} {summary.powerPlayGoals[ourSide]}/{summary.powerPlayCount[ourSide]}
          {' · '}{them.code} {summary.powerPlayGoals[theirSide]}/{summary.powerPlayCount[theirSide]}
        </p>
      </div>

      {/* Scoring — two columns by team, grouped by period */}
      <div className="bg-white/5 rounded-xl p-5 border border-white/10">
        <h3 className={SECTION_TITLE}>Scoring</h3>
        <div className="grid grid-cols-2 gap-x-6 mb-2">
          <p className="text-grizzly-gold text-sm font-bold">{us.name}</p>
          <p className="text-white/70 text-sm font-bold">{them.name}</p>
        </div>
        {periodList.map((p) => {
          const periodGoals = summary.goals.filter((g) => g.period_id === p.id)
          return (
            <div key={p.id} className="border-t border-white/5 py-2">
              <p className="text-white/30 text-[10px] font-bold uppercase tracking-wider mb-1">{p.long_name} Period</p>
              {periodGoals.length === 0 ? (
                <p className="text-white/20 text-xs py-1">No scoring</p>
              ) : (
                <div className="grid grid-cols-2 gap-x-6">
                  <div>
                    {periodGoals
                      .filter((g) => (String(g.home) === '1') === (ourSide === 'home'))
                      .map((g, i) => <GoalEntry key={i} g={g} />)}
                  </div>
                  <div>
                    {periodGoals
                      .filter((g) => (String(g.home) === '1') !== (ourSide === 'home'))
                      .map((g, i) => <GoalEntry key={i} g={g} />)}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Penalties */}
      {summary.penalties.length > 0 && (
        <div className="bg-white/5 rounded-xl p-5 border border-white/10">
          <h3 className={SECTION_TITLE}>Penalties</h3>
          {periodList.map((p) => {
            const periodPens = summary.penalties.filter((pen) => pen.period_id === p.id)
            if (periodPens.length === 0) return null
            return (
              <div key={p.id} className="border-t border-white/5 py-2">
                <p className="text-white/30 text-[10px] font-bold uppercase tracking-wider mb-1">{p.long_name} Period</p>
                <div className="space-y-1">
                  {periodPens.map((pen, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-white/40 tabular-nums w-12 shrink-0">{pen.time_off_formatted}</span>
                      <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 w-10 text-center shrink-0 ${
                        sideName(pen.home) === us.code ? 'bg-grizzly-gold/20 text-grizzly-gold' : 'bg-white/10 text-white/50'
                      }`}>
                        {sideName(pen.home)}
                      </span>
                      <span className="text-white/80 truncate">
                        #{pen.player_penalized_info.jersey_number} {playerName(pen.player_penalized_info)}
                      </span>
                      <span className="text-white/40 text-xs truncate">{pen.lang_penalty_description}</span>
                      <span className="text-white/30 text-xs tabular-nums ml-auto shrink-0">{pen.minutes_formatted}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Goalies + Three stars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white/5 rounded-xl p-5 border border-white/10 lg:col-span-2">
          <h3 className={SECTION_TITLE}>Goalies</h3>
          <div className="grid grid-cols-2 gap-x-6">
            {([ourSide, theirSide] as const).map((side) => (
              <div key={side}>
                <p className={`text-sm font-bold mb-2 ${side === ourSide ? 'text-grizzly-gold' : 'text-white/70'}`}>
                  {summary[side].name}
                </p>
                <div className="space-y-2">
                  {summary.goalies[side].map((g, i) => (
                    <div key={i} className="text-sm">
                      <span className="text-white font-semibold">{g.last_name}, {g.first_name}</span>
                      {g.win === '1' && <span className="text-green-400 text-xs font-bold ml-1.5">W</span>}
                      {g.loss === '1' && <span className="text-red-400 text-xs font-bold ml-1.5">L</span>}
                      {g.shutout === '1' && <span className="text-grizzly-gold text-xs font-bold ml-1.5">SO</span>}
                      <div className="text-white/40 text-xs">
                        {g.saves}/{g.shots_against} saves · {g.goals_against} GA · {g.secs_mmss}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {stars.length > 0 && (
          <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <h3 className={SECTION_TITLE}>
              {summary.mvp_type === 2 ? 'Players of the Game' : 'Three Stars'}
            </h3>
            <div className="space-y-2">
              {stars.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-grizzly-gold font-black w-6">
                    {summary.mvp_type === 2 ? '★' : `★${i + 1}`}
                  </span>
                  <span className="text-white font-semibold">#{s.jersey_number} {s.last_name}, {s.first_name}</span>
                  <span className="text-white/30 text-xs ml-auto">{sideName(s.home)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Officials + attendance */}
      <p className="text-white/25 text-xs">
        Referees: {[summary.referee1, summary.referee2].filter(Boolean).join(', ')}
        {' · '}Linesmen: {[summary.linesman1, summary.linesman2].filter(Boolean).join(', ')}
        {summary.meta.attendance && <> · Attendance: {summary.meta.attendance}</>}
      </p>
    </div>
  )
}
