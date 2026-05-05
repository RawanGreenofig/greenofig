// Capture hero + about for both English and Arabic locales.
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.HERO_URL || 'http://localhost:3004'
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = join(process.cwd(), '.screens')
mkdirSync(OUT, { recursive: true })

const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1 }

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
})

async function shoot(label, url, scrollY = 0) {
  const page = await browser.newPage()
  await page.setViewport(VIEWPORT)
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
  })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await new Promise((r) => setTimeout(r, 4500)) // hero preload
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

// English hero (frame 0)
await shoot('locale-en-hero-0', `${BASE}/`, 0)
// English at full subtitle
await shoot('locale-en-hero-sub', `${BASE}/`, 2600)
// English about
await shoot('locale-en-about', `${BASE}/`, 5400)

// Arabic hero (frame 0) — should be RTL
await shoot('locale-ar-hero-0', `${BASE}/ar`, 0)
// Arabic at full subtitle
await shoot('locale-ar-hero-sub', `${BASE}/ar`, 2600)
// Arabic about
await shoot('locale-ar-about', `${BASE}/ar`, 5400)

await browser.close()
