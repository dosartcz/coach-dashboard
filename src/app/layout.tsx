import { OUR_TEAM_ID } from '@/lib/hockeytech'
import type { Metadata, Viewport } from 'next'
import { Anton } from 'next/font/google'
import NavBar from '@/components/NavBar'
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
      <body className={`bg-grizzly-navy min-h-screen flex flex-col text-white ${anton.variable}`}>
        <NavBar teamId={OUR_TEAM_ID} />
        <main className="w-full max-w-7xl mx-auto px-4 py-6 flex-1">{children}</main>
        <footer className="w-full max-w-7xl mx-auto px-4 py-4 text-center text-xs text-white/30 border-t border-white/10 mt-8">
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
