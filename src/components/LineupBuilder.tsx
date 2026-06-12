'use client'
import { useState, useRef, useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import type { RosterPlayer, LineupSlot } from '@/types/hockey'

// Direct URL for UI (browser handles CORS fine for <img> tags)
const uiPhoto = (id: string) => `https://assets.leaguestat.com/kijhl/240x240/${id}.jpg`

// ── Initial empty lineup ──────────────────────────────────────────────────────
const EMPTY_LINEUP: LineupSlot[] = [
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

// ── Photo: square (pool) ──────────────────────────────────────────────────────
export function SquarePhoto({ playerId, src, size = 44, fullHeight = false }: { playerId: string; src?: string | null; size?: number; fullHeight?: boolean }) {
  const [err, setErr] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const photoSrc = src || uiPhoto(playerId)

  // SSR'd <img> can fail BEFORE React hydrates — onError never fires then.
  // Check the already-settled state after mount.
  useEffect(() => {
    const el = imgRef.current
    if (el && el.complete && el.naturalWidth === 0) setErr(true)
  }, [photoSrc])

  if (fullHeight) {
    return err ? (
      <div className="w-full h-full bg-white" />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={imgRef}
        src={photoSrc}
        alt=""
        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
        onError={() => setErr(true)}
      />
    )
  }
  return err ? (
    <div className="bg-white rounded-sm flex-shrink-0" style={{ width: size, height: size }} />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={photoSrc}
      alt=""
      width={size}
      height={size}
      className="object-cover object-top rounded-sm flex-shrink-0"
      style={{ width: size, height: size }}
      onError={() => setErr(true)}
    />
  )
}

// ── Photo: circle (slot) ──────────────────────────────────────────────────────
export function Avatar({ playerId, src, size = 44 }: { playerId: string; src?: string | null; size?: number }) {
  const [err, setErr] = useState(false)
  const photoSrc = src || uiPhoto(playerId)
  return err ? (
    <div className="rounded-full bg-white/15 flex-shrink-0" style={{ width: size, height: size }} />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoSrc}
      alt=""
      width={size}
      height={size}
      className="rounded-full object-cover object-top flex-shrink-0 bg-white/10"
      style={{ width: size, height: size }}
      onError={() => setErr(true)}
    />
  )
}

// ── Draggable card in pool ────────────────────────────────────────────────────
export function DraggablePoolCard({ player }: { player: RosterPlayer }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: player.player_id,
    data: { player, from: 'pool' },
  })

  const [firstName, ...rest] = player.name.trim().split(' ')
  const lastName = rest.join(' ') || firstName
  // If full "Lastname, Firstname" is too long → show only the first-name initial
  // (threshold must kick in before CSS truncate clips the text visually)
  const displayFirst = `${lastName}, ${firstName}`.length > 15 ? `${firstName[0]}.` : firstName
  const posLabel = player.position_override ?? player.position

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      suppressHydrationWarning
      className={`relative flex items-stretch shrink-0 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing select-none transition-opacity bg-white hover:bg-white/90 ${isDragging ? 'opacity-30' : ''}`}
      style={{ height: 56 }}
    >
      {/* Position + status — top right corner */}
      <div className="absolute top-1 right-1.5 flex items-center gap-1 pointer-events-none">
        {player.status === 'injury' && (
          <span className="font-bold leading-none text-xs" style={{ color: '#E8000D' }}>✚</span>
        )}
        {player.status === 'not_available' && (
          <span className="text-gray-700 font-bold leading-none text-xs">⊘</span>
        )}
        <span className="text-xs font-bold text-black leading-none">{posLabel}</span>
      </div>

      {/* Number */}
      <div className="flex-shrink-0 w-14 flex items-center justify-center text-grizzly-gold font-black leading-none tabular-nums" style={{ fontSize: '1.4rem' }}>
        #{player.tp_jersey_number}
      </div>

      {/* Photo — 100% height */}
      <div className="flex-shrink-0 w-14 ml-1 bg-black/5">
        <SquarePhoto playerId={player.player_id} src={player.photo} fullHeight />
      </div>

      {/* Name — vertically centered */}
      <div className="flex-1 flex flex-col justify-center pl-2 pr-8 min-w-0">
        <div className="leading-tight truncate" style={{ fontSize: '1.35rem' }}>
          <span className="font-bold text-black">{lastName}</span>
          <span className="text-black/30">, </span>
          <span className="font-light text-black/70">{displayFirst}</span>
        </div>
      </div>
    </div>
  )
}

