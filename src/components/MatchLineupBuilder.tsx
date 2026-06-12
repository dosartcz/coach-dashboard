'use client'
import { useState, useRef, useCallback } from 'react'
import { renderNodeToPng } from '@/lib/exportImage'
import LineupBuilder from './LineupBuilder'
import SpecialTeamsBuilder, { blankSpecialSlots } from './SpecialTeamsBuilder'
import LineupImageExport from './LineupImageExport'
import type { RosterPlayer, LineupSlot, DbMatch } from '@/types/hockey'

interface Props {
  match: DbMatch
  players: RosterPlayer[]
  venue?: string | null
  ourTeamId: string
  /** Extra button(s) rendered next to Export (e.g. the Game Day export) */
  extraAction?: React.ReactNode
  initialOpening: LineupSlot[] | null
  initialAlternative: LineupSlot[] | null
  initialSpecial: LineupSlot[] | null
}

const EMPTY: LineupSlot[] = [
  { id: 'l1-lw', label: 'LW', position: 'F', player: null },
  { id: 'l1-c',  label: 'C',  position: 'F', player: null },
  { id: 'l1-rw', label: 'RW', position: 'F', player: null },
  { id: 'l2-lw', label: 'LW', position: 'F', player: null },
  { id: 'l2-c',  label: 'C',  position: 'F', player: null },
  { id: 'l2-rw', label: 'RW', position: 'F', player: null },
  { id: 'l3-lw', label: 'LW', position: 'F', player: null },
  { id: 'l3-c',  label: 'C',  position: 'F', player: null },
  { id: 'l3-rw', label: 'RW', position: 'F', player: null },
  { id: 'l4-lw', label: 'LW', position: 'F', player: null },
  { id: 'l4-c',  label: 'C',  position: 'F', player: null },
  { id: 'l4-rw', label: 'RW', position: 'F', player: null },
  { id: 'p1-ld', label: 'LD', position: 'D', player: null },
  { id: 'p1-rd', label: 'RD', position: 'D', player: null },
  { id: 'p2-ld', label: 'LD', position: 'D', player: null },
  { id: 'p2-rd', label: 'RD', position: 'D', player: null },
  { id: 'p3-ld', label: 'LD', position: 'D', player: null },
  { id: 'p3-rd', label: 'RD', position: 'D', player: null },
  { id: 'g1', label: 'G1', position: 'G', player: null },
  { id: 'g2', label: 'G2', position: 'G', player: null },
]

