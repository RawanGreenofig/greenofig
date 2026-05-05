// Verify the booking redesign at desktop, mobile, and Arabic.
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.HERO_URL || 'http://localhost:3001'
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = join(process.cwd(), '.screens')
mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
})

async function shoot({ label, url = `${BASE}/`, scrollY, viewport }) {
  const page = await browser.newPage()
  await page.setViewport(viewport)
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
  })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await new Promise((r) => setTimeout(r, 4500))
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

const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1 }
const MOBILE  = { width: 375,  height: 812, deviceScaleFactor: 1, isMobile: true, hasTouch: true }

await shoot({ label: 'booking-desktop', viewport: DESKTOP, scrollY: 9700 })
await shoot({ label: 'booking-mobile',  viewport: MOBILE,  scrollY: 11500 })
await shoot({ label: 'booking-mobile-2',viewport: MOBILE,  scrollY: 12300 })
await shoot({ label: 'booking-arabic',  url: `${BASE}/ar`, viewport: DESKTOP, scrollY: 9700 })

await browser.close()
