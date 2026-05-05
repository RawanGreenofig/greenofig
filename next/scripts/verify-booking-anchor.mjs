import puppeteer from 'puppeteer-core'
import { join } from 'node:path'

const BASE = process.env.HERO_URL || 'http://localhost:3001'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
})

async function shoot({ label, url = `${BASE}/`, viewport, fullPage = false }) {
  const page = await browser.newPage()
  await page.setViewport(viewport)
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
  })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await new Promise((r) => setTimeout(r, 4500))
  // Scroll booking section's top to viewport top
  const targetY = await page.evaluate(() => {
    const el = document.getElementById('booking')
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    return rect.top + window.scrollY
  })
  await page.evaluate((y) => {
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true })
    else window.scrollTo(0, y)
  }, targetY)
  await new Promise((r) => setTimeout(r, 2000))
  const path = join(process.cwd(), '.screens', `${label}.png`)
  await page.screenshot({ path, type: 'png', fullPage })
  process.stdout.write(`[ok] ${label} -> targetY=${targetY}\n`)
  await page.close()
}

const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1 }
const MOBILE  = { width: 375,  height: 812, deviceScaleFactor: 1, isMobile: true, hasTouch: true }

await shoot({ label: 'booking-d-anchored', viewport: DESKTOP })
await shoot({ label: 'booking-m-anchored', viewport: MOBILE })
await shoot({ label: 'booking-ar-anchored', url: `${BASE}/ar`, viewport: DESKTOP })
// Also a tall mobile capture so we see the full section
await shoot({ label: 'booking-m-full', viewport: { ...MOBILE, height: 1600 } })

await browser.close()
