'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

/** Back link that points to the page the user actually came from. */
export default function BackLink() {
  const [target, setTarget] = useState({ href: '/games', label: 'Games' })

  useEffect(() => {
    try {
      // Previous path tracked by NavBar (client-side navigation has no referrer);
      // document.referrer covers full page loads
      let prev = sessionStorage.getItem('gz_prev_path')
      if (!prev && document.referrer) {
        const ref = new URL(document.referrer)
        if (ref.origin === window.location.origin) prev = ref.pathname
      }
      if (!prev) return
      if (prev === '/') setTarget({ href: '/', label: 'Dashboard' })
      else if (prev.startsWith('/schedule')) setTarget({ href: '/schedule', label: 'Schedule' })
      else if (prev.startsWith('/games')) setTarget({ href: '/games', label: 'Games' })
    } catch { /* keep default */ }
  }, [])

  return (
    <Link href={target.href} className="text-white/40 text-sm hover:text-grizzly-gold transition-colors">
      ← {target.label}
    </Link>
  )
}
