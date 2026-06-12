'use client'
import { useState, useRef } from 'react'
import { toPng } from 'html-to-image'
import GameDayImage from './GameDayImage'
import type { DbMatch } from '@/types/hockey'

interface Props {
  match: DbMatch
  venue?: string | null
  ourTeamId: string
  /** Extra classes for the trigger button (e.g. w-full in stacked layouts) */
  className?: string
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

/** "Game Preview" announce image export for upcoming games — button + modal. */
export default function GameDayActions({ match, venue, ourTeamId, className = '' }: Props) {
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [photo, setPhoto] = useState<string | null>(match.result_photo ?? null)
  const [formats, setFormats] = useState({ square: true, story: false })
  const squareRef = useRef<HTMLDivElement>(null)
  const storyRef = useRef<HTMLDivElement>(null)

  async function handlePhotoUpload(file: File | undefined) {
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    setPhoto(dataUrl)
    fetch(`/api/games/${match.id}/result`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result_photo: dataUrl }),
    }).catch(() => {})
  }

  async function renderPng(node: HTMLDivElement | null): Promise<string | null> {
    if (!node) return null
    return toPng(node, { cacheBust: true, pixelRatio: 1 })
  }

  async function handleDownload() {
    setBusy(true)
    try {
      const targets: Array<[HTMLDivElement | null, string]> = []
      if (formats.square) targets.push([squareRef.current, `grizzlies-game-preview-${match.date}-1x1.png`])
      if (formats.story) targets.push([storyRef.current, `grizzlies-game-preview-${match.date}-9x16.png`])
      for (const [node, filename] of targets) {
        const dataUrl = await renderPng(node)
        if (!dataUrl) continue
        const link = document.createElement('a')
        link.download = filename
        link.href = dataUrl
        link.click()
      }
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
      const targets: Array<HTMLDivElement | null> = []
      if (formats.square) targets.push(squareRef.current)
      if (formats.story) targets.push(storyRef.current)
      for (const node of targets) {
        const dataUrl = await renderPng(node)
        if (!dataUrl) continue
        const win = window.open('', '_blank')
        if (win) {
          win.document.write(
            `<html><head><title>Game Preview</title></head>` +
            `<body style="margin:0;background:#1a1a1a;display:flex;align-items:flex-start;justify-content:center">` +
            `<img src="${dataUrl}" style="max-width:100%;max-height:100vh;height:auto"></body></html>`
          )
          win.document.close()
        }
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShow(true)}
        className={`bg-[#2e2e2e] text-white text-xs font-bold px-4 py-2 rounded hover:bg-[#3a3a3a] transition-colors ${className}`}
      >
        Game Preview
      </button>

      {show && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] rounded-xl p-6 w-full max-w-md border border-white/10 relative">
            <button
              type="button"
              onClick={() => setShow(false)}
              aria-label="Close"
              className="absolute top-3 right-3 text-white/30 hover:text-white text-lg leading-none transition-colors"
            >
              ✕
            </button>
            <h3 className="text-white font-bold text-lg mb-1">Game Preview — Image</h3>
            <p className="text-white/40 text-xs mb-4">Square 1:1 with logos, date, venue and an optional photo.</p>

            {/* Format selection */}
            <div className="mb-4">
              <label className="text-white/60 text-xs uppercase tracking-wider block mb-2">Formats</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formats.square}
                    onChange={(e) => setFormats((f) => ({ ...f, square: e.target.checked }))}
                    className="accent-[#87703e] w-4 h-4"
                  />
                  1:1 (post)
                </label>
                <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formats.story}
                    onChange={(e) => setFormats((f) => ({ ...f, story: e.target.checked }))}
                    className="accent-[#87703e] w-4 h-4"
                  />
                  9:16 (story)
                </label>
              </div>
            </div>

            {/* Photo upload */}
            <div className="mb-4">
              <label className="text-white/60 text-xs uppercase tracking-wider block mb-2">Photo</label>
              <div className="flex items-center gap-3 flex-wrap">
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
                  className="flex-1 min-w-0 text-white/60 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
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
                    className="text-white/30 hover:text-red-400 text-xs transition-colors shrink-0"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleDownload}
                disabled={busy || !(formats.square || formats.story)}
                className="flex-1 bg-grizzly-gold text-white font-bold py-2 rounded hover:bg-grizzly-gold/90 transition-colors disabled:opacity-40"
              >
                {busy ? 'Working…' : 'Download'}
              </button>
              <button
                type="button"
                onClick={handlePreview}
                disabled={busy || !(formats.square || formats.story)}
                className="flex-1 bg-white/10 text-white font-semibold py-2 rounded hover:bg-white/20 transition-colors disabled:opacity-40"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setShow(false)}
                className="flex-1 bg-white/10 text-white py-2 rounded hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden render target */}
      {show && (
        <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden>
          <div ref={squareRef}>
            <GameDayImage match={match} venue={venue} ourTeamId={ourTeamId} photo={photo} format="square" />
          </div>
          <div ref={storyRef}>
            <GameDayImage match={match} venue={venue} ourTeamId={ourTeamId} photo={photo} format="story" />
          </div>
        </div>
      )}
    </>
  )
}
