/**
 * LandingPage.jsx — Arverié
 *
 * Hero: logo-animation.mp4 with 3D rise + breathing idle via GSAP
 * Then: DeskSection scroll experience
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { gsap } from 'gsap'
import logoSvgRaw from '../assets/logo.svg?raw'
import logoAnimation from '../assets/logo-animation.mp4'
import DeskSection from './DeskSection'

// ─── Stable deterministic particles ─────────────────────────────────────────
const ALL_PARTICLES = Array.from({ length: 23 }, (_, i) => ({
  id: i,
  size: 3 + ((i * 11) % 3),
  left: `${4 + (i * 29 + 13) % 88}%`,
  bottom: `${3 + (i * 17) % 38}%`,
}))

const TITLE_CHARS = ['A','R','V','E','R','I','É']

const NAV_EKG_D  = 'M0,8 L5,8 L8,2 L11,14 L14,5 L17,11 L20,8 L44,8'
const NAV_FLAT_D = 'M0,8 L44,8'

const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ─── Footer ──────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="w-full bg-[#1A383B] text-[#D9C396] font-serif py-32 flex flex-col items-center justify-center relative z-10 border-t border-[#D9C396]/10">
      <h2 className="text-4xl italic mb-16 tracking-widest text-[#FAF6E6]">
        Welcome to Arverié
      </h2>
      <div className="flex flex-col md:flex-row gap-16 px-12 max-w-6xl w-full text-center">
        <div className="flex-1 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-[#1A383B] border border-[#D9C396]/20 flex items-center justify-center mb-6 shadow-xl">
            <svg
              className="w-6 h-6 text-[#D9C396]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </div>
          <h3 className="text-2xl mb-4 text-[#E3CFA7] font-light">
            Expressive Canvas
          </h3>
          <p className="font-sans text-sm tracking-wide opacity-75 leading-relaxed font-light">
            Pour your feelings onto an open canvas. A distraction-free space
            where your strokes reflect your inner state.
          </p>
        </div>

        <div className="flex-1 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-[#1A383B] border border-[#D9C396]/20 flex items-center justify-center mb-6 shadow-xl">
            <svg
              className="w-6 h-6 text-[#D9C396]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 className="text-2xl mb-4 text-[#E3CFA7] font-light">
            Empathic AI
          </h3>
          <p className="font-sans text-sm tracking-wide opacity-75 leading-relaxed font-light">
            Receive warm, gentle reflections on your art. Our AI guide helps you
            unpack your thoughts securely.
          </p>
        </div>

        <div className="flex-1 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-[#1A383B] border border-[#D9C396]/20 flex items-center justify-center mb-6 shadow-xl">
            <svg
              className="w-6 h-6 text-[#D9C396]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h3 className="text-2xl mb-4 text-[#E3CFA7] font-light">
            Mood Journal
          </h3>
          <p className="font-sans text-sm tracking-wide opacity-75 leading-relaxed font-light">
            Collect your daily reflections. Turn your emotional history into a
            timeless, beautifully bound archive.
          </p>
        </div>
      </div>
    </footer>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [soundOn, setSoundOn] = useState(true)
  const navigate = useNavigate()

  // Layout refs
  const sceneRef         = useRef(null)
  const logoContainerRef = useRef(null)
  const svgContainerRef  = useRef(null)   // div with dangerouslySetInnerHTML
  const glowRef          = useRef(null)
  const shimmerRef       = useRef(null) // unused, kept for potential future use
  const pulseRef         = useRef(null)

  // UI refs
  const titleRef      = useRef(null)
  const lineLeftRef   = useRef(null)
  const lineRightRef  = useRef(null)
  const subtitleRef   = useRef(null)
  const btnRef        = useRef(null)
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


  // ─── Main GSAP timeline ─────────────────────────────────────────────────
  useEffect(() => {
    const letters = titleRef.current ? [...titleRef.current.children] : []

    if (prefersReduced) {
      gsap.set([navRef.current, svgContainerRef.current, titleRef.current,
        subtitleRef.current, scrollHintRef.current], { opacity: 1 })
      gsap.set(letters, { opacity: 1, y: 0, rotateY: 0 })
      gsap.set([lineLeftRef.current, lineRightRef.current], { width: 80 })
      return
    }

    // Initial states
    gsap.set(svgContainerRef.current, {
      scale: 0.7, rotateX: 20, filter: 'blur(16px)',
      transformOrigin: 'center center', opacity: 0,
    })
    gsap.set(logoContainerRef.current, { transformPerspective: 900 })
    gsap.set(navRef.current, { opacity: 0 })
    gsap.set(glowRef.current, { opacity: 0, scale: 0.6 })
    gsap.set(pulseRef.current, { scale: 0, opacity: 0 })
    gsap.set(letters, { opacity: 0, y: 20, rotateY: 90 })
    gsap.set(titleRef.current, { perspective: 600 })
    gsap.set(lineLeftRef.current, { width: 0 })
    gsap.set(lineRightRef.current, { width: 0 })
    gsap.set(subtitleRef.current, { opacity: 0, y: 10 })
    gsap.set(btnRef.current, { opacity: 0, y: 10 })
    gsap.set(scrollHintRef.current, { opacity: 0 })

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.1 })

      // ─ 0.3s  Gold radial pulse ──────────────────────────────────────────
      tl.set(pulseRef.current, { opacity: 0.45 }, 0.3)
      tl.to(pulseRef.current, { scale: 3.2, opacity: 0, duration: 1.0, ease: 'power2.out' }, 0.3)

      // ─ 0.4s  Video fade + 3D rise ───────────────────────────────────────
      tl.to(svgContainerRef.current, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0.4)
      tl.to(svgContainerRef.current, {
        scale: 1, rotateX: 0, filter: 'blur(0px)',
        duration: 1.0, ease: 'power3.out',
      }, 0.6)

      // ─ 1.2s  Glow materializes ──────────────────────────────────────────
      tl.to(glowRef.current, { opacity: 0.18, scale: 1, duration: 0.8, ease: 'power2.out' }, 1.2)

      // ─ 1.6s  Breathing idle ─────────────────────────────────────────────
      tl.call(() => {
        gsap.to(svgContainerRef.current, {
          scale: 1.02, duration: 4, ease: 'sine.inOut', yoyo: true, repeat: -1,
        })
        gsap.to(glowRef.current, {
          opacity: 0.32, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1,
        })
      }, null, 1.6)

      // ─ 1.8s  "ARVERIÉ" letters 3D flip stagger ──────────────────────────
      tl.to(letters, {
        opacity: 1, y: 0, rotateY: 0,
        duration: 0.45, stagger: 0.055, ease: 'back.out(1.7)',
      }, 1.8)

      // ─ 2.3s  Ornamental lines ────────────────────────────────────────────
      tl.to(lineLeftRef.current,  { width: 76, duration: 0.35, ease: 'power2.inOut' }, 2.3)
      tl.to(lineRightRef.current, { width: 76, duration: 0.35, ease: 'power2.inOut' }, 2.3)

      // ─ 2.6s  Subtitle ────────────────────────────────────────────────────
      tl.to(subtitleRef.current, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 2.6)

      // ─ 2.8s  Navbar ──────────────────────────────────────────────────────
      tl.to(navRef.current, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 2.8)

      // ─ 2.9s  Begin Session button ────────────────────────────────────────
      tl.to(btnRef.current, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 2.9)

      // ─ 3.5s  Scroll hint ─────────────────────────────────────────────────
      tl.to(scrollHintRef.current, { opacity: 1, duration: 0.45 }, 3.5)
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
    <>
    <style>{`
      .nav-logo { height: 36px; width: auto; max-width: 120px; line-height: 0; flex-shrink: 0; overflow: hidden; }
      .nav-logo svg { height: 100%; width: auto; max-width: 100%; display: block; }
      .nav-logo svg path[fill="#000000"] { display: none; }
    `}</style>
    <div>
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
        position: 'relative',
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
        <div
          className="nav-logo"
          dangerouslySetInnerHTML={{ __html: logoSvgRaw }}
        />

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
            width: isMobile ? '85vw' : 'clamp(280px, 50vw, 600px)',
            maxWidth: isMobile ? '320px' : '520px',
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

          {/* Animated logo video */}
          <video
            ref={svgContainerRef}
            src={logoAnimation}
            autoPlay
            muted
            playsInline
            style={{
              position: 'relative', zIndex: 1,
              width: '100%', display: 'block',
              mixBlendMode: 'multiply',
              transformOrigin: 'center center',
              willChange: 'transform, opacity, filter',
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
            textTransform: 'uppercase', marginBottom: '28px',
            opacity: 0,
          }}
        >
          A space where feeling becomes form
        </p>

        {/* Begin Session button */}
        <motion.button
          ref={btnRef}
          onClick={() => navigate('/session')}
          whileHover={{
            backgroundColor: 'rgba(150,186,141,0.12)',
            borderColor: 'rgba(59, 82, 53,0.8)',
            color: '#1a3a30',
            y: -2,
          }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            fontFamily: 'Cinzel, serif', fontSize: '11px',
            letterSpacing: '0.22em', color: 'var(--gold)',
            background: 'transparent',
            border: '1.5px solid var(--gold)',
            borderRadius: '999px',
            padding: '12px 36px',
            cursor: 'pointer',
            marginBottom: '36px',
            opacity: 0,
            transition: 'background-color 0.22s ease, border-color 0.22s ease, color 0.22s ease',
          }}
        >
          <span style={{ fontSize: '8px', opacity: 0.7, color: 'var(--gold)' }}>◆</span>
          Begin Your Session
          <span style={{ fontSize: '8px', opacity: 0.7, color: 'var(--gold)' }}>◆</span>
        </motion.button>

        {/* Scroll hint — Genshin-styled rounded scroll indicator */}
        <div
          ref={scrollHintRef}
          style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '10px', opacity: 0,
          }}
        >
          <span style={{
            fontFamily: 'Cinzel, serif', fontSize: '8px',
            letterSpacing: '0.28em', color: 'var(--text-muted)',
            textTransform: 'uppercase',
          }}>
            scroll to enter
          </span>
          <motion.div
            whileHover={{ borderColor: 'rgba(200,160,40,0.75)' }}
            style={{
              position: 'relative',
              width: '38px', height: '56px',
              borderRadius: '999px',
              border: '1.5px solid rgba(200,160,40,0.45)',
              background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
              cursor: 'default',
              transition: 'border-color 0.22s ease',
            }}
          >
            {/* Inner glow */}
            <div style={{
              position: 'absolute', inset: 0,
              borderRadius: '999px',
              background: 'radial-gradient(ellipse at center bottom, rgba(200,160,40,0.18) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div className="bounce">
              <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
                <path d="M1 1L9 9L17 1" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
    <Footer />
    <DeskSection />
    </div>
    </>
  )
}
