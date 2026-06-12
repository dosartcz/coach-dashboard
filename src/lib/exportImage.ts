import { toPng } from 'html-to-image'

/**
 * Wait until everything inside the export node is ready to capture:
 * - CSS background images preloaded into the browser cache
 * - team logos finished their async canvas processing (data-logo-loading gone)
 * - every <img> fully loaded
 */
async function waitForAssets(node: HTMLElement, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs

  // Preload CSS backgrounds so html-to-image's own fetch hits a warm cache
  const urls = new Set<string>()
  for (const el of [node, ...Array.from(node.querySelectorAll<HTMLElement>('*'))]) {
    const bg = getComputedStyle(el).backgroundImage
    if (!bg || bg === 'none') continue
    for (const m of bg.matchAll(/url\("?([^")]+)"?\)/g)) {
      if (!m[1].startsWith('data:')) urls.add(m[1])
    }
  }
  await Promise.all(
    [...urls].map(
      (u) =>
        new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = () => resolve()
          img.onerror = () => resolve()
          img.src = u
        })
    )
  )

  // Logos process asynchronously (flood-fill canvas) — wait them out
  for (;;) {
    const logosPending = node.querySelectorAll('[data-logo-loading]').length > 0
    const imgs = Array.from(node.querySelectorAll('img'))
    const imgsReady = imgs.every((i) => i.complete && i.naturalWidth > 0)
    if ((!logosPending && imgsReady) || Date.now() > deadline) return
    await new Promise((r) => setTimeout(r, 150))
  }
}

/** Render an export node to a PNG data URL — waits for all assets first. */
export async function renderNodeToPng(node: HTMLElement | null): Promise<string | null> {
  if (!node) return null
  await waitForAssets(node)
  // Safari/WebKit race: the first SVG→canvas pass often misses embedded images
  // (backgrounds come out blank). Render multiple passes and keep the last one.
  const isWebKit =
    typeof navigator !== 'undefined' &&
    /safari/i.test(navigator.userAgent) &&
    !/chrome|chromium|android/i.test(navigator.userAgent)
  const passes = isWebKit ? 3 : 1
  let dataUrl = ''
  for (let i = 0; i < passes; i++) {
    // No cacheBust: all assets are same-origin, so the warm browser cache is reused
    dataUrl = await toPng(node, { pixelRatio: 1 })
  }
  return dataUrl
}
