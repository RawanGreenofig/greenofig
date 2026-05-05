// Generic page screenshot tool.
// Usage: node scripts/screenshot-page.mjs <name> <url>
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const NAME = process.argv[2] || 'page'
const URL = process.argv[3] || 'http://localhost:3000'

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
await page.goto(URL, { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 1500))
const path = join(OUT, `${NAME}.png`)
await page.screenshot({ path, type: 'png' })
process.stdout.write(`[ok] ${NAME} -> ${path}\n`)
await browser.close()
