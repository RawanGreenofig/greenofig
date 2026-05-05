import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.HERO_URL || 'http://localhost:3000'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = join(process.cwd(), '.screens')
mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
})

async function shoot({ label, url, viewport, waitMs = 1500 }) {
  const page = await browser.newPage()
  await page.setViewport(viewport)
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
  })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await new Promise((r) => setTimeout(r, waitMs))
  const path = join(OUT, `${label}.png`)
  await page.screenshot({ path, type: 'png' })
  process.stdout.write(`[ok] ${label}\n`)
  await page.close()
}

const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1 }
const MOBILE  = { width: 375,  height: 812, deviceScaleFactor: 1, isMobile: true, hasTouch: true }

await shoot({ label: 'auth2-signin-desktop',      url: `${BASE}/sign-in`, viewport: DESKTOP, waitMs: 2500 })
await shoot({ label: 'auth2-signup-desktop',      url: `${BASE}/sign-up`, viewport: DESKTOP, waitMs: 2500 })
await shoot({ label: 'auth2-forgot-desktop',      url: `${BASE}/forgot-password`, viewport: DESKTOP, waitMs: 2500 })
await shoot({ label: 'auth2-signin-mobile',       url: `${BASE}/sign-in`, viewport: MOBILE,  waitMs: 2500 })
await shoot({ label: 'auth2-signin-arabic',       url: `${BASE}/ar/sign-in`, viewport: DESKTOP, waitMs: 2500 })

await browser.close()
