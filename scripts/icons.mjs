// Draws the app icons (public/icons, app/apple-icon.png, app/icon.png) from one SVG: a sun rising over the horizon, in
// the design system's primary (oklch(0.205 0 0), #171717) and background. Run `node scripts/icons.mjs` after changing it.
import { createRequire } from "node:module"

// Playwright is not a dependency of the project: use the one installed globally (`npm i -g playwright` where there is none).
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT ?? "playwright")

const INK = "#171717"
const PAPER = "#ffffff"

/** `safe` is the share of the square the drawing may use: a maskable icon is cut to a circle by the system. */
const svg = (safe, round) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect width="100" height="100" rx="${round ? 22 : 0}" fill="${INK}"/>
  <g transform="translate(50 50) scale(${safe}) translate(-50 -50)">
    <clipPath id="sky"><rect x="0" y="0" width="100" height="60"/></clipPath>
    <circle cx="50" cy="60" r="22" fill="${PAPER}" clip-path="url(#sky)"/>
    <g stroke="${PAPER}" stroke-width="5" stroke-linecap="round">
      <line x1="16" y1="70" x2="84" y2="70"/>
      <line x1="30" y1="80" x2="70" y2="80"/>
      <line x1="50" y1="18" x2="50" y2="28"/>
      <line x1="21" y1="31" x2="28" y2="38"/>
      <line x1="79" y1="31" x2="72" y2="38"/>
    </g>
  </g>
</svg>`

const ICONS = [
  ["public/icons/icon-192.png", 192, 1, true],
  ["public/icons/icon-512.png", 512, 1, true],
  ["public/icons/maskable-512.png", 512, 0.72, false],
  ["app/apple-icon.png", 180, 0.86, false],
  ["app/icon.png", 64, 1, true],
]

const browser = await chromium.launch()
const page = await browser.newPage()
for (const [path, size, safe, round] of ICONS) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg(safe, round)}`)
  await page.locator("svg").screenshot({ path, omitBackground: true })
  console.log(path)
}
await browser.close()
