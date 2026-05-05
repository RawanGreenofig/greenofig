/**
 * Marketing-site film grain overlay.
 * SVG feTurbulence noise rendered to a data-URL background, fixed
 * full-viewport, mix-blend-mode overlay at 8% opacity per spec.
 *
 * Pure CSS — no JS, no client component needed.
 */
const NOISE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">' +
  '<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.88" numOctaves="4" stitchTiles="stitch"/></filter>' +
  '<rect width="100%" height="100%" filter="url(#n)" opacity="0.7"/>' +
  '</svg>'

const NOISE_URL = `url("data:image/svg+xml;utf8,${encodeURIComponent(NOISE_SVG)}")`

export function FilmGrain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[999]"
      style={{
        backgroundImage: NOISE_URL,
        opacity: 0.08,
        mixBlendMode: 'overlay',
      }}
    />
  )
}
