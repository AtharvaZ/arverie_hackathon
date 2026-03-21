/**
 * DashboardPage — Arverié
 *
 * Part 1: Scroll-based radial CSS mask reveals room from warm parchment
 * Part 2: Room view — gold pulsing dot over journal area
 * Part 3: Dot click → room zooms in (scale 1→1.8), desk UI appears
 * Part 4: Interactive hotspots over zoomed room
 * Part 5: Three parchment cards animate in staggered
 * Part 6: Curtain ambient sway (idle only)
 * Part 7: Back-to-room button reverses zoom
 *
 * Z-index scale (UI/UX Pro Max: 10 / 20 / 30 / 50):
 *   z-0  → room.png (radial CSS mask, scrollProgress-driven)
 *   z-10 → curtains (ambient, not-zoomed only)
 *   z-15 → glowing dot + label
 *   z-20 → hotspots + desk cards (zoomed only)
 *   z-30 → back button / tooltips
 *   z-50 → (TopBar in LandingPage)
 */
import { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import roomImg from '../assets/room.png'

/* ─── prefers-reduced-motion ─── */
const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ─── Injected CSS keyframes ─── */
const AMBIENT_CSS = `
  @keyframes pulse {
    0%   { transform: scale(1);   opacity: 1; }
    100% { transform: scale(1.6); opacity: 0; }
  }
  @keyframes pulseFast {
    0%   { transform: scale(1);   opacity: 0.85; }
    100% { transform: scale(1.5); opacity: 0; }
  }
  @keyframes curtainSway {
    0%   { transform: skewX(-1deg) translateX(0); }
    100% { transform: skewX(1deg)  translateX(4px); }
  }
  @keyframes plantRock {
    0%   { transform: rotate(-3deg); }
    100% { transform: rotate(3deg); }
  }
`

/* ─── Mood arc SVG — 4 dots, smooth gold bezier ─── */
function MoodArc({ width = 175, height = 72 }) {
  const pts = [
    { x: 20,  y: 55 },
    { x: 65,  y: 30 },
    { x: 110, y: 50 },
    { x: 155, y: 20 },
  ]
  const d = [
    `M${pts[0].x},${pts[0].y}`,
    `C${pts[0].x + 18},${pts[0].y} ${pts[1].x - 18},${pts[1].y} ${pts[1].x},${pts[1].y}`,
    `C${pts[1].x + 18},${pts[1].y} ${pts[2].x - 18},${pts[2].y} ${pts[2].x},${pts[2].y}`,
    `C${pts[2].x + 18},${pts[2].y} ${pts[3].x - 18},${pts[3].y} ${pts[3].x},${pts[3].y}`,
  ].join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <path d={d} stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="var(--gold)" opacity="0.82" />
      ))}
    </svg>
  )
}

