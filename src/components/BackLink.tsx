'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

/** Back link that points to the page the user actually came from. */
export default function BackLink() {
  const [target, setTarget] = useState({ href: '/games', label: 'Games' })

  useEffect(() => {
    try {
      const ref = document.referrer ? new URL(document.referrer) : null
      if (!ref || ref.origin !== window.location.origin) return
      if (ref.pathname === '/') setTarget({ href: '/', label: 'Dashboard' })
      else if (ref.pathname.startsWith('/schedule')) setTarget({ href: '/schedule', label: 'Schedule' })
      else if (ref.pathname.startsWith('/games')) setTarget({ href: '/games', label: 'Games' })
    } catch { /* keep default */ }
  }, [])

  return (
    <Link href={target.href} className="text-white/40 text-sm hover:text-grizzly-gold transition-colors">
      ← {target.label}
    </Link>
  )
}
