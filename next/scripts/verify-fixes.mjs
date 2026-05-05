// Verify the 4 fixes: community stats inside, AR clean, logo visible, booking 2 lines.
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.HERO_URL || 'http://localhost:3000'
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = join(process.cwd(), '.screens')
mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
})

async function shoot({ label, url = `${BASE}/`, scrollY = 0, viewport, waitMs = 4500 }) {
  const page = await browser.newPage()
  await page.setViewport(viewport)
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
  })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await new Promise((r) => setTimeout(r, waitMs))
  if (scrollY > 0) {
    await page.evaluate((y) => {
      if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true })
      else window.scrollTo(0, y)
    }, scrollY)
    await new Promise((r) => setTimeout(r, 1500))
  }
  const path = join(OUT, `${label}.png`)
  await page.screenshot({ path, type: 'png' })
  process.stdout.write(`[ok] ${label} -> ${path}\n`)
  await page.close()
}

const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1 }

// Fix 3 — logo in hero (top-left, before scroll)
await shoot({ label: 'fix-hero-logo', viewport: DESKTOP, scrollY: 0 })

// Fix 3 — logo in GhostBar (after scrolling past hero)
await shoot({ label: 'fix-ghostbar-logo', viewport: DESKTOP, scrollY: 5500 })

// Fix 1 — community section: stats inside the frosted overlay
await shoot({ label: 'fix-community', viewport: DESKTOP, scrollY: 8400 })

// Fix 4 — booking CTA two-line layout
await shoot({ label: 'fix-booking', viewport: DESKTOP, scrollY: 10100 })

// Fix 2 — Arabic hero, frame 0 (no words should be pre-visible)
await shoot({ label: 'fix-ar-hero-initial', url: `${BASE}/ar`, viewport: DESKTOP, scrollY: 0 })

// Fix 2 — Arabic hero, sub words revealed (no shadow halo behind words)
await shoot({ label: 'fix-ar-hero-sub', url: `${BASE}/ar`, viewport: DESKTOP, scrollY: 2600 })

await browser.close()
