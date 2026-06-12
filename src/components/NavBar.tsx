'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TeamLogo } from './TeamLogo'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/roster', label: 'Roster' },
  { href: '/games', label: 'Games' },
  { href: '/schedule', label: 'Schedule' },
]

/** App header — horizontal nav on desktop, burger menu on mobile. */
export default function NavBar({ teamId }: { teamId: string }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // No navigation on the login screen
  if (pathname === '/login') return null

  return (
    <header className="bg-grizzly-red border-b border-grizzly-gold/40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TeamLogo teamId={teamId} size={40} />
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Coach Dashboard</h1>
            <p className="text-grizzly-gold text-xs font-medium">Revelstoke Grizzlies</p>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-1">
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              className="px-4 py-2 rounded text-sm font-medium text-white/80 hover:text-grizzly-gold hover:bg-white/5 transition-colors"
            >
              {label}
            </Link>
          ))}
          <a
            href="/api/auth/logout"
            className="px-4 py-2 rounded text-sm font-medium text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            title="Sign out"
          >
            Sign out
          </a>
        </nav>

        {/* Burger — mobile only */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={open}
          className="md:hidden p-2 -mr-2 text-white/80 hover:text-white transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? (
              <>
                <line x1="5" y1="5" x2="19" y2="19" />
                <line x1="19" y1="5" x2="5" y2="19" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <nav className="md:hidden border-t border-white/10 px-4 pb-3 pt-1 flex flex-col">
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              className="px-2 py-3 rounded text-sm font-medium text-white/80 hover:text-grizzly-gold hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
            >
              {label}
            </Link>
          ))}
          <a
            href="/api/auth/logout"
            className="px-2 py-3 rounded text-sm font-medium text-white/40 hover:text-white transition-colors"
          >
            Sign out
          </a>
        </nav>
      )}
    </header>
  )
}
