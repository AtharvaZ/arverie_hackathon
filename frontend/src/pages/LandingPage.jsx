/**
 * LandingPage.jsx — Arverié
 *
 * SVG logo (350 paths, Illustrator trace) animated via GSAP:
 *  • Face/text paths (dark teal)  → draw in LEFT → RIGHT sorted by x
 *  • Leaf paths (green/lavender/gold) → draw in RIGHT → LEFT sorted by x
 *  • They converge in the visual center (~x 500 in the 1025-wide viewBox)
 *  • Then 3D rise, fill bloom, shimmer, particles, letter stagger
 */

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import logoSvgRaw from '../assets/logo.svg?raw'

// ─── Color buckets (empirically from SVG fill audit) ────────────────────────

// Dark teal — face contour + letter outlines
const FACE_FILLS = new Set([
  '#112829','#143B3F','#1A383B','#1F373A','#273D40',
  '#173C41','#173B3F','#1F3639',
])

// Sage greens — sage leaf
const LEAF_GREEN_FILLS = new Set([
  '#6A8E8D','#769492','#7C948E','#7F9996','#76908B',
  '#81A09E','#839D8C','#8EACA9','#8B9E90','#9CB6B1',
  '#96AA98','#9EAD9B','#A8C0BB','#A3B5A3','#A3B1A1',
  '#B1BFAE','#B2C8C3','#B6C1B4','#497776','#6C897C',
  '#C4C8BC',
])

// Lavenders — lavender leaf
const LEAF_LAVENDER_FILLS = new Set([
  '#867D9A','#8A809F','#8F82A1','#9B8EAB','#A091A5',
  '#A294B0','#AB9CB5','#B6A5BB','#C6B8C6','#CEBFCC',
  '#9DA0AB','#A8B0B5','#B2BBBA',
])

// Warm golds — gold crescent
const LEAF_GOLD_FILLS = new Set([
  '#D9C396','#D4B887','#C6AB7F','#D6BE8D','#E3CFA7',
  '#BA9A6A','#AE8F60','#FAF6E6',
])

// All leaf fills combined
const ALL_LEAF_FILLS = new Set([
  ...LEAF_GREEN_FILLS, ...LEAF_LAVENDER_FILLS, ...LEAF_GOLD_FILLS,
])

// Parses the x value of the first Move command in a path's d attribute
function getPathX(el) {
  const d = el.getAttribute('d') || ''
  const m = d.match(/M[\s\n]*([\d.]+)/)
  return m ? parseFloat(m[1]) : 512
}

// ─── Stable deterministic particles ─────────────────────────────────────────
const ALL_PARTICLES = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  size: 2 + ((i * 11) % 3),
  left: `${4 + (i * 29 + 13) % 88}%`,
  bottom: `${3 + (i * 17) % 38}%`,
}))

const TITLE_CHARS = ['A','R','V','E','R','I','É']

const NAV_EKG_D  = 'M0,8 L5,8 L8,2 L11,14 L14,5 L17,11 L20,8 L44,8'
const NAV_FLAT_D = 'M0,8 L44,8'

