import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { Anton } from 'next/font/google'
import { TeamLogo } from '@/components/TeamLogo'
import './globals.css'

const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-display' })

export const metadata: Metadata = {
  title: 'Revelstoke Grizzlies Dashboard',
  description: 'KIJHL – Revelstoke Grizzlies Coach Dashboard',
  // Internal tool — keep out of search engines
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#111111',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`bg-grizzly-navy min-h-screen text-white ${anton.variable}`}>
        <header className="bg-grizzly-red border-b border-grizzly-gold/40">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <TeamLogo teamId={process.env.TEAM_ID ?? '19'} size={40} />
              <div>
                <h1 className="text-lg font-bold text-white leading-tight">Coach Dashboard</h1>
                <p className="text-grizzly-gold text-xs font-medium">Revelstoke Grizzlies</p>
              </div>
            </div>
            <nav className="flex gap-1 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible">
              {[
                { href: '/', label: 'Dashboard' },
                { href: '/roster', label: 'Roster' },
                { href: '/games', label: 'Games' },
                { href: '/schedule', label: 'Schedule' },
              ].map(({ href, label }) => (
                <Link
                  key={label}
                  href={href}
                  className="px-3 md:px-4 py-2 rounded text-sm font-medium whitespace-nowrap text-white/80 hover:text-grizzly-gold hover:bg-white/5 transition-colors"
                >
                  {label}
                </Link>
              ))}
              <a
                href="/api/auth/logout"
                className="px-3 md:px-4 py-2 rounded text-sm font-medium whitespace-nowrap text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                title="Sign out"
              >
                Sign out
              </a>
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
        <footer className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-white/30 border-t border-white/10 mt-8">
          Official statistics provided by{' '}
          <a href="http://leaguestat.com" className="underline">
            Kootenay International Junior Hockey
          </a>{' '}
          · Powered by{' '}
          <a href="http://hockeytech.com" className="underline">
            HockeyTech.com
          </a>{' '}
          · Built by Adam &amp; Claude in 2026
        </footer>
      </body>
    </html>
  )
}
