import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
})
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await p.evaluateOnNewDocument(() => {
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
})
const base = process.env.HERO_URL || 'http://localhost:3008'
await p.goto(`${base}/`, { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 4500))
await p.evaluate((y) => {
  if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true })
  else window.scrollTo(0, y)
}, 5500)
await new Promise((r) => setTimeout(r, 1500))
await p.screenshot({ path: '.screens/mkt-ghostbar-v2.png' })
process.stdout.write('ok\n')
await b.close()
