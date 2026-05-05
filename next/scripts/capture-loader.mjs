// Capture the hero loader mid-load using CDP throttling.
import puppeteer from 'puppeteer-core'
import { join } from 'node:path'

const BASE = process.env.HERO_URL || 'http://localhost:3004'
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
})

async function shoot(label, ms, viewport) {
  const page = await browser.newPage()
  await page.setViewport(viewport)
  // Throttle to ~Slow 3G so the 40 frames take time to preload
  const client = await page.target().createCDPSession()
  await client.send('Network.enable')
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: (200 * 1024) / 8, // 200 kbps
    uploadThroughput: (50 * 1024) / 8,
    latency: 200,
  })
  // Don't wait for full load — hit the loader mid-flight
  page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await new Promise((r) => setTimeout(r, ms))
  const path = join(process.cwd(), '.screens', `${label}.png`)
  await page.screenshot({ path, type: 'png' })
  process.stdout.write(`[ok] ${label} (after ${ms}ms throttled)\n`)
  await page.close()
}

const D = { width: 1440, height: 900, deviceScaleFactor: 1 }
await shoot('loader-early', 1500, D)   // very low progress
await shoot('loader-mid',   3500, D)   // mid progress
await shoot('loader-late',  6000, D)   // near complete

await browser.close()
