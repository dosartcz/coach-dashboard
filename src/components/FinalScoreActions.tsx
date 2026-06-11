'use client'
import { useState, useRef } from 'react'
import { toPng } from 'html-to-image'
import FinalScoreImage from './FinalScoreImage'
import type { DbMatch } from '@/types/hockey'

interface Score {
  ourScore: number
  theirScore: number
  suffix: string
}

interface Props {
  match: DbMatch
  venue?: string | null
  ourTeamId: string
  /** null → no result yet, show the manual entry form */
  score: Score | null
  /** Goals by period, home:away — e.g. "0:1, 1:1, 1:2" */
  periodScores?: string | null
}

/** Downscale an uploaded photo to a reasonable JPEG data URL. */
async function fileToDataUrl(file: File, maxWidth = 1600): Promise<string> {
  const bmp = await createImageBitmap(file)
  const ratio = Math.min(1, maxWidth / bmp.width)
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * ratio)
  c.height = Math.round(bmp.height * ratio)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.85)
}

export default function FinalScoreActions({ match, venue, ourTeamId, score, periodScores }: Props) {
  const [showExport, setShowExport] = useState(false)
  const [busy, setBusy] = useState(false)
  const [photo, setPhoto] = useState<string | null>(match.result_photo ?? null)
  const exportRef = useRef<HTMLDivElement>(null)

  // Manual result form
  const [ourScore, setOurScore] = useState('')
  const [theirScore, setTheirScore] = useState('')
  const [ending, setEnding] = useState<'reg' | 'ot' | 'so'>('reg')
  const [saving, setSaving] = useState(false)

  async function handlePhotoUpload(file: File | undefined) {
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    setPhoto(dataUrl)
    // Persist so the photo survives reopening the page — best effort
    fetch(`/api/games/${match.id}/result`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result_photo: dataUrl }),
    }).catch(() => {})
  }

  async function renderPng(): Promise<string | null> {
    if (!exportRef.current) return null
    return toPng(exportRef.current, { cacheBust: true, pixelRatio: 1 })
  }

  async function handleDownload() {
    setBusy(true)
    try {
      const dataUrl = await renderPng()
      if (!dataUrl) return
      const link = document.createElement('a')
      link.download = `grizzlies-final-score-${match.date}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error(err)
      alert('Export failed: ' + String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handlePreview() {
    setBusy(true)
    try {
      const dataUrl = await renderPng()
      if (!dataUrl) return
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(
          `<html><head><title>Final Score</title></head>` +
          `<body style="margin:0;background:#1a1a1a;display:flex;align-items:flex-start;justify-content:center">` +
          `<img src="${dataUrl}" style="max-width:100%;max-height:100vh;height:auto"></body></html>`
        )
        win.document.close()
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveResult(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const our = parseInt(ourScore)
      const their = parseInt(theirScore)
      const weAreHome = match.home_away === 'home'
      await fetch(`/api/games/${match.id}/result`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          home_score: weAreHome ? our : their,
          away_score: weAreHome ? their : our,
          overtime: ending === 'ot' ? '1' : null,
          shootout: ending === 'so' ? '1' : null,
          final: '1',
        }),
      })
      window.location.reload()
    } finally {
      setSaving(false)
    }
  }

  // ── No result yet: manual entry form ────────────────────────────────────────
  if (!score) {
    return (
      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Enter Result Manually</h3>
        <p className="text-white/30 text-xs mb-4">
          The league feed hasn&apos;t delivered this result yet (it syncs automatically once available).
          You can enter it manually — a later sync will overwrite it with the official score.
        </p>
        <form onSubmit={handleSaveResult} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-white/60 text-xs uppercase tracking-wider block mb-1">Us</label>
            <input
              type="number" min="0" required value={ourScore}
              onChange={(e) => setOurScore(e.target.value)}
              className="w-20 bg-white/10 text-white rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-grizzly-gold text-center"
            />
          </div>
          <span className="text-white/30 pb-2">:</span>
          <div>
            <label className="text-white/60 text-xs uppercase tracking-wider block mb-1">{match.opponent_name}</label>
            <input
              type="number" min="0" required value={theirScore}
              onChange={(e) => setTheirScore(e.target.value)}
              className="w-20 bg-white/10 text-white rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-grizzly-gold text-center"
            />
          </div>
          <div className="flex rounded-lg overflow-hidden bg-black/20">
            {([['reg', 'Regulation'], ['ot', 'OT'], ['so', 'SO']] as const).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setEnding(val)}
                className={`px-4 py-2 text-sm font-semibold transition-colors ${
                  ending === val ? 'bg-grizzly-red text-white' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={saving || ourScore === '' || theirScore === ''}
            className="bg-grizzly-gold text-white text-sm font-bold px-5 py-2 rounded hover:bg-grizzly-gold/90 transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save Result'}
          </button>
        </form>
      </div>
    )
  }

  // ── Result exists: export button + modal ────────────────────────────────────
  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => setShowExport(true)}
          className="bg-grizzly-gold text-white text-xs font-bold px-5 py-2 rounded hover:bg-grizzly-gold/90 transition-colors"
        >
          Export
        </button>
      </div>

      {showExport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] rounded-xl p-6 w-full max-w-md border border-white/10 relative">
            <button
              type="button"
              onClick={() => setShowExport(false)}
              aria-label="Close"
              className="absolute top-3 right-3 text-white/30 hover:text-white text-lg leading-none transition-colors"
            >
              ✕
            </button>
            <h3 className="text-white font-bold text-lg mb-1">Final Score — Image</h3>
            <p className="text-white/40 text-xs mb-4">Square 1:1 with logos, score and an optional photo.</p>

            {/* Photo upload */}
            <div className="mb-4">
              <label className="text-white/60 text-xs uppercase tracking-wider block mb-2">Photo</label>
              <div className="flex items-center gap-3">
                {photo && (
                  <div className="w-20 h-12 rounded overflow-hidden flex-shrink-0 border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                  className="text-white/60 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
                />
                {photo && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhoto(null)
                      fetch(`/api/games/${match.id}/result`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ result_photo: null }),
                      }).catch(() => {})
                    }}
                    className="text-white/30 hover:text-red-400 text-xs transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleDownload}
                disabled={busy}
                className="flex-1 bg-grizzly-gold text-white font-bold py-2 rounded hover:bg-grizzly-gold/90 transition-colors disabled:opacity-40"
              >
                {busy ? 'Working…' : 'Download'}
              </button>
              <button
                type="button"
                onClick={handlePreview}
                disabled={busy}
                className="flex-1 bg-white/10 text-white font-semibold py-2 rounded hover:bg-white/20 transition-colors disabled:opacity-40"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setShowExport(false)}
                className="flex-1 bg-white/10 text-white py-2 rounded hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden render target */}
      {showExport && (
        <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden>
          <div ref={exportRef}>
            <FinalScoreImage
              match={match}
              venue={venue}
              ourTeamId={ourTeamId}
              ourScore={score.ourScore}
              theirScore={score.theirScore}
              suffix={score.suffix}
              photo={photo}
              periodScores={periodScores}
            />
          </div>
        </div>
      )}
    </>
  )
}