/* ─── Hotspot ─── */
function HotSpot({
  id, style, hoveredId, onHover, onClick,
  label, labelItalic, glowColor, plantSway, quillHover, tooltip,
}) {
  const isHot = hoveredId === id

  return (
    <div
      role={onClick ? 'button' : 'region'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={label || id}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
      style={{
        position: 'absolute',
        zIndex: 20,
        pointerEvents: 'auto',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {/* Inner animated zone */}
      <motion.div
        animate={
          quillHover && isHot ? { y: -10, rotate: -10 }
          : isHot && glowColor ? { y: -6 }
          : { y: 0, rotate: 0 }
        }
        transition={
          quillHover
            ? { type: 'spring', damping: 10, stiffness: 180 }
            : { duration: 0.4, ease: 'easeOut' }
        }
        style={{
          width: '100%', height: '100%',
          borderRadius: '12px',
          boxShadow: isHot && glowColor ? `0 0 40px ${glowColor}` : 'none',
          filter:
            isHot && glowColor ? 'brightness(1.15)'
            : isHot ? 'brightness(1.08)'
            : 'none',
          transition: 'box-shadow 0.35s ease, filter 0.35s ease',
          ...(plantSway && isHot
            ? { animation: 'plantRock 2s ease-in-out infinite alternate' }
            : {}),
        }}
      />

      {/* Floating label */}
      <AnimatePresence>
        {isHot && label && (
          <motion.p
            key="label"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute', bottom: '-30px', left: '50%',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
              fontFamily: 'Cinzel, serif',
              fontStyle: labelItalic ? 'italic' : 'normal',
              fontSize: '9px',
              letterSpacing: '0.18em',
              color: labelItalic ? 'rgba(200,160,40,0.62)' : 'var(--gold)',
              background: 'rgba(245,237,216,0.92)',
              border: '1px solid rgba(200,160,40,0.28)',
              borderRadius: '20px',
              padding: '3px 12px',
              pointerEvents: 'none',
            }}
          >
            {label}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Parchment tooltip card */}
      <AnimatePresence>
        {isHot && tooltip && (
          <motion.div
            key="tooltip"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              position: 'absolute', bottom: '110%', left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(245,237,216,0.96)',
              border: '1px solid rgba(200,160,40,0.3)',
              borderRadius: '10px', padding: '14px',
              minWidth: '215px',
              boxShadow: '0 8px 32px rgba(60,30,8,0.2)',
              pointerEvents: 'none', zIndex: 30,
            }}
          >
            {tooltip}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Parchment desk card ─── */
function DeskCard({ children, rotate = 0, delay = 0, style }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20, rotate },
        visible: {
          opacity: 1, y: 0, rotate,
          transition: { duration: 0.55, ease: 'easeOut', delay },
        },
      }}
      style={{
        position: 'absolute',
        background: 'rgba(245,237,216,0.82)',
        border: '1px solid rgba(200,160,40,0.2)',
        borderRadius: '8px',
        padding: '12px 14px',
        boxShadow: '0 4px 24px rgba(40,20,4,0.22), 0 1px 0 rgba(200,160,40,0.1)',
        pointerEvents: 'none',
        ...style,
      }}
    >
      {/* Gold top shimmer */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(200,160,40,0.55), transparent)',
      }} />
      {children}
    </motion.div>
  )
}

function PanelLabel({ children }) {
  return (
    <p style={{
      fontFamily: 'Cinzel, serif', fontSize: '9px',
      letterSpacing: '0.18em', color: 'var(--gold)',
      textTransform: 'uppercase', marginBottom: '8px',
    }}>
      {children}
    </p>
  )
}

function GoldDivider() {
  return (
    <div style={{
      height: '1px', marginBottom: '10px',
      background: 'linear-gradient(to right, rgba(200,160,40,0.45), rgba(200,160,40,0.1), transparent)',
    }} />
  )
}