function blankSlots(): LineupSlot[] {
  return EMPTY.map((s) => ({ ...s, player: null }))
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function MatchLineupBuilder({ match, players, venue, ourTeamId, extraAction, initialOpening, initialAlternative, initialSpecial }: Props) {
  const [tab, setTab] = useState<'opening' | 'alternative' | 'special'>('opening')
  const [opening, setOpening] = useState<LineupSlot[]>(initialOpening ?? blankSlots())
  const [alternative, setAlternative] = useState<LineupSlot[]>(initialAlternative ?? blankSlots())
  const [special, setSpecial] = useState<LineupSlot[]>(initialSpecial ?? blankSpecialSlots())
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [exporting, setExporting] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Export modal
  const [showExport, setShowExport] = useState(false)
  const [exportChecks, setExportChecks] = useState({ img1x1: true, img9x16: false, pdf: false })
  const [cutouts, setCutouts] = useState<Record<string, string>>({})
  const squareRef = useRef<HTMLDivElement>(null)
  const storyRef = useRef<HTMLDivElement>(null)

  function openExport() {
    setShowExport(true)
    // Transparent player cutouts (processed on the Roster page) — best effort
    fetch('/api/player-cutouts')
      .then((r) => r.json())
      .then(setCutouts)
      .catch(() => setCutouts({}))
  }

  async function downloadPng(node: HTMLDivElement | null, filename: string) {
    const dataUrl = await renderNodeToPng(node)
    if (!dataUrl) return
    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    link.click()
  }

  /** Open the rendered image in a new tab instead of downloading — quick iteration. */
  async function previewPng(node: HTMLDivElement | null, title: string) {
    const dataUrl = await renderNodeToPng(node)
    if (!dataUrl) return
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(
        `<html><head><title>${title}</title></head>` +
        `<body style="margin:0;background:#1a1a1a;display:flex;align-items:flex-start;justify-content:center">` +
        `<img src="${dataUrl}" style="max-width:100%;max-height:100vh;height:auto"></body></html>`
      )
      win.document.close()
    }
  }

  async function runPreview() {
    setExporting(true)
    try {
      if (exportChecks.img1x1) await previewPng(squareRef.current, 'Starting Lineup 1:1')
      if (exportChecks.img9x16) await previewPng(storyRef.current, 'Starting Lineup 9:16')
    } catch (err) {
      console.error('Preview failed:', err)
      alert('Preview failed: ' + String(err))
    } finally {
      setExporting(false)
    }
  }

  const debounceSave = useCallback((type: 'opening' | 'alternative' | 'special', slots: LineupSlot[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/games/${match.id}/lineup`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, slots }),
        })
        setSaveStatus(res.ok ? 'saved' : 'error')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 2000)
      }
    }, 1000)
  }, [match.id])

  function handleOpeningChange(slots: LineupSlot[]) {
    setOpening(slots)
    debounceSave('opening', slots)
  }

  function handleAlternativeChange(slots: LineupSlot[]) {
    setAlternative(slots)
    debounceSave('alternative', slots)
  }

  function handleSpecialChange(slots: LineupSlot[]) {
    setSpecial(slots)
    debounceSave('special', slots)
  }

  const handlePdfExport = useCallback(async () => {
    setExporting(true)
    try {
      const { jsPDF } = await import('jspdf')
      // A4 landscape — everything on the LEFT half, plain black & white text
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      const margin = 12
      const colW = 42 // 3 name columns within the left half (12 + 3×42 = 138 < 148.5)
      let y = 16

      // jsPDF's built-in helvetica has no diacritics — strip accents (Müller → Muller)
      const ascii = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

      const playerText = (slot: LineupSlot) => {
        if (!slot.player) return '—'
        const parts = ascii(slot.player.name.trim()).split(' ')
        const first = parts[0]
        const last = parts.slice(1).join(' ') || first
        return `#${slot.player.tp_jersey_number} ${last}, ${first[0]}.`
      }

      function sectionTitle(text: string) {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(text, margin, y)
        y += 4.5
      }

      function rowOf(slots: LineupSlot[], perRow = 3) {
        slots.forEach((slot, i) => {
          const x = margin + (i % perRow) * colW
          if (i > 0 && i % perRow === 0) y += 4.5
          doc.setFontSize(6)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(120, 120, 120)
          doc.text(slot.label, x, y)
          doc.setFontSize(8.5)
          doc.setTextColor(slot.player ? 0 : 180, slot.player ? 0 : 180, slot.player ? 0 : 180)
          doc.text(playerText(slot), x + 6, y)
        })
        y += 4.5
      }

      function drawFullLineup(slots: LineupSlot[]) {
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
        lines.forEach((line) => rowOf(line))
        y += 1
        pairs.forEach((pair) => rowOf(pair))
        y += 1
        rowOf(goalies)
        y += 3
      }

      // Header
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('Revelstoke Grizzlies — Game Lineup', margin, y)
      y += 5.5
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 60, 60)
      doc.text(ascii(`${match.date}  ·  ${match.home_away === 'home' ? 'vs' : '@'} ${match.opponent_name}`), margin, y)
      y += 8

      // Opening
      sectionTitle('STARTING LINEUP')
      drawFullLineup(opening)

      // Alternative — only when something is filled in
      if (alternative.some((s) => s.player)) {
        sectionTitle('ALTERNATIVE LINEUP')
        drawFullLineup(alternative)
      }

      // Special teams — only when something is filled in
      if (special.some((s) => s.player)) {
        sectionTitle('SPECIAL TEAMS')
        const units = [
          { key: 'pp1', title: 'PP1' },
          { key: 'pp2', title: 'PP2' },
          { key: 'pk1', title: 'PK1' },
          { key: 'pk2', title: 'PK2' },
        ]
        for (const unit of units) {
          const unitSlots = special.filter((s) => s.id.startsWith(unit.key))
          doc.setFontSize(6.5)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(100, 100, 100)
          doc.text(unit.title, margin, y)
          y += 4
          rowOf(unitSlots)
          y += 1
        }
      }

      doc.save(`grizzlies-lineup-${match.date}.pdf`)
    } catch (err) {
      console.error('PDF export failed:', err)
      alert('PDF export failed: ' + String(err))
    } finally {
      setExporting(false)
    }
  }, [match, opening, alternative, special])

  async function runExport() {
    setExporting(true)
    try {
      if (exportChecks.img1x1) await downloadPng(squareRef.current, `grizzlies-lineup-${match.date}-1x1.png`)
      if (exportChecks.img9x16) await downloadPng(storyRef.current, `grizzlies-lineup-${match.date}-9x16.png`)
      if (exportChecks.pdf) await handlePdfExport()
      setShowExport(false)
    } catch (err) {
      console.error('Export failed:', err)
      alert('Export failed: ' + String(err))
    } finally {
      setExporting(false)
    }
  }

  const statusText = saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : saveStatus === 'error' ? 'Save failed' : ''

  return (
    <div>
      {/* Tabs + controls — tabs on desktop, dropdown on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between mb-4">
        <div className="hidden sm:flex rounded-lg overflow-hidden bg-black/20 self-start">
          {(['opening', 'alternative', 'special'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 md:px-5 py-2 text-xs md:text-sm font-semibold whitespace-nowrap transition-colors ${
                tab === t
                  ? 'bg-grizzly-red text-white'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {t === 'opening' ? 'Starting Lineup' : t === 'alternative' ? 'Alternative Lineup' : 'Special Teams'}
            </button>
          ))}
        </div>
        <select
          value={tab}
          onChange={(e) => setTab(e.target.value as 'opening' | 'alternative' | 'special')}
          className="sm:hidden w-full bg-white/10 text-white rounded-lg px-3 py-2.5 text-sm font-semibold border border-white/10 focus:outline-none focus:border-grizzly-gold appearance-none"
        >
          <option value="opening" className="bg-[#1a1a1a]">Starting Lineup</option>
          <option value="alternative" className="bg-[#1a1a1a]">Alternative Lineup</option>
          <option value="special" className="bg-[#1a1a1a]">Special Teams</option>
        </select>
        <div className="flex items-center gap-3">
          {statusText && (
            <span className={`text-xs ${saveStatus === 'error' ? 'text-red-400' : 'text-white/40'}`}>
              {statusText}
            </span>
          )}
          {extraAction}
          <button
            onClick={openExport}
            className="bg-grizzly-gold text-white text-xs font-bold px-5 py-2 rounded hover:bg-grizzly-gold/90 transition-colors"
          >
            Export
          </button>
        </div>
      </div>

      {/* Active lineup builder */}
      {tab === 'opening' ? (
        <LineupBuilder
          key="opening"
          players={players}
          initialSlots={opening}
          onChange={handleOpeningChange}
        />
      ) : tab === 'alternative' ? (
        <LineupBuilder
          key="alternative"
          players={players}
          initialSlots={alternative}
          onChange={handleAlternativeChange}
        />
      ) : (
        <SpecialTeamsBuilder
          key="special"
          players={players}
          initialSlots={special}
          onChange={handleSpecialChange}
        />
      )}

      {/* Export modal */}
      {showExport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-xl p-6 w-full max-w-md border border-white/10 relative">
            <button
              type="button"
              onClick={() => setShowExport(false)}
              aria-label="Close"
              className="absolute top-3 right-3 text-white/30 hover:text-white text-lg leading-none transition-colors"
            >
              ✕
            </button>
            <h3 className="text-white font-bold text-lg mb-1">Export</h3>
            <p className="text-white/40 text-xs mb-4">Choose what to prepare for game day.</p>

            <div className="space-y-2">
              {/* Image 1:1 */}
              <label className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-lg px-4 py-3 cursor-pointer hover:border-grizzly-gold/40 transition-colors">
                <input
                  type="checkbox"
                  checked={exportChecks.img1x1}
                  onChange={(e) => setExportChecks((c) => ({ ...c, img1x1: e.target.checked }))}
                  className="accent-[#87703e] w-4 h-4"
                />
                <div className="w-12 h-12 border border-white/20 rounded bg-white/5 flex items-center justify-center text-[9px] text-white/40 font-bold shrink-0">
                  1:1
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">Starting Lineup — Image</p>
                  <p className="text-white/40 text-xs">Square 1:1 · social media post</p>
                </div>
              </label>

              {/* Image 9:16 */}
              <label className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-lg px-4 py-3 cursor-pointer hover:border-grizzly-gold/40 transition-colors">
                <input
                  type="checkbox"
                  checked={exportChecks.img9x16}
                  onChange={(e) => setExportChecks((c) => ({ ...c, img9x16: e.target.checked }))}
                  className="accent-[#87703e] w-4 h-4"
                />
                <div className="w-12 flex justify-center shrink-0">
                  <div className="w-7 h-12 border border-white/20 rounded bg-white/5 flex items-center justify-center text-[8px] text-white/40 font-bold">
                    9:16
                  </div>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">Starting Lineup — Image</p>
                  <p className="text-white/40 text-xs">Vertical 9:16 · story format</p>
                </div>
              </label>

              {/* PDF notes */}
              <label className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-lg px-4 py-3 cursor-pointer hover:border-grizzly-gold/40 transition-colors">
                <input
                  type="checkbox"
                  checked={exportChecks.pdf}
                  onChange={(e) => setExportChecks((c) => ({ ...c, pdf: e.target.checked }))}
                  className="accent-[#87703e] w-4 h-4"
                />
                <div className="w-12 flex justify-center shrink-0">
                  <div className="w-9 h-12 border border-white/20 rounded bg-white/5 flex items-center justify-center text-[8px] text-white/40 font-bold">
                    A4
                  </div>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">Coach Notes — PDF</p>
                  <p className="text-white/40 text-xs">All lineups &amp; special teams · plain text for print</p>
                </div>
              </label>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={runExport}
                disabled={exporting || !(exportChecks.img1x1 || exportChecks.img9x16 || exportChecks.pdf)}
                className="flex-1 bg-grizzly-gold text-white font-bold py-2 rounded hover:bg-grizzly-gold/90 transition-colors disabled:opacity-40"
              >
                {exporting ? 'Working…' : 'Download'}
              </button>
              <button
                type="button"
                onClick={runPreview}
                disabled={exporting || !(exportChecks.img1x1 || exportChecks.img9x16)}
                title="Open selected images in a new tab without downloading"
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

      {/* Hidden image export targets — rendered only while the modal is open */}
      {showExport && (
        <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden>
          <div ref={squareRef}>
            <LineupImageExport slots={opening} format="square" match={match} venue={venue} ourTeamId={ourTeamId} cutouts={cutouts} />
          </div>
          <div ref={storyRef}>
            <LineupImageExport slots={opening} format="story" match={match} venue={venue} ourTeamId={ourTeamId} cutouts={cutouts} />
          </div>
        </div>
      )}
    </div>
  )
}
