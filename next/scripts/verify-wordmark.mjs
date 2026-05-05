import puppeteer from 'puppeteer-core'
import { join } from 'node:path'

const BASE = process.env.HERO_URL || 'http://localhost:3005'
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
})

async function shoot({ label, url, scrollY = 0, viewport, waitMs = 2500 }) {
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
  await page.screenshot({
    path: join(process.cwd(), '.screens', `${label}.png`),
    type: 'png',
  })
  process.stdout.write(`[ok] ${label}\n`)
  await page.close()
}

const D = { width: 1440, height: 900, deviceScaleFactor: 1 }

await shoot({ label: 'wm-hero',     url: `${BASE}/`,        viewport: D, waitMs: 4500 })
await shoot({ label: 'wm-ghostbar', url: `${BASE}/`,        viewport: D, waitMs: 4500, scrollY: 5500 })
await shoot({ label: 'wm-signin',   url: `${BASE}/sign-in`, viewport: D })

await browser.close()
