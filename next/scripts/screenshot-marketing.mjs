// Capture each post-hero section. Drives Lenis scroll directly so the
// frame index advances correctly past the pinned hero (which spans 500vh).
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.HERO_URL || 'http://localhost:3008'
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = join(process.cwd(), '.screens')
mkdirSync(OUT, { recursive: true })

const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1 }

// Hero pinned section is 100vh; pin spacer adds 500vh; first marketing
// section starts at scrollY = 600vh = 5400 (vh = 900). After that we
// scroll an additional ~700px per section.
const POINTS = [
  { name: 'mkt-stats',     y: 5400 },
  { name: 'mkt-about',     y: 5800 },
  { name: 'mkt-services',  y: 6500 },
  { name: 'mkt-reviews',   y: 7400 },
  { name: 'mkt-community', y: 8400 },
  { name: 'mkt-store',     y: 9300 },
  { name: 'mkt-booking',   y: 10100 },
  { name: 'mkt-footer',    y: 11000 },
  { name: 'mkt-ghostbar',  y: 5500 }, // ghostbar visible past hero
]

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
})

async function shoot(label, url, scrollY) {
  const page = await browser.newPage()
  await page.setViewport(VIEWPORT)
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
  })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await new Promise((r) => setTimeout(r, 4500)) // hero preload
  await page.evaluate((y) => {
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true })
    else window.scrollTo(0, y)
  }, scrollY)
  await new Promise((r) => setTimeout(r, 1800))
  const path = join(OUT, `${label}.png`)
  await page.screenshot({ path, type: 'png' })
  process.stdout.write(`[ok] ${label} -> ${path}\n`)
  await page.close()
}

for (const pt of POINTS) {
  await shoot(pt.name, `${BASE}/`, pt.y)
}

await browser.close()
