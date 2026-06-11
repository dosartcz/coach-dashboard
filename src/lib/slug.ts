import type { DbMatch } from '@/types/hockey'

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
