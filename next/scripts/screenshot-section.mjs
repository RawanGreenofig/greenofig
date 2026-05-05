// Screenshot a specific section by scrolling past the hero pin.
// Usage: node scripts/screenshot-section.mjs <name> <scrollY>
//   e.g. node scripts/screenshot-section.mjs 02-about 5400
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const NAME = process.argv[2] || 'section'
const SCROLL_Y = Number(process.argv[3] || 5200)

const URL = process.env.HERO_URL || 'http://localhost:3004/'
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = join(process.cwd(), '.screens')
mkdirSync(OUT, { recursive: true })

const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1 }

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
})
const page = await browser.newPage()
await page.setViewport(VIEWPORT)
await page.evaluateOnNewDocument(() => {
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
})

await page.goto(URL, { waitUntil: 'domcontentloaded' })
// Wait for hero frames to preload
await new Promise((r) => setTimeout(r, 4500))

// Drive Lenis to the desired scroll position
await page.evaluate((y) => {
  if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true })
  else window.scrollTo(0, y)
}, SCROLL_Y)
// Let scroll-driven animations settle and reveals run
await new Promise((r) => setTimeout(r, 2000))

const path = join(OUT, `section-${NAME}.png`)
await page.screenshot({ path, type: 'png' })
process.stdout.write(`[ok] section-${NAME} -> ${path} (scrollY=${SCROLL_Y})\n`)

await browser.close()
