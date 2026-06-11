'use client'
import { useState } from 'react'
import { TeamLogo } from '@/components/TeamLogo'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        window.location.href = '/'
      } else {
        setError('Wrong password')
        setPassword('')
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="bg-white/5 border border-white/10 rounded-xl p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="mb-3"><TeamLogo teamId="19" size={64} /></div>
            <h1 className="text-white font-bold text-lg">Coach Dashboard</h1>
            <p className="text-white/40 text-xs mt-1">Sign in to continue</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-white/60 text-xs uppercase tracking-wider block mb-1">Password</label>
              <input
                type="password"
                autoFocus
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/10 text-white rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-grizzly-gold"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-grizzly-gold text-grizzly-navy font-bold py-2 rounded hover:bg-grizzly-gold/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
