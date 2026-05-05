import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
})
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
const client = await p.target().createCDPSession()
await client.send('Network.enable')
// 50kbps to keep loader on screen long enough to inspect
await client.send('Network.emulateNetworkConditions', {
  offline: false,
  downloadThroughput: (50 * 1024) / 8,
  uploadThroughput: (10 * 1024) / 8,
  latency: 100,
})
p.goto('http://localhost:3004/', { waitUntil: 'domcontentloaded' }).catch(() => {})
await new Promise((r) => setTimeout(r, 5000))

const result = await p.evaluate(() => {
  // Find the loader: fixed-positioned, full-viewport, deep-green bg
  const all = Array.from(document.querySelectorAll('div'))
  const loader = all.find((d) => {
    const s = getComputedStyle(d)
    return (
      s.position === 'fixed' &&
      s.background.includes('rgb(13, 26, 18)') ||
      (s.backgroundColor === 'rgb(13, 26, 18)' && s.position === 'fixed')
    )
  })
  if (!loader) return { found: false }
  return {
    found: true,
    text: loader.textContent?.trim() ?? '',
    images: loader.querySelectorAll('img').length,
    progressBars: Array.from(loader.querySelectorAll('div')).filter((d) => {
      const s = getComputedStyle(d)
      return s.position === 'absolute' && s.height === '2px'
    }).length,
    childCount: loader.children.length,
  }
})
console.log(JSON.stringify(result, null, 2))
await b.close()
