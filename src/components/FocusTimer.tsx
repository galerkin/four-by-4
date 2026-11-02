import { useLayoutEffect, useRef, useState } from 'react'

// Oswald (weight 600) advance widths, in em. Digits are proportional in Oswald, so each character gets a
// fixed-width cell; the countdown then never shifts sideways from second to second.
const DIGIT_EM = 0.55
const COLON_EM = 0.27
// Visible digit height relative to font size, and the most we stretch digits vertically.
const GLYPH_EM = 0.82
const MAX_STRETCH = 1.9
// Oswald draws digits slightly above the center of the line box; nudge them back (in em, pre-scale).
const GLYPH_OFFSET_EM = 0.025
// Share of the free height the digits may use, leaving breathing room above and below.
const HEIGHT_SHARE = 0.94

/**
 * The play-mode countdown: sized to the full width of its box, then stretched vertically
 * (up to MAX_STRETCH) to fill the remaining height — a tall condensed numeral, never rotated.
 */
export function FocusTimer({ text, label }: { text: string; label: string }) {
  const box = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState({ size: 0, stretch: 1 })
  const chars = [...text]
  const ems = chars.reduce((sum, char) => sum + (char === ':' ? COLON_EM : DIGIT_EM), 0)
  useLayoutEffect(() => {
    const element = box.current
    if (!element) return
    const measure = () => {
      const { width, height: box } = element.getBoundingClientRect()
      const height = box * HEIGHT_SHARE
      if (!width || !height) return
      const size = Math.min(width / ems, height / GLYPH_EM)
      const stretch = Math.min(MAX_STRETCH, Math.max(1, height / (size * GLYPH_EM)))
      setFit((previous) => (Math.abs(previous.size - size) < 0.5 && Math.abs(previous.stretch - stretch) < 0.01 ? previous : { size, stretch }))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ems])
  return (
    <div className="focus-timer" ref={box}>
      <div className="timer-number focus-digits" role="timer" aria-label={label} style={{ fontSize: fit.size || undefined, transform: `scaleY(${fit.stretch}) translateY(${GLYPH_OFFSET_EM}em)`, visibility: fit.size ? 'visible' : 'hidden' }}>
        {chars.map((char, index) => <span key={index} className={char === ':' ? 'colon' : 'digit'}>{char}</span>)}
      </div>
    </div>
  )
}
