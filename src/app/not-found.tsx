import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <p className="text-white/20 text-6xl font-black mb-4">404</p>
      <p className="text-white/50 text-lg">This is not the page you are looking for.</p>
      <Link href="/" className="mt-6 text-grizzly-gold text-sm hover:underline">Go home</Link>
    </div>
  )
}
