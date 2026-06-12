import type { DbMatch, ManualPlayer } from '@/types/hockey'

/** ASCII-only, lowercase, dash-separated. */
export function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Match URL slug: "2026-02-14-kimberley-dynamiters" */
export function matchSlug(m: Pick<DbMatch, 'date' | 'opponent_name'>): string {
  return `${m.date}-${norm(m.opponent_name)}`
}

/** Roster player URL slug: "novak-jan-05" (lastname-firstname-yy) */
export function playerSlug(name: string, birthdateYear?: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0] ?? ''
  const last = parts.slice(1).join(' ')
  const yy = birthdateYear ? birthdateYear.slice(-2) : ''
  const pieces = last ? [norm(last), norm(first)] : [norm(first)]
  if (yy) pieces.push(yy)
  return pieces.join('-')
}

/** Manual player URL slug: "novak-jan-05-42" — DB id is always the last segment */
export function manualPlayerSlug(player: Pick<ManualPlayer, 'name' | 'birthdate' | 'id'>): string {
  const parts = player.name.trim().split(/\s+/)
  const first = parts[0] ?? ''
  const last = parts.slice(1).join(' ')
  const yy = player.birthdate ? player.birthdate.slice(2, 4) : ''
  const pieces = last ? [norm(last), norm(first)] : [norm(first)]
  if (yy) pieces.push(yy)
  pieces.push(String(player.id))
  return pieces.join('-')
}