// ── Draggable card in slot ────────────────────────────────────────────────────
export function DraggableSlotCard({ slotId, player }: { slotId: string; player: RosterPlayer }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `slot-${slotId}`,
    data: { player, from: 'slot' },
  })
  const parts = player.name.trim().split(' ')
  const firstName = parts[0]
  const lastName = parts.slice(1).join(' ') || firstName

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      suppressHydrationWarning
      className={`flex items-stretch w-full flex-1 overflow-hidden cursor-grab active:cursor-grabbing select-none transition-opacity bg-white ${isDragging ? 'opacity-30' : ''}`}
    >
      {/* Number */}
      <div className="flex-shrink-0 w-16 flex items-center justify-center text-grizzly-gold font-black leading-none tabular-nums pl-3 relative z-10" style={{ fontSize: '2rem' }}>
        #{player.tp_jersey_number}
      </div>
      {/* Photo — 100% height */}
      <div className="flex-shrink-0 w-20 bg-black/5 self-stretch relative z-0">
        <SquarePhoto playerId={player.player_id} src={player.photo} fullHeight />
      </div>
      {/* Name */}
      <div className="flex-1 flex flex-col justify-center pl-3 pr-2 min-w-0">
        <span className="font-bold text-black leading-tight truncate" style={{ fontSize: '1rem' }}>{lastName}</span>
        <span className="font-light text-black/60 leading-tight truncate" style={{ fontSize: '1rem' }}>{firstName}</span>
      </div>
    </div>
  )
}

