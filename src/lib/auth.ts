// Shared auth helpers — Web Crypto only (works in both Edge and Node runtimes)

export const AUTH_COOKIE = 'gz_auth'
const TOKEN_PAYLOAD = 'grizzlies-auth-v1'

/** Deterministic session token: HMAC-SHA256(secret, payload) as hex. */
export async function computeToken(): Promise<string> {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(TOKEN_PAYLOAD))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