const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [soundOn, setSoundOn] = useState(true)

  // Layout refs
  const sceneRef         = useRef(null)
  const logoContainerRef = useRef(null)
  const svgContainerRef  = useRef(null)   // div with dangerouslySetInnerHTML
  const glowRef          = useRef(null)
  const shimmerRef       = useRef(null)
  const pulseRef         = useRef(null)

  // UI refs
  const titleRef      = useRef(null)
  const lineLeftRef   = useRef(null)
  const lineRightRef  = useRef(null)
  const subtitleRef   = useRef(null)
  const scrollHintRef = useRef(null)
  const navRef        = useRef(null)
  const navEkgRef     = useRef(null)
  const navFlatRef    = useRef(null)
  const particleRefs  = useRef([])

  // Parallax quickTo
  const qtRotX = useRef(null)
  const qtRotY = useRef(null)

  // ─── Mobile particle count ───────────────────────────────────────────────
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  const particles = isMobile ? ALL_PARTICLES.slice(0, 6) : ALL_PARTICLES


  // ─── Main GSAP timeline + SVG path animation ────────────────────────────
  useEffect(() => {
    const letters = titleRef.current ? [...titleRef.current.children] : []

    if (prefersReduced) {
      gsap.set([navRef.current, svgContainerRef.current, titleRef.current,
        subtitleRef.current, scrollHintRef.current], { opacity: 1 })
      gsap.set(letters, { opacity: 1, y: 0, rotateY: 0 })
      gsap.set([lineLeftRef.current, lineRightRef.current], { width: 80 })
      return
    }

    // ── Grab SVG element (injected via dangerouslySetInnerHTML)
    const svg = svgContainerRef.current?.querySelector('svg')
    if (!svg) return

    // Style the SVG
    svg.style.width = '100%'
    svg.style.height = 'auto'
    svg.style.overflow = 'visible'

    const allPaths = [...svg.querySelectorAll('path')]

    // ── Remove black background rect (first path, covers full canvas)
    allPaths.forEach(p => {
      if (p.getAttribute('fill') === '#000000') {
        const d = p.getAttribute('d') || ''
        const m = d.match(/M[\s\n]*([\d.]+)/)
        // Background rect starts at x > 600 (bottom-right corner of canvas)
        if (m && parseFloat(m[1]) > 600) {
          p.setAttribute('fill', 'transparent')
        }
      }
    })

    // ── Categorize paths
    const facePaths   = allPaths.filter(p => FACE_FILLS.has(p.getAttribute('fill')))
    const leafPaths   = allPaths.filter(p => ALL_LEAF_FILLS.has(p.getAttribute('fill')))
    const restPaths   = allPaths.filter(p =>
      !FACE_FILLS.has(p.getAttribute('fill')) &&
      !ALL_LEAF_FILLS.has(p.getAttribute('fill')) &&
      p.getAttribute('fill') !== '#000000'
    )

    // ── Sort by x-position for directional sweep
    const sortedFace  = [...facePaths].sort((a, b) => getPathX(a) - getPathX(b))   // L→R
    const sortedLeaves = [...leafPaths].sort((a, b) => getPathX(b) - getPathX(a))  // R→L

    // ── Set up initial states for path groups
    // Face: show only as stroke (fill transparent until bloom)
   facePaths.forEach(p => {
  const origFill = p.getAttribute('fill')
  p.dataset.fill = origFill
  p.style.fill = 'none'        // ← style
  p.style.stroke = origFill    // ← style
  p.style.strokeWidth = '1.5'  // ← style
})

leafPaths.forEach(p => {
  const origFill = p.getAttribute('fill')
  p.dataset.fill = origFill
  p.style.fill = 'none'        // ← style
  p.style.stroke = origFill    // ← style
  p.style.strokeWidth = '1.5'  // ← style
})

    // All paths start invisible
    gsap.set(allPaths, { opacity: 0 })
    // Logo container: scale + 3D tilt + blur
    gsap.set(svgContainerRef.current, {
      scale: 0.7, rotateX: 20, filter: 'blur(16px)',
      transformOrigin: 'center center',
    })
    gsap.set(logoContainerRef.current, { transformPerspective: 900 })
    // Other UI
    gsap.set(navRef.current, { opacity: 0 })
    gsap.set(glowRef.current, { opacity: 0, scale: 0.6 })
    gsap.set(shimmerRef.current, { x: '-150%', opacity: 0 })
    gsap.set(pulseRef.current, { scale: 0, opacity: 0 })
    gsap.set(letters, { opacity: 0, y: 20, rotateY: 90 })
    gsap.set(titleRef.current, { perspective: 600 })
    gsap.set(lineLeftRef.current, { width: 0 })
    gsap.set(lineRightRef.current, { width: 0 })
    gsap.set(subtitleRef.current, { opacity: 0, y: 10 })
    gsap.set(scrollHintRef.current, { opacity: 0 })

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.1 })

      // ─ 0.3s  Gold radial pulse ──────────────────────────────────────────
      tl.set(pulseRef.current, { opacity: 0.45 }, 0.3)
      tl.to(pulseRef.current, { scale: 3.2, opacity: 0, duration: 1.0, ease: 'power2.out' }, 0.3)

      // ─ 0.5s  FACE paths draw in LEFT → RIGHT ────────────────────────────
      //         paths appear as colored strokes, converging toward center
      tl.to(sortedFace, {
        opacity: 1,
        duration: 0.03,
        stagger: { each: 0.009, ease: 'none' },
        ease: 'none',
      }, 0.5)

      // ─ 0.8s  LEAF paths draw in RIGHT → LEFT ────────────────────────────
      tl.to(sortedLeaves, {
        opacity: 1,
        duration: 0.03,
        stagger: { each: 0.011, ease: 'none' },
        ease: 'none',
      }, 0.8)

      // ─ 1.6s  SVG 3D RISE — scale 0.7→1, rotateX 20→0, blur→0 ───────────
      tl.to(svgContainerRef.current, {
        scale: 1, rotateX: 0, filter: 'blur(0px)',
        duration: 0.85, ease: 'power3.out',
      }, 1.6)

      // ─ 1.8s  FILL BLOOM — fills materialize, strokes dissolve ───────────
    tl.call(() => {
  sortedFace.forEach((el, i) => {
    setTimeout(() => {
      el.style.fill = el.dataset.fill || '#143B3F'  // ← style not setAttribute
      el.style.stroke = 'none'
      el.style.strokeWidth = '0'
      el.style.opacity = '1'
    }, i * 5)
  })

  sortedLeaves.forEach((el, i) => {
    setTimeout(() => {
      el.style.fill = el.dataset.fill || '#8B9E90'  // ← style not setAttribute
      el.style.stroke = 'none'
      el.style.strokeWidth = '0'
      el.style.opacity = '1'
    }, i * 6)
  })

  gsap.to(restPaths, {
    opacity: 1, duration: 0.12,
    stagger: { each: 0.004, from: 'random' },
    ease: 'power1.out',
  })

  gsap.to(glowRef.current, {
    opacity: 0.18, scale: 1, duration: 0.8, ease: 'power2.out'
  })
}, null, 1.8)
     

      // ─ 2.2s  Breathing idle + glow pulse ────────────────────────────────
      tl.call(() => {
        gsap.to(svgContainerRef.current, {
          scale: 1.02, duration: 4, ease: 'sine.inOut', yoyo: true, repeat: -1,
        })
        gsap.to(glowRef.current, {
          opacity: 0.32, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1,
        })
      }, null, 2.2)

      // ─ 2.6s  "ARVERIÉ" letters 3D flip stagger ──────────────────────────
      tl.to(letters, {
        opacity: 1, y: 0, rotateY: 0,
        duration: 0.45, stagger: 0.055, ease: 'back.out(1.7)',
      }, 2.6)

      // ─ 3.1s  Ornamental line draws from center ───────────────────────────
      tl.to(lineLeftRef.current,  { width: 76, duration: 0.35, ease: 'power2.inOut' }, 3.1)
      tl.to(lineRightRef.current, { width: 76, duration: 0.35, ease: 'power2.inOut' }, 3.1)

      // ─ 3.4s  Subtitle ────────────────────────────────────────────────────
      tl.to(subtitleRef.current, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 3.4)

      // ─ 3.5s  Navbar ──────────────────────────────────────────────────────
      tl.to(navRef.current, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 3.5)

      // ─ 4.0s  Scroll hint ─────────────────────────────────────────────────
      tl.to(scrollHintRef.current, { opacity: 1, duration: 0.45 }, 4.0)
    }, sceneRef)

    return () => ctx.revert()
  }, [])

  // ─── Particle drift ──────────────────────────────────────────────────────
  useEffect(() => {
    if (prefersReduced) return
    const ctx = gsap.context(() => {
      particleRefs.current.forEach((p, i) => {
        if (!p) return
        gsap.fromTo(p,
          { y: 0, x: 0, opacity: 0 },
          {
            y: -(160 + (i * 43) % 220),
            x: ((i % 2 === 0 ? 1 : -1) * ((i * 23) % 55)),
            opacity: 0.14 + (i * 0.08) % 0.3,
            duration: 8 + (i * 1.5) % 8,
            delay: 1 + (i * 0.4) % 3.8,
            ease: 'none', repeat: -1,
            onRepeat() { gsap.set(p, { y: 0, x: 0, opacity: 0 }) },
          },
        )
      })
    }, sceneRef)
    return () => ctx.revert()
  }, [])

  // ─── Mouse 3D parallax ───────────────────────────────────────────────────
  useEffect(() => {
    if (isMobile || prefersReduced) return
    const timer = setTimeout(() => {
      if (!logoContainerRef.current) return
      qtRotX.current = gsap.quickTo(logoContainerRef.current, 'rotateX', { duration: 0.55, ease: 'power3' })
      qtRotY.current = gsap.quickTo(logoContainerRef.current, 'rotateY', { duration: 0.55, ease: 'power3' })
    }, 200)
    function onMouseMove(e) {
      if (!qtRotX.current) return
      qtRotX.current(((e.clientY / window.innerHeight) - 0.5) * -16)
      qtRotY.current(((e.clientX / window.innerWidth)  - 0.5) *  24)
    }
    window.addEventListener('mousemove', onMouseMove)
    return () => { clearTimeout(timer); window.removeEventListener('mousemove', onMouseMove) }
  }, [isMobile])

  // ─── Logo hover ──────────────────────────────────────────────────────────
  function handleLogoEnter() {
    if (prefersReduced) return
    gsap.to(glowRef.current, { opacity: 0.52, duration: 0.28 })
    gsap.to(svgContainerRef.current, { scale: 1.06, duration: 0.4, ease: 'back.out(1.4)' })
   
  }
  function handleLogoLeave() {
    if (prefersReduced) return
    gsap.to(glowRef.current, { opacity: 0.18, duration: 0.5 })
    gsap.to(svgContainerRef.current, { scale: 1.0, duration: 0.5, ease: 'power2.out' })
  }

  // ─── EKG toggle ──────────────────────────────────────────────────────────
  function toggleSound() {
    setSoundOn(prev => {
      const next = !prev
      gsap.to(navEkgRef.current,  { opacity: next ? 1 : 0, duration: 0.35 })
      gsap.to(navFlatRef.current, { opacity: next ? 0 : 1, duration: 0.35 })
      return next
    })
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div
      ref={sceneRef}
      style={{
        width: '100vw', height: '100vh',
        background: 'var(--bg)',
        // Subtle paper-grain via SVG noise filter CSS
        backgroundImage: `
          url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")
        `,
        backgroundRepeat: 'repeat',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
        perspective: '1000px',
      }}
    >
      {/* ── Ambient dust particles ── */}
      {particles.map((p, i) => (
        <div
          key={p.id}
          ref={el => { particleRefs.current[i] = el }}
          style={{
            position: 'absolute', left: p.left, bottom: p.bottom,
            width: `${p.size}px`, height: `${p.size}px`,
            borderRadius: '50%', background: 'var(--gold)',
            opacity: 0, pointerEvents: 'none',
            willChange: 'transform, opacity', zIndex: 1,
          }}
        />
      ))}

      {/* ── Navbar ── */}
      <nav
        ref={navRef}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: '52px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px',
          background: 'rgba(242,232,213,0.84)',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--border)',
          zIndex: 50,
        }}
      >
        <span style={{
          fontFamily: 'Cinzel, serif', fontSize: '16px',
          color: '#1a3a30', letterSpacing: '0.1em',
        }}>
          Arverié
        </span>

        <button
          onClick={toggleSound}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
          aria-label={soundOn ? 'Mute ambient' : 'Enable ambient'}
        >
          <svg width="48" height="20" viewBox="0 0 48 16" fill="none" style={{ overflow: 'visible' }}>
            <path ref={navEkgRef}  d={NAV_EKG_D}  stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path ref={navFlatRef} d={NAV_FLAT_D} stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0 }} />
          </svg>
          <span style={{
            fontFamily: 'Cinzel, serif', fontSize: '8px',
            letterSpacing: '0.18em', color: 'var(--gold)', textTransform: 'uppercase',
          }}>
            {soundOn ? 'AMBIENT' : 'SILENT'}
          </span>
        </button>
      </nav>

      {/* ── Hero content ── */}
      <div
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          position: 'relative', zIndex: 2, userSelect: 'none',
        }}
      >
        {/* Awakening pulse */}
        <div
          ref={pulseRef}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '180px', height: '180px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(200,160,40,0.48) 0%, transparent 70%)',
            filter: 'blur(12px)', pointerEvents: 'none', zIndex: 0,
          }}
        />

        {/* ── Logo: 3D parallax container ── */}
        <div
          ref={logoContainerRef}
          style={{
            position: 'relative',
            width: isMobile ? '85vw' : 'clamp(280px, 40vw, 420px)',
            maxWidth: isMobile ? '320px' : '420px',
            transformStyle: 'preserve-3d',
            cursor: 'default',
          }}
          onMouseEnter={handleLogoEnter}
          onMouseLeave={handleLogoLeave}
        >
          {/* Warm gold glow behind logo */}
          <div
            ref={glowRef}
            style={{
              position: 'absolute', inset: '-28%',
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(200,160,40,0.55) 0%, rgba(200,160,40,0.15) 45%, transparent 72%)',
              filter: 'blur(30px)', opacity: 0,
              pointerEvents: 'none', zIndex: 0,
              willChange: 'opacity, transform',
            }}
          />

          {/* SVG logo — inline via dangerouslySetInnerHTML */}
          <div
            ref={svgContainerRef}
            dangerouslySetInnerHTML={{ __html: logoSvgRaw }}
            style={{
              position: 'relative', zIndex: 1,
              transformOrigin: 'center center',
              willChange: 'transform, opacity, filter',
              lineHeight: 0,
            }}
          />

          {/* Shimmer sweep overlay */}
          <div
            ref={shimmerRef}
            style={{
              position: 'absolute', top: '-8%', bottom: '-8%', left: 0,
              width: '50%', zIndex: 2, opacity: 0, pointerEvents: 'none',
              background: 'linear-gradient(110deg, transparent 15%, rgba(255,255,255,0.38) 50%, transparent 85%)',
              willChange: 'transform',
            }}
          />
        </div>

        {/* ── "ARVERIÉ" — individual letters for 3D stagger ── */}
        <div
          ref={titleRef}
          style={{
            display: 'flex', alignItems: 'baseline',
            gap: '0.04em', marginTop: '10px',
            perspective: '600px', transformStyle: 'preserve-3d',
          }}
        >
          {TITLE_CHARS.map((ch, i) => (
            <span
              key={i}
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: isMobile ? '34px' : 'clamp(34px, 4.8vw, 52px)',
                fontWeight: 400, color: '#1a3a30',
                letterSpacing: '0.22em', display: 'inline-block',
                willChange: 'transform, opacity',
              }}
            >
              {ch}
            </span>
          ))}
        </div>

        {/* Ornamental line divider with center diamond */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '9px 0 7px' }}>
          <div
            ref={lineLeftRef}
            style={{
              height: '1px',
              background: 'linear-gradient(to left, var(--gold), transparent)',
              width: 0, flexShrink: 0,
            }}
          />
          <div style={{
            width: '6px', height: '6px',
            background: 'var(--gold)', transform: 'rotate(45deg)',
            opacity: 0.75, flexShrink: 0,
            boxShadow: '0 0 6px rgba(200,160,40,0.6)',
          }} />
          <div
            ref={lineRightRef}
            style={{
              height: '1px',
              background: 'linear-gradient(to right, var(--gold), transparent)',
              width: 0, flexShrink: 0,
            }}
          />
        </div>

        {/* Subtitle */}
        <p
          ref={subtitleRef}
          style={{
            fontFamily: 'Cinzel, serif', fontSize: '11px',
            letterSpacing: '0.4em', color: 'var(--gold)',
            textTransform: 'uppercase', marginBottom: '32px',
            opacity: 0,
          }}
        >
          AI ART THERAPY
        </p>

        {/* Scroll hint */}
        <div
          ref={scrollHintRef}
          style={{
            marginTop: '40px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '8px', opacity: 0,
          }}
        >
          <span style={{
            fontFamily: 'Cinzel, serif', fontSize: '8px',
            letterSpacing: '0.28em', color: 'var(--text-muted)',
            textTransform: 'uppercase',
          }}>
            scroll to enter
          </span>
          <div className="bounce">
            <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
              <path d="M1 1L7 7L13 1" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
