// Diagnostic capture set — desktop section shots + mobile shots.
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.HERO_URL || 'http://localhost:3009'
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = join(process.cwd(), '.screens')
mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
})

async function shoot({ label, url = `${BASE}/`, scrollY = 0, viewport, fullPage = false, waitMs = 4500 }) {
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
  await page.screenshot({ path, type: 'png', fullPage })
  process.stdout.write(`[ok] ${label} -> ${path}\n`)
  await page.close()
}

const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1 }
const MOBILE  = { width: 375,  height: 812, deviceScaleFactor: 1, isMobile: true, hasTouch: true }

// Desktop section captures (1440)
await shoot({ label: 'diag-d-hero',     viewport: DESKTOP, scrollY: 0    })       // top + wordmark
await shoot({ label: 'diag-d-stats',    viewport: DESKTOP, scrollY: 5400 })      // stats + about
await shoot({ label: 'diag-d-services', viewport: DESKTOP, scrollY: 6700 })      // services
await shoot({ label: 'diag-d-reviews',  viewport: DESKTOP, scrollY: 7600 })      // reviews + community-top
await shoot({ label: 'diag-d-store',    viewport: DESKTOP, scrollY: 9300 })      // store + booking
await shoot({ label: 'diag-d-footer',   viewport: DESKTOP, scrollY: 11000 })     // footer w/ watermark

// Mobile shots (375)
await shoot({ label: 'diag-m-hero',     viewport: MOBILE,  scrollY: 0    })
await shoot({ label: 'diag-m-services', viewport: MOBILE,  scrollY: 6500 })
await shoot({ label: 'diag-m-footer',   viewport: MOBILE,  scrollY: 14000 })

await browser.close()
