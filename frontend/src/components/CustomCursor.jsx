import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export default function CustomCursor() {
  const isMobile =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || window.innerWidth < 640)
  if (isMobile) return null

  const dotRef = useRef(null)
  const ringRef = useRef(null)

  useEffect(() => {
    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    // Center elements via xPercent/yPercent so GSAP x/y aren't offset
    gsap.set([dot, ring], { xPercent: -50, yPercent: -50, opacity: 0 })

    const qtRingX = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3.out' })
    const qtRingY = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3.out' })

    let visible = false

    const onMove = (e) => {
      const x = e.clientX
      const y = e.clientY
      gsap.set(dot, { x, y })
      qtRingX(x)
      qtRingY(y)
      // Fade in on first move so there's no (0,0) flash on load
      if (!visible) {
        visible = true
        gsap.to([dot, ring], { opacity: 1, duration: 0.3 })
      }
    }

    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  useEffect(() => {
    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    const onOver = (e) => {
      const target = e.target
      const cursorAttr = target.closest('[data-cursor]')?.getAttribute('data-cursor')
      const isClickable =
        cursorAttr === 'pointer' ||
        target.closest('button, a, [role="button"], input, label, select, textarea') !== null

      if (cursorAttr === 'canvas') {
        gsap.to(dot, { scale: 0, duration: 0.2 })
        gsap.to(ring, { scale: 0, duration: 0.2 })
      } else if (isClickable) {
        gsap.to(dot, { scale: 0, duration: 0.2 })
        gsap.to(ring, {
          scale: 1.6,
          backgroundColor: 'rgba(200, 168, 90, 0.12)',
          borderColor: 'rgba(200, 168, 90, 1)',
          duration: 0.25,
          ease: 'power2.out',
        })
      } else {
        gsap.to(dot, { scale: 1, duration: 0.2 })
        gsap.to(ring, {
          scale: 1,
          backgroundColor: 'rgba(200, 168, 90, 0)',
          borderColor: 'rgba(200, 168, 90, 0.5)',
          duration: 0.25,
        })
      }
    }

    window.addEventListener('mouseover', onOver)
    return () => window.removeEventListener('mouseover', onOver)
  }, [])

  useEffect(() => {
    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    const onDown = () => {
      gsap.to(dot, { scaleX: 1.4, scaleY: 0.6, duration: 0.1 })
      gsap.to(ring, { scale: 1.4, duration: 0.1 })
    }

    const onUp = () => {
      gsap.to(dot, { scaleX: 1, scaleY: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' })
      gsap.to(ring, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' })
    }

    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  return (
    <>
      <style>{`
        *, *::before, *::after { cursor: none !important; }
      `}</style>
      {/* Outer trailing ring */}
      <div
        ref={ringRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '1.5px solid rgba(200, 168, 90, 0.5)',
          backgroundColor: 'rgba(200, 168, 90, 0)',
          pointerEvents: 'none',
          zIndex: 99999,
          willChange: 'transform',
        }}
      />
      {/* Inner gold dot */}
      <div
        ref={dotRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: 'rgba(200, 168, 90, 1)',
          pointerEvents: 'none',
          zIndex: 100000,
          willChange: 'transform',
        }}
      />
    </>
  )
}
