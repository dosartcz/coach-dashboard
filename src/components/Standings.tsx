import { fetchSeasonIds, fetchStandings } from '@/lib/hockeytech'

interface Props {
  /** Team ids to highlight */
  ourTeamId: string
  opponentTeamId?: string | null
}

const COLS = [
  { key: 'games_played', label: 'GP' },
  { key: 'wins', label: 'W' },
  { key: 'losses', label: 'L' },
  { key: 'ot_losses', label: 'OTL' },
  { key: 'shootout_losses', label: 'SOL' },
  { key: 'points', label: 'PTS' },
  { key: 'goals_diff', label: 'DIFF' },
] as const

export default async function Standings({ ourTeamId, opponentTeamId }: Props) {
  let divisions
  try {
    const { regular, playoffs } = await fetchSeasonIds()
    divisions = await fetchStandings(regular ?? playoffs)
  } catch {
    return null
  }
  if (!divisions || divisions.length === 0) return null

  return (
    <div>
      <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-3">League Standings</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {divisions.map((div) => (
          <div key={div.division} className="bg-white/5 border border-white/10 rounded-xl p-4 overflow-x-auto">
            <table className="w-full text-xs min-w-[420px]">
              <thead>
                <tr className="text-white/30">
                  <th className="text-left pb-2 font-bold text-white/50">{div.division}</th>
                  {COLS.map((c) => (
                    <th key={c.key} className={`text-center pb-2 font-medium w-9 ${c.key === 'points' ? 'text-white/50 font-bold' : ''}`}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {div.teams.map((t) => {
                  const isUs = t.id === ourTeamId
                  const isOpp = !isUs && t.id === opponentTeamId
                  return (
                    <tr
                      key={t.id}
                      className={`border-t border-white/5 ${
                        isUs ? 'bg-grizzly-gold/15' : isOpp ? 'bg-grizzly-red/20' : ''
                      }`}
                    >
                      <td className="py-1.5">
                        <span className="text-white/30 tabular-nums inline-block w-5">{t.rank}</span>
                        <span className={`${isUs ? 'text-grizzly-gold font-bold' : isOpp ? 'text-white font-bold' : 'text-white/70'}`}>
                          {t.name}
                        </span>
                      </td>
                      {COLS.map((c) => (
                        <td
                          key={c.key}
                          className={`py-1.5 text-center tabular-nums ${
                            c.key === 'points' ? 'text-white font-bold' : 'text-white/50'
                          }`}
                        >
                          {t[c.key]}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
