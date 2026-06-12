'use client'
import { TeamLogo } from './TeamLogo'

interface Props {
  ourScore: number
  theirScore: number
  suffix: string
  teamId: string
  opponentId: string | null
  opponentName: string
  dateLabel?: string
  venue?: string
  reportUrl?: string
  boxScoreUrl?: string
}

const OUR_NAME = 'Revelstoke Grizzlies'

export default function GameResult({ ourScore, theirScore, suffix, teamId, opponentId, opponentName, dateLabel, venue, reportUrl, boxScoreUrl }: Props) {
  const weWon = ourScore > theirScore
  const weLost = ourScore < theirScore

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 md:p-8">
      {(dateLabel || venue) && (
        <p className="text-gray-500 text-sm text-center mb-4 md:mb-6">
          {dateLabel}
          {venue && <span className="text-gray-400"> · {venue}</span>}
        </p>
      )}
      <div className="flex items-center justify-center gap-3 md:gap-10">
        {/* Us */}
        <div className="flex flex-col items-center gap-2 md:gap-3 flex-1 min-w-0">
          <div className="scale-75 md:scale-100 -my-2 md:my-0"><TeamLogo teamId={teamId} size={96} /></div>
          <span className="text-black font-bold text-sm md:text-lg text-center leading-tight">{OUR_NAME}</span>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="flex items-center gap-2 md:gap-4 text-gray-900">
            <span className="text-5xl md:text-7xl font-black tabular-nums">{ourScore}</span>
            <span className="text-3xl md:text-5xl font-light">–</span>
            <span className="text-5xl md:text-7xl font-black tabular-nums">{theirScore}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-gray-400 text-xs uppercase tracking-wider">{suffix}</span>
            <span className="text-gray-600 text-sm font-bold">
              {weWon ? 'WIN' : 'LOSS'}
            </span>
          </div>
        </div>

        {/* Opponent */}
        <div className="flex flex-col items-center gap-2 md:gap-3 flex-1 min-w-0">
          {opponentId && <div className="scale-75 md:scale-100 -my-2 md:my-0"><TeamLogo teamId={opponentId} size={96} /></div>}
          <span className="text-black font-bold text-sm md:text-lg text-center leading-tight">{opponentName}</span>
        </div>
      </div>

      {(reportUrl || boxScoreUrl) && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {reportUrl && (
            <a
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:border-gray-500 hover:text-gray-900 transition-colors"
            >
              Game Report
            </a>
          )}
          {boxScoreUrl && (
            <a
              href={boxScoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:border-gray-500 hover:text-gray-900 transition-colors"
            >
              Text Box Score
            </a>
          )}
        </div>
      )}
    </div>
  )
}
