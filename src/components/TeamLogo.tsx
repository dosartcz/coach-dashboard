'use client'
import { useState, useEffect } from 'react'

const logoJpg = (teamId: string) => `/api/img?path=kijhl/logos/${teamId}.jpg`
const logoPng = (teamId: string) => `/api/img?path=kijhl/logos/${teamId}.png`

/**
 * Team logo with the white background removed.
 * Flood-fills near-white pixels connected to the image border, so white
 * details INSIDE the logo survive. Loaded through the same-origin proxy,
 * so the canvas stays untainted; output is a PNG data URL (export-safe).
 */
export function TeamLogo({ teamId, size = 40, className }: { teamId: string; size?: number; className?: string }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    function process(img: HTMLImageElement) {
      const w = img.naturalWidth
      const h = img.naturalHeight
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, w, h)
      const px = imageData.data

      const nearWhite = (i: number) => px[i] > 235 && px[i + 1] > 235 && px[i + 2] > 235
      const visited = new Uint8Array(w * h)
      const stack: number[] = []

      // Seed with all border pixels
      for (let x = 0; x < w; x++) { stack.push(x); stack.push((h - 1) * w + x) }
      for (let y = 0; y < h; y++) { stack.push(y * w); stack.push(y * w + w - 1) }

      while (stack.length) {
        const p = stack.pop()!
        if (visited[p]) continue
        visited[p] = 1
        const i = p * 4
        if (!nearWhite(i)) continue
        px[i + 3] = 0 // transparent
        const x = p % w
        const y = (p / w) | 0
        if (x > 0) stack.push(p - 1)
        if (x < w - 1) stack.push(p + 1)
        if (y > 0) stack.push(p - w)
        if (y < h - 1) stack.push(p + w)
      }

      ctx.putImageData(imageData, 0, 0)
      if (!cancelled) setSrc(c.toDataURL('image/png'))
    }

    function tryLoad(url: string, fallback?: string) {
      const img = new Image()
      img.onload = () => { if (!cancelled) process(img) }
      img.onerror = () => { if (!cancelled && fallback) tryLoad(fallback) }
      img.src = url
    }

    setSrc(null)
    tryLoad(logoJpg(teamId), logoPng(teamId))
    return () => { cancelled = true }
  }, [teamId])

  if (!src) return <div className={className} style={{ width: size, height: size, flexShrink: 0 }} />
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt=""
      className={className}
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
    />
  )
}