/* ════════════════════════════════════════════
   DashboardPage
════════════════════════════════════════════ */
export default function DashboardPage() {
  const navigate   = useNavigate()
  const sectionRef = useRef(null)

  // Scroll-driven mask: 70 → 150
  const [maskSize,  setMaskSize]  = useState(prefersReduced ? 150 : 70)
  // Zoom states
  const [zoomed,    setZoomed]    = useState(!!prefersReduced)
  const [showDesk,  setShowDesk]  = useState(!!prefersReduced)
  const [dotVisible, setDotVisible] = useState(!prefersReduced)
  // Interaction
  const [hoveredId,  setHoveredId]  = useState(null)
  const [exitTarget, setExitTarget] = useState(null)

  /* ── RAF-throttled scroll → mask expansion ───────────────────────────── */
  useEffect(() => {
    if (prefersReduced) return
    let rafId = null

    function onScroll() {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        const section = sectionRef.current
        if (!section) { rafId = null; return }

        const sectionTop  = section.offsetTop
        const scrollInto  = Math.max(0, window.scrollY - sectionTop)
        const scrollRange = section.offsetHeight - window.innerHeight
        const progress    = scrollRange > 0 ? Math.min(scrollInto / scrollRange, 1) : 0

        // Mask: 70% → 150% over first 30% of dashboard scroll
        setMaskSize(70 + Math.min(progress / 0.3, 1) * 80)

        rafId = null
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  /* ── Dot click → zoom in ─────────────────────────────────────────────── */
  function handleDotClick() {
    if (zoomed) return
    setDotVisible(false)
    setZoomed(true)
    // Desk UI appears after zoom animation completes (0.9s)
    setTimeout(() => setShowDesk(true), 920)
  }

  /* ── Back to room — reverses zoom ─────────────────────────────────────── */
  function handleBack() {
    setShowDesk(false)
    setZoomed(false)
    setTimeout(() => setDotVisible(true), 450)
  }

  /* ── Exit animation + navigate ───────────────────────────────────────── */
  const doNavigate = useCallback((target) => setExitTarget(target), [])

  useEffect(() => {
    if (!exitTarget) return
    const t = setTimeout(() => navigate(exitTarget), 700)
    return () => clearTimeout(t)
  }, [exitTarget, navigate])

  /* ── Derived values ──────────────────────────────────────────────────── */
  const maskValue = `radial-gradient(ellipse ${maskSize}% ${maskSize}% at center, black 40%, transparent 100%)`

  return (
    <>
      <style>{AMBIENT_CSS}</style>

      {/* Exit curtain — parchment fade */}
      <AnimatePresence>
        {exitTarget && (
          <motion.div
            key="exit-curtain"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.65, ease: 'easeInOut' }}
            style={{
              position: 'fixed', inset: 0,
              background: 'var(--bg)', zIndex: 200, pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════
          300vh scroll container — sticky 100vh viewport inside
      ══════════════════════════════════════════════════════ */}
      <div ref={sectionRef} style={{ height: '300vh', position: 'relative' }}>
        <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>

          {/* Warm parchment bed — shows through mask edges (seamless with LandingPage) */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: -1, background: 'var(--bg)',
          }} />

          {/* ── z-0: Room image — radial mask + zoom ──────────────────────── */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 0,
            maskImage: maskValue,
            WebkitMaskImage: maskValue,
            overflow: 'hidden',
          }}>
            <img
              src={roomImg}
              alt="Watercolor study room"
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover',
                objectPosition: zoomed ? 'center 40%' : 'center top',
                transform: zoomed ? 'scale(1.8)' : 'scale(1)',
                transformOrigin: 'center 44%',
                transition: prefersReduced
                  ? 'none'
                  : 'transform 0.9s cubic-bezier(0.4,0,0.2,1), object-position 0.9s cubic-bezier(0.4,0,0.2,1)',
                display: 'block',
              }}
            />
          </div>

          {/* ── z-10: Curtain ambient sway (not zoomed only) ──────────────── */}
          <AnimatePresence>
            {!zoomed && !prefersReduced && (
              <motion.div
                key="curtains"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}
              >
                {/* Left curtain */}
                <div style={{
                  position: 'absolute', left: 0, top: 0,
                  width: '10%', height: '65%',
                  background: 'rgba(255,252,245,0.035)',
                  animation: 'curtainSway 5s ease-in-out infinite alternate',
                  transformOrigin: 'top left',
                }} />
                {/* Right curtain */}
                <div style={{
                  position: 'absolute', right: 0, top: 0,
                  width: '8%', height: '65%',
                  background: 'rgba(255,252,245,0.035)',
                  animation: 'curtainSway 5s ease-in-out infinite alternate-reverse',
                  animationDelay: '1.5s',
                  transformOrigin: 'top right',
                }} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── z-15: Glowing dot + "enter your space" label ─────────────── */}
          <AnimatePresence>
            {dotVisible && (
              <motion.div
                key="dot"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  position: 'absolute',
                  left: '35%', top: '38%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 15,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '10px',
                  cursor: 'pointer',
                }}
                onClick={handleDotClick}
                role="button"
                tabIndex={0}
                aria-label="Enter your space"
                onKeyDown={(e) => e.key === 'Enter' && handleDotClick()}
              >
                {/* Dot + outer ring */}
                <div style={{ position: 'relative', width: '28px', height: '28px' }}>
                  {/* Outer pulsing ring */}
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '28px', height: '28px', borderRadius: '50%',
                    border: '1.5px solid rgba(200,160,40,0.4)',
                    animation: 'pulse 2s ease-out infinite',
                    zIndex: 1,
                  }} />
                  {/* Inner gold dot */}
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '14px', height: '14px', borderRadius: '50%',
                      background: '#c8a040',
                      boxShadow: '0 0 10px rgba(200,160,40,0.75), 0 0 20px rgba(200,160,40,0.35)',
                      zIndex: 2,
                    }}
                  />
                </div>

                {/* "enter your space" — delayed fade in */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.0 }}
                  style={{
                    fontFamily: 'Cinzel, serif', fontSize: '9px',
                    letterSpacing: '0.2em', color: 'var(--gold)',
                    textShadow: '0 1px 8px rgba(0,0,0,0.55)',
                    pointerEvents: 'none', userSelect: 'none',
                  }}
                >
                  enter your space
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── z-20: Hotspots + desk cards (visible after zoom) ──────────── */}
          <AnimatePresence>
            {showDesk && (
              <motion.div
                key="desk-ui"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                style={{ position: 'absolute', inset: 0, zIndex: 20 }}
              >
                {/* ── Journal hotspot ── */}
                <HotSpot
                  id="journal"
                  style={{ left: '28%', top: '28%', width: '18%', height: '22%' }}
                  hoveredId={hoveredId} onHover={setHoveredId}
                  onClick={() => doNavigate('/journal/1')}
                  glowColor="rgba(200,160,40,0.5)"
                  label="open journal"
                />

                {/* ── Parchment scroll hotspot ── */}
                <HotSpot
                  id="scroll"
                  style={{ left: '28%', top: '42%', width: '26%', height: '22%' }}
                  hoveredId={hoveredId} onHover={setHoveredId}
                  glowColor="rgba(200,160,40,0.28)"
                  tooltip={
                    <div>
                      <MoodArc width={175} height={68} />
                      <p style={{
                        fontFamily: 'IM Fell English, serif', fontStyle: 'italic',
                        fontSize: '12px', lineHeight: 1.65,
                        color: 'var(--text-secondary)', marginTop: '10px',
                      }}>
                        Your palette has warmed over five sessions.
                      </p>
                    </div>
                  }
                />

                {/* ── Plant hotspot ── */}
                <HotSpot
                  id="plant"
                  style={{ left: '48%', top: '26%', width: '12%', height: '18%' }}
                  hoveredId={hoveredId} onHover={setHoveredId}
                  plantSway
                  label="breathe"
                  labelItalic
                />

                {/* ── Quill + ink pot hotspot ── */}
                <HotSpot
                  id="quill"
                  style={{ left: '52%', top: '38%', width: '14%', height: '16%' }}
                  hoveredId={hoveredId} onHover={setHoveredId}
                  onClick={() => doNavigate('/session')}
                  glowColor="rgba(200,160,40,0.42)"
                  label="new session"
                  quillHover
                />

                {/* ── Bookshelf hotspot ── */}
                <HotSpot
                  id="bookshelf"
                  style={{ left: '72%', top: '22%', width: '18%', height: '45%' }}
                  hoveredId={hoveredId} onHover={setHoveredId}
                  onClick={() => doNavigate('/journal')}
                  label="your journals"
                />

                {/* ── Desk cards — staggered, gently rotated ── */}
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
                  style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
                >
                  {/* Card 1: Latest Letter */}
                  <DeskCard rotate={-1.5} delay={0} style={{ left: '8%', bottom: '18%', width: '26%' }}>
                    <PanelLabel>Latest letter</PanelLabel>
                    <GoldDivider />
                    <p style={{
                      fontFamily: 'IM Fell English, serif', fontStyle: 'italic',
                      fontSize: '12px', lineHeight: 1.75,
                      color: 'var(--text)', opacity: 0.82,
                      marginBottom: '10px',
                    }}>
                      "You held so much today — the weight of the morning, the quiet hours before everything asked something of you..."
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: '#7b9ea8', flexShrink: 0,
                      }} />
                      <p style={{
                        fontFamily: 'Cinzel, serif', fontSize: '8px',
                        letterSpacing: '0.12em', color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                      }}>
                        Mar 18 · 38 min · Foggy
                      </p>
                    </div>
                  </DeskCard>

                  {/* Card 2: Mood Arc */}
                  <DeskCard rotate={0.5} delay={0.15} style={{ left: '36%', bottom: '15%', width: '26%' }}>
                    <PanelLabel>Mood arc</PanelLabel>
                    <GoldDivider />
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 6px' }}>
                      <MoodArc width={178} height={70} />
                    </div>
                    <p style={{
                      fontFamily: 'IM Fell English, serif', fontStyle: 'italic',
                      fontSize: '11px', lineHeight: 1.65,
                      color: 'var(--text-secondary)', textAlign: 'center',
                      marginTop: '6px',
                    }}>
                      Your palette has warmed over five sessions.
                    </p>
                  </DeskCard>

                  {/* Card 3: New Session */}
                  <DeskCard rotate={1} delay={0.3} style={{ left: '64%', bottom: '18%', width: '22%' }}>
                    <PanelLabel>New session</PanelLabel>
                    <GoldDivider />
                    <p style={{
                      fontFamily: 'IM Fell English, serif', fontStyle: 'italic',
                      fontSize: '12px', lineHeight: 1.65,
                      color: 'var(--text-secondary)', marginBottom: '12px',
                    }}>
                      the canvas awaits your mood today
                    </p>
                    {/* Arrow button — needs pointer-events despite card being none */}
                    <div style={{ display: 'flex', justifyContent: 'center', pointerEvents: 'auto' }}>
                      <motion.button
                        whileHover={{ scale: 1.12, background: 'rgba(200,160,40,0.16)' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => doNavigate('/session')}
                        aria-label="Start new session"
                        style={{
                          width: '34px', height: '34px', borderRadius: '50%',
                          border: '1px solid var(--gold)', background: 'transparent',
                          cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          transition: 'background 0.2s ease',
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                          <path
                            d="M3.5 7 L10.5 7 M7.5 4 L10.5 7 L7.5 10"
                            stroke="var(--gold)" strokeWidth="1.3"
                            strokeLinecap="round" strokeLinejoin="round"
                          />
                        </svg>
                      </motion.button>
                    </div>
                  </DeskCard>
                </motion.div>

              </motion.div>
            )}
          </AnimatePresence>

          {/* ── z-30: Back to room button (zoomed only) ───────────────────── */}
          <AnimatePresence>
            {showDesk && (
              <motion.button
                key="back"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, delay: 0.35 }}
                onClick={handleBack}
                aria-label="Return to room view"
                style={{
                  position: 'absolute', top: '72px', left: '20px',
                  zIndex: 30, background: 'none', border: 'none',
                  cursor: 'pointer', padding: '4px 0',
                  fontFamily: 'Cinzel, serif', fontSize: '9px',
                  letterSpacing: '0.18em', color: 'var(--gold)',
                  textTransform: 'uppercase',
                  transition: 'opacity 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                ← your space
              </motion.button>
            )}
          </AnimatePresence>

          {/* ── Scroll hint (fades when mask is mostly open) ─────────────── */}
          <motion.div
            animate={{ opacity: maskSize < 110 && !zoomed ? 1 : 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'absolute', bottom: '6%', left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '8px',
              pointerEvents: 'none', zIndex: 5,
            }}
          >
            <p style={{
              fontFamily: 'IM Fell English, serif', fontStyle: 'italic',
              fontSize: '13px', color: 'rgba(242,232,213,0.72)',
              textShadow: '0 1px 6px rgba(0,0,0,0.45)',
            }}>
              scroll to enter the room
            </p>
            <svg className="bounce" width="14" height="8" viewBox="0 0 14 8" fill="none">
              <path
                d="M1 1 L7 7 L13 1"
                stroke="rgba(200,160,40,0.82)" strokeWidth="1.4"
                strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </motion.div>

        </div>{/* end sticky */}
      </div>{/* end 300vh */}
    </>
  )
}