// ── Droppable slot ────────────────────────────────────────────────────────────
export function SlotCell({
  slot,
  onClear,
  dragPosition,
}: {
  slot: LineupSlot
  onClear: (slotId: string) => void
  dragPosition?: 'F' | 'D' | 'G' | null
}) {
  // Hard block: goalies only on G slots, skaters never on G slots
  const isDisabled = dragPosition != null && (
    dragPosition === 'G' ? slot.position !== 'G' : slot.position === 'G'
  )
  // Visual dimming: every non-matching position
  const isDimmed = dragPosition != null && dragPosition !== slot.position
  const { setNodeRef, isOver } = useDroppable({ id: slot.id, disabled: isDisabled })
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border transition-all relative flex flex-col h-[90px] overflow-hidden
        ${isOver ? 'border-grizzly-gold bg-grizzly-gold/10' : 'border-white/10 bg-white/5'}
        ${isDimmed ? 'opacity-25 grayscale' : ''}`}
    >
      {slot.player ? (
        <div className="relative group flex-1 flex flex-col">
          <DraggableSlotCard slotId={slot.id} player={slot.player} />
          <button
            onClick={() => onClear(slot.id)}
            className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center w-5 h-5 text-black text-[13px] leading-none z-10"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-1">
          <div className="text-[11px] text-white/40 font-bold">{slot.label}</div>
          <div className="text-white/20 text-[10px]">drop here</div>
        </div>
      )}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
const POOL_TABS = [
  { key: 'F' as const, label: 'Forwards' },
  { key: 'D' as const, label: 'Defence' },
  { key: 'G' as const, label: 'Goalies' },
]

interface LineupBuilderProps {
  players: RosterPlayer[]
  initialSlots?: LineupSlot[]
  onChange?: (slots: LineupSlot[]) => void
}

export default function LineupBuilder({
  players,
  initialSlots,
  onChange,
}: LineupBuilderProps) {
  const [slots, setSlots] = useState<LineupSlot[]>(() =>
    initialSlots ? initialSlots.map((s) => ({ ...s })) : EMPTY_LINEUP.map((s) => ({ ...s, player: null }))
  )
  const [activePlayer, setActivePlayer] = useState<RosterPlayer | null>(null)
  const [poolTab, setPoolTab] = useState<'F' | 'D' | 'G'>('F')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Keep a ref to current slots so handlers can read the latest value without
  // needing to call onChange inside a setState updater (which runs during render).
  const slotsRef = useRef(slots)
  slotsRef.current = slots

  const usedIds = new Set(slots.filter((s) => s.player).map((s) => s.player!.player_id))

  const poolByPos = {
    F: players.filter((p) => p.position === 'F' && !usedIds.has(p.player_id)),
    D: players.filter((p) => p.position === 'D' && !usedIds.has(p.player_id)),
    G: players.filter((p) => p.position === 'G' && !usedIds.has(p.player_id)),
  }

  function handleDragStart(e: DragStartEvent) {
    setActivePlayer(e.active.data.current?.player ?? null)
  }

  function handleDragEnd(e: DragEndEvent) {
    setActivePlayer(null)
    const { active, over } = e
    if (!over) return

    const draggedPlayer: RosterPlayer = active.data.current?.player
    const from: string = active.data.current?.from
    const targetSlotId = over.id as string

    const prev = slotsRef.current
    const next = prev.map((s) => ({ ...s }))
    const targetIdx = next.findIndex((s) => s.id === targetSlotId)
    if (targetIdx === -1) return

    if (from === 'slot') {
      const sourceSlotId = active.id.toString().replace('slot-', '')
      const sourceIdx = next.findIndex((s) => s.id === sourceSlotId)
      if (sourceIdx !== -1) {
        next[sourceIdx].player = next[targetIdx].player
      }
    }

    next[targetIdx].player = draggedPlayer
    setSlots(next)
    onChange?.(next)
  }

  function clearSlot(slotId: string) {
    const next = slotsRef.current.map((s) => (s.id === slotId ? { ...s, player: null } : s))
    setSlots(next)
    onChange?.(next)
  }

  function clearAll() {
    const next = EMPTY_LINEUP.map((s) => ({ ...s, player: null }))
    setSlots(next)
    onChange?.(next)
  }


  const forwardLines = [slots.slice(0, 3), slots.slice(3, 6), slots.slice(6, 9), slots.slice(9, 12)]
  const defensePairs = [slots.slice(12, 14), slots.slice(14, 16), slots.slice(16, 18)]
  const goaliePair   = slots.slice(18, 20)

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-4 xl:grid" style={{ gridTemplateColumns: 'minmax(0,3fr) minmax(0,7fr)' }}>

        {/* Player pool */}
        <div className="bg-white/5 rounded-xl p-4">
          {/* Position tabs + clear */}
          <div className="flex items-center gap-2 mb-3">
          <div className="flex rounded-lg overflow-hidden bg-black/20 flex-1">
            {POOL_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPoolTab(key)}
                className={`flex-1 text-[11px] font-semibold py-1.5 transition-colors ${
                  poolTab === key
                    ? 'bg-grizzly-gold text-grizzly-navy'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {label}
                {poolByPos[key].length > 0 && (
                  <span
                    className={`ml-1 text-[9px] ${
                      poolTab === key ? 'text-grizzly-navy/60' : 'text-white/25'
                    }`}
                  >
                    {poolByPos[key].length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={clearAll}
            className="text-xs text-white/30 hover:text-red-400 transition-colors shrink-0"
          >
            Clear all
          </button>
          </div>

          {/* Player list */}
          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-300px)]">
            {poolByPos[poolTab].length > 0 ? (
              poolByPos[poolTab].map((p) => (
                <DraggablePoolCard key={p.player_id} player={p} />
              ))
            ) : (
              <p className="text-white/20 text-xs text-center py-6">All placed ✓</p>
            )}
          </div>
        </div>

        {/* Lineup grid */}
        <div className="space-y-4 min-w-0">
          {forwardLines.map((line, i) => (
            <div key={i}>
              <p className="text-white/30 text-[10px] uppercase font-bold mb-1">Line {i + 1}</p>
              <div className="grid grid-cols-3 gap-2">
                {line.map((slot) => (
                  <SlotCell key={slot.id} slot={slot} onClear={clearSlot} dragPosition={activePlayer?.position as 'F' | 'D' | 'G' | null | undefined} />
                ))}
              </div>
            </div>
          ))}

          <div className="border-t border-white/10 pt-4 space-y-2">
            <p className="text-white/30 text-[10px] uppercase font-bold mb-2">Defence</p>
            {defensePairs.map((pair, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                {pair.map((slot) => (
                  <SlotCell key={slot.id} slot={slot} onClear={clearSlot} dragPosition={activePlayer?.position as 'F' | 'D' | 'G' | null | undefined} />
                ))}
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-4">
            <p className="text-white/30 text-[10px] uppercase font-bold mb-2">Goalies</p>
            <div className="grid grid-cols-2 gap-2">
              {goaliePair.map((slot) => (
                <SlotCell key={slot.id} slot={slot} onClear={clearSlot} dragPosition={activePlayer?.position as 'F' | 'D' | 'G' | null | undefined} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activePlayer && (
          <div className="flex items-stretch overflow-hidden rounded-lg bg-white shadow-xl" style={{ height: 56, width: 240 }}>
            {/* Number */}
            <div className="flex-shrink-0 w-14 flex items-center justify-center text-grizzly-gold font-black leading-none tabular-nums" style={{ fontSize: '1.4rem' }}>
              #{activePlayer.tp_jersey_number}
            </div>
            {/* Photo */}
            <div className="flex-shrink-0 w-12 bg-black/5 ml-3">
              <SquarePhoto playerId={activePlayer.player_id} src={activePlayer.photo} fullHeight />
            </div>
            {/* Name */}
            <div className="flex-1 flex flex-col justify-center pl-3 pr-2 min-w-0">
              <span className="font-bold text-black truncate" style={{ fontSize: '1.2rem' }}>
                {activePlayer.name.trim().split(' ').slice(-1)[0]}
              </span>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
