import { useEffect, useRef } from 'react'
import gsap from 'gsap'

// Detect touch / mobile once — component returns null if true
const isTouchDevice =
  typeof window !== 'undefined' &&
  ('ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.innerWidth < 640)

// Leaf SVG path (symmetric, pointed top & bottom, slight natural tilt applied via GSAP rotation)
const INNER_PATH = 'M 0,-10 C 7,-5 7,5 0,10 C -7,5 -7,-5 0,-10 Z'
const OUTER_PATH = 'M 0,-20 C 14,-10 14,10 0,20 C -14,10 -14,-10 0,-20 Z'

export default function CustomCursor() {
  if (isTouchDevice) return null

  const dotRef    = useRef(null) // inner leaf SVG
  const brushRef  = useRef(null) // brush preview circle (stays round)

  // ── Mouse tracking ────────────────────────────────────────────────────────
  useEffect(() => {
    const dot   = dotRef.current
    const brush = brushRef.current
    if (!dot || !brush) return

    gsap.set(dot,   { xPercent: -50, yPercent: -50, opacity: 0, rotation: 15 })
    gsap.set(brush, { xPercent: -50, yPercent: -50, opacity: 0 })

    const qtBrushX = gsap.quickTo(brush, 'x', { duration: 0.12, ease: 'power3.out' })
    const qtBrushY = gsap.quickTo(brush, 'y', { duration: 0.12, ease: 'power3.out' })

    let visible = false

    const onMove = (e) => {
      const { clientX: x, clientY: y } = e
      gsap.set(dot, { x, y })
      qtBrushX(x); qtBrushY(y)

      if (!visible) {
        visible = true
        gsap.to(dot, { opacity: 1, duration: 0.3 })
      }
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // ── Hover state machine ───────────────────────────────────────────────────
  useEffect(() => {
    const dot   = dotRef.current
    const brush = brushRef.current
    if (!dot || !brush) return

    const resetDefault = () => {
      gsap.to(dot,   { scale: 1, opacity: 1, duration: 0.2, ease: 'power2.out' })
      gsap.to(brush, { opacity: 0, duration: 0.15 })
    }

    const onOver = (e) => {
      const target     = e.target
      const cursorAttr = target.closest('[data-cursor]')?.getAttribute('data-cursor')
      const isClickable =
        cursorAttr === 'pointer' ||
        target.closest('button, a, [role="button"], input, label, select, textarea') !== null

      if (cursorAttr === 'canvas') {
        gsap.to(dot,   { opacity: 0, duration: 0.15 })
        gsap.to(brush, { opacity: 1, duration: 0.2  })
      } else if (isClickable) {
        gsap.to(brush, { opacity: 0, duration: 0.15 })
        gsap.to(dot,   { scale: 1.4, duration: 0.2, ease: 'power2.out' })
      } else {
        resetDefault()
      }
    }

    window.addEventListener('mouseover', onOver)
    window.addEventListener('mouseout',  resetDefault)
    return () => {
      window.removeEventListener('mouseover', onOver)
      window.removeEventListener('mouseout',  resetDefault)
    }
  }, [])

  // ── Click ripple — two leaf-shaped rings fan out like a pebble in water ──
  useEffect(() => {
    const onClick = (e) => {
      const { clientX: x, clientY: y } = e

      ;[
        { scale: 1.5, duration: 0.4,  delay: 0,    opacity: 1   },
        { scale: 1.8, duration: 0.55, delay: 0.08, opacity: 0.7 },
      ].forEach(({ scale: toScale, duration, delay, opacity }) => {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        el.setAttribute('width',    '28')
        el.setAttribute('height',   '40')
        el.setAttribute('viewBox',  '-14 -20 28 40')
        el.style.cssText = `
          position: fixed; top: 0; left: 0;
          pointer-events: none; z-index: 99998;
          will-change: transform; overflow: visible;
          transform: translate(calc(${x}px - 50%), calc(${y}px - 50%)) rotate(15deg);
        `
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        path.setAttribute('d', OUTER_PATH)
        path.setAttribute('fill', 'none')
        path.setAttribute('stroke', '#c8a040')
        path.setAttribute('stroke-width', '1')
        el.appendChild(path)
        document.body.appendChild(el)

        gsap.fromTo(
          el,
          { scale: 1, opacity },
          {
            scale: toScale, opacity: 0,
            duration, delay,
            ease: 'power2.out',
            onComplete: () => el.remove(),
          }
        )
      })
    }

    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [])

  return (
    <>
      {/* Leaf — snaps to cursor instantly */}
      <svg
        ref={dotRef}
        width="14"
        height="20"
        viewBox="-7 -10 14 20"
        style={{
          position:     'fixed',
          top:          0,
          left:         0,
          pointerEvents:'none',
          zIndex:       10000,
          willChange:   'transform',
          mixBlendMode: 'difference',
          overflow:     'visible',
        }}
      >
        <path d={INNER_PATH} fill="#c8a040" />
      </svg>

      {/* Brush preview — circular, visible only over the drawing canvas */}
      <div
        ref={brushRef}
        style={{
          position:        'fixed',
          top:             0,
          left:            0,
          width:           'var(--brush-size, 20px)',
          height:          'var(--brush-size, 20px)',
          borderRadius:    '50%',
          border:          '1px dashed rgba(200,160,40,0.5)',
          backgroundColor: 'transparent',
          pointerEvents:   'none',
          zIndex:          10001,
          willChange:      'transform',
          opacity:         0,
        }}
      />
    </>
  )
}
