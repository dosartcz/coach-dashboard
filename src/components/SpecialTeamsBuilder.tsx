'use client'
import { useState, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { DraggablePoolCard, SlotCell, SquarePhoto } from './LineupBuilder'
import type { RosterPlayer, LineupSlot } from '@/types/hockey'

// 5 skaters per PP unit, 4 per PK unit
export const EMPTY_SPECIAL: LineupSlot[] = [
  { id: 'pp1-lw', label: 'LW', position: 'F', player: null },
  { id: 'pp1-c',  label: 'C',  position: 'F', player: null },
  { id: 'pp1-rw', label: 'RW', position: 'F', player: null },
  { id: 'pp1-ld', label: 'LD', position: 'D', player: null },
  { id: 'pp1-rd', label: 'RD', position: 'D', player: null },
  { id: 'pp2-lw', label: 'LW', position: 'F', player: null },
  { id: 'pp2-c',  label: 'C',  position: 'F', player: null },
  { id: 'pp2-rw', label: 'RW', position: 'F', player: null },
  { id: 'pp2-ld', label: 'LD', position: 'D', player: null },
  { id: 'pp2-rd', label: 'RD', position: 'D', player: null },
  { id: 'pk1-f1', label: 'F',  position: 'F', player: null },
  { id: 'pk1-f2', label: 'F',  position: 'F', player: null },
  { id: 'pk1-d1', label: 'LD', position: 'D', player: null },
  { id: 'pk1-d2', label: 'RD', position: 'D', player: null },
  { id: 'pk2-f1', label: 'F',  position: 'F', player: null },
  { id: 'pk2-f2', label: 'F',  position: 'F', player: null },
  { id: 'pk2-d1', label: 'LD', position: 'D', player: null },
  { id: 'pk2-d2', label: 'RD', position: 'D', player: null },
]

export function blankSpecialSlots(): LineupSlot[] {
  return EMPTY_SPECIAL.map((s) => ({ ...s, player: null }))
}

const UNITS = [
  { key: 'pp1', title: 'Power Play 1' },
  { key: 'pp2', title: 'Power Play 2' },
  { key: 'pk1', title: 'Penalty Kill 1' },
  { key: 'pk2', title: 'Penalty Kill 2' },
] as const

const POOL_TABS = [
  { key: 'F' as const, label: 'Forwards' },
  { key: 'D' as const, label: 'Defence' },
]

interface Props {
  players: RosterPlayer[]
  initialSlots?: LineupSlot[]
  onChange?: (slots: LineupSlot[]) => void
}

export default function SpecialTeamsBuilder({ players, initialSlots, onChange }: Props) {
  const [slots, setSlots] = useState<LineupSlot[]>(() =>
    initialSlots ? initialSlots.map((s) => ({ ...s })) : blankSpecialSlots()
  )
  const [activePlayer, setActivePlayer] = useState<RosterPlayer | null>(null)
  const [poolTab, setPoolTab] = useState<'F' | 'D'>('F')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const slotsRef = useRef(slots)
  slotsRef.current = slots

  // Pool keeps every skater — one player can serve in multiple units
  const pool = players.filter((p) => p.position === poolTab)

  /** Units a player is currently part of, e.g. ["PP1", "PK1"] */
  function unitBadges(playerId: string): string[] {
    return UNITS.filter((u) =>
      slots.some((s) => s.id.startsWith(u.key) && s.player?.player_id === playerId)
    ).map((u) => u.key.toUpperCase())
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

    const targetUnit = targetSlotId.split('-')[0]

    if (from === 'slot') {
      const sourceSlotId = active.id.toString().replace('slot-', '')
      const sourceUnit = sourceSlotId.split('-')[0]
      const sourceIdx = next.findIndex((s) => s.id === sourceSlotId)
      // Swap within the same unit; dragging across units copies the player
      if (sourceIdx !== -1 && sourceUnit === targetUnit) {
        next[sourceIdx].player = next[targetIdx].player
      }
    }

    // A player can only appear once within a unit
    next.forEach((s, i) => {
      if (i !== targetIdx && s.id.startsWith(`${targetUnit}-`) && s.player?.player_id === draggedPlayer.player_id) {
        s.player = null
      }
    })

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
    const next = blankSpecialSlots()
    setSlots(next)
    onChange?.(next)
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-4 xl:[grid-template-columns:minmax(0,3fr)_minmax(0,7fr)]">

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
                    poolTab === key ? 'bg-grizzly-gold text-grizzly-navy' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {label}
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

          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-300px)]">
            {pool.map((p) => {
              const badges = unitBadges(p.player_id)
              return (
                <div key={p.player_id} className="relative shrink-0">
                  <DraggablePoolCard player={p} />
                  {badges.length > 0 && (
                    <div className="absolute bottom-1 right-1.5 flex gap-1 pointer-events-none">
                      {badges.map((b) => (
                        <span key={b} className="text-[8px] font-bold bg-grizzly-gold text-white rounded px-1 py-0.5 leading-none">
                          {b}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Units */}
        <div className="space-y-5 min-w-0">
          {UNITS.map((unit) => {
            const unitSlots = slots.filter((s) => s.id.startsWith(unit.key))
            const fSlots = unitSlots.filter((s) => s.position === 'F')
            const dSlots = unitSlots.filter((s) => s.position === 'D')
            return (
              <div key={unit.key} className={unit.key === 'pk1' ? 'border-t border-white/10 pt-5' : ''}>
                <p className="text-white/30 text-[10px] uppercase font-bold mb-1">{unit.title}</p>
                <div className={`grid gap-2 mb-2 ${fSlots.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {fSlots.map((slot) => (
                    <SlotCell key={slot.id} slot={slot} onClear={clearSlot} dragPosition={null} />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {dSlots.map((slot) => (
                    <SlotCell key={slot.id} slot={slot} onClear={clearSlot} dragPosition={null} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* dropAnimation off — the pool card stays in place, so the default
          "fly back to source" animation looks wrong here */}
      <DragOverlay dropAnimation={null}>
        {activePlayer && (
          <div className="flex items-stretch overflow-hidden rounded-lg bg-white shadow-xl" style={{ height: 56, width: 240 }}>
            <div className="flex-shrink-0 w-14 flex items-center justify-center text-grizzly-gold font-black leading-none tabular-nums" style={{ fontSize: '1.4rem' }}>
              #{activePlayer.tp_jersey_number}
            </div>
            <div className="flex-shrink-0 w-12 bg-black/5 ml-3">
              <SquarePhoto playerId={activePlayer.player_id} src={activePlayer.photo} fullHeight />
            </div>
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
