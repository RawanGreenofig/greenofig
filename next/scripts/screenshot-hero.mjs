// Capture five screenshots of the hero scroll at different progress points.
// Usage: node scripts/screenshot-hero.mjs
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const URL = process.env.HERO_URL || 'http://localhost:3004/'
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = join(process.cwd(), '.screens')
mkdirSync(OUT, { recursive: true })

const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1 }

// Viewport is 900px. Pinned scrub spans 500vh = 4500px total.
// Frame index at scrollY = round((scrollY / 4500) * 39)
const POINTS = [
  { name: '02-frame00',    scrollY: 0,    waitMs: 4500 },  // after preload, frame 0
  { name: '03-eat-real',   scrollY: 1100, waitMs: 1800 },  // ~frame 9 — both Eat and Real. revealed
  { name: '04a-sub1',      scrollY: 1700, waitMs: 1800 },  // ~frame 14 — first sub word
  { name: '04b-sub2',      scrollY: 2150, waitMs: 1800 },  // ~frame 18 — sub2 just revealed
  { name: '04c-sub3',      scrollY: 2600, waitMs: 1800 },  // ~frame 22 — full sub line
  { name: '05-pure-cta',   scrollY: 4400, waitMs: 1800 },  // ~frame 38 — Transform + CTA
  { name: '06-final',      scrollY: 4500, waitMs: 1800 },  // frame 39 — final state
]

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
})
const page = await browser.newPage()
await page.setViewport(VIEWPORT)

// Pretend we have plenty of cores so the static fallback doesn't kick in
await page.evaluateOnNewDocument(() => {
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
})

await page.goto(URL, { waitUntil: 'domcontentloaded' })

for (const pt of POINTS) {
  if (pt.waitMs) await new Promise((r) => setTimeout(r, pt.waitMs))
  await page.evaluate((y) => {
    // Drive Lenis directly so the scrub stays in sync with our scroll position
    if (window.__lenis) {
      window.__lenis.scrollTo(y, { immediate: true })
    } else {
      window.scrollTo(0, y)
    }
  }, pt.scrollY)
  await new Promise((r) => setTimeout(r, 1500))
  const path = join(OUT, `hero-${pt.name}.png`)
  await page.screenshot({ path, type: 'png' })
  process.stdout.write(`[ok] ${pt.name} -> ${path}\n`)
}

await browser.close()
