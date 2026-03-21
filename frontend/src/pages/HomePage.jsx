import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from 'framer-motion'
import TopBar from '../components/TopBar'
import OrnamentalDivider from '../components/OrnamentalDivider'
// Place desk.jpg in the /public folder as /public/desk.jpg
const deskImg = '/desk.jpg'

/* ─── SVG logo paths (face · EKG · leaves) ─── */
const FACE_PATH =
  'M28,178 C28,140 40,90 65,55 C82,33 108,28 116,50 C124,68 115,90 104,108 C93,126 80,140 74,160 C68,178 65,192 62,196 L58,198'
const EKG_PATH =
  'M88,108 L104,108 L112,74 L122,142 L130,84 L140,122 L150,108 L218,108'
const LEAF1_PATH =
  'M178,70 C192,42 224,34 230,58 C236,82 216,104 192,98 C208,66 202,50 182,66 Z'
const LEAF2_PATH =
  'M186,100 C200,126 228,136 228,108 C228,84 208,78 190,92 Z'

/* ─── Mood arc SVG ─── */
function MoodArc({ width = 160, height = 72 }) {
  const pts = [
    { x: 14, y: 54 },
    { x: 56, y: 30 },
    { x: 104, y: 48 },
    { x: 146, y: 20 },
  ]
  const d = `M${pts[0].x},${pts[0].y} C${pts[0].x + 20},${pts[0].y} ${pts[1].x - 20},${pts[1].y} ${pts[1].x},${pts[1].y} C${pts[1].x + 20},${pts[1].y} ${pts[2].x - 20},${pts[2].y} ${pts[2].x},${pts[2].y} C${pts[2].x + 20},${pts[2].y} ${pts[3].x - 20},${pts[3].y} ${pts[3].x},${pts[3].y}`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <path d={d} stroke="var(--gold)" strokeWidth="1.5" fill="none" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="var(--gold)" opacity="0.75" />
      ))}
    </svg>
  )
}

/* ─── LANDING SECTION ─── */
function LandingSection() {
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        position: 'relative',
      }}
    >
      {/* SVG Logo Animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{ marginBottom: '6px' }}
      >
        <svg
          width="200"
          height="150"
          viewBox="20 20 230 190"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Face profile — teal stroke */}
          <motion.path
            d={FACE_PATH}
            stroke="#2d4a3e"
            strokeWidth="2.8"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: 'easeInOut', delay: 0 }}
          />
          {/* Face fill bloom */}
          <motion.path
            d={FACE_PATH}
            stroke="none"
            fill="#2d4a3e"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.07 }}
            transition={{ duration: 0.6, delay: 1.5 }}
          />

          {/* Leaf 1 — lavender */}
          <motion.path
            d={LEAF1_PATH}
            stroke="#6b3d7a"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.3 }}
          />
          <motion.path
            d={LEAF1_PATH}
            fill="#6b3d7a"
            stroke="none"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 0.5, scale: 1 }}
            transition={{ duration: 0.55, delay: 1.8 }}
            style={{ transformOrigin: '204px 70px' }}
          />

          {/* Leaf 2 — gold */}
          <motion.path
            d={LEAF2_PATH}
            stroke="#c8a040"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.0, ease: 'easeInOut', delay: 0.5 }}
          />
          <motion.path
            d={LEAF2_PATH}
            fill="#c8a040"
            stroke="none"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 0.55, scale: 1 }}
            transition={{ duration: 0.55, delay: 2.1 }}
            style={{ transformOrigin: '207px 110px' }}
          />

          {/* EKG heartbeat — gold */}
          <motion.path
            d={EKG_PATH}
            stroke="#c8a040"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: 'easeInOut', delay: 0.8 }}
          />
        </svg>
      </motion.div>

      {/* ARVERIÉ wordmark */}
      <motion.h1
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 2.5 }}
        style={{
          fontFamily: 'Cinzel, serif',
          fontSize: '52px',
          fontWeight: 500,
          color: '#1a3a30',
          letterSpacing: '0.2em',
          lineHeight: 1,
          marginBottom: '12px',
        }}
      >
        ARVERIÉ
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut', delay: 3.0 }}
        style={{
          fontFamily: 'Cinzel, serif',
          fontSize: '13px',
          color: 'var(--text-muted)',
          letterSpacing: '0.3em',
          marginBottom: '48px',
        }}
      >
        AI Art Therapy
      </motion.p>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 3.5 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '10px',
            letterSpacing: '0.18em',
            color: 'var(--text-muted)',
          }}
        >
          scroll to enter
        </span>
        <svg
          className="bounce"
          width="14"
          height="8"
          viewBox="0 0 14 8"
          fill="none"
        >
          <path
            d="M1 1 L7 7 L13 1"
            stroke="var(--gold)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
    </div>
  )
}

/* ─── DASHBOARD SECTION ─── */
function DashboardSection() {
  const navigate = useNavigate()
  const sectionRef = useRef(null)
  const [hoveredHot, setHoveredHot] = useState(null)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  const imageScale = useTransform(scrollYProgress, [0, 0.7], [1, 1.6])
  const imageY = useTransform(scrollYProgress, [0, 0.7], [0, -60])
  const overlayOpacity = useTransform(scrollYProgress, [0.3, 0.5], [0, 1])

  /* Below-fold cards */
  const belowCards = [
    {
      key: 'letter',
      title: 'Latest Letter',
      content: (
        <>
          <p
            style={{
              fontFamily: 'IM Fell English, serif',
              fontStyle: 'italic',
              fontSize: '13px',
              lineHeight: 1.75,
              color: 'var(--text)',
              opacity: 0.8,
              margin: '12px 0',
            }}
          >
            "You held so much today — the weight of the morning, the quiet hours before everything asked something of you..."
          </p>
          <p
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '9px',
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
            }}
          >
            MAR 18 · 38 MIN · FOGGY
          </p>
        </>
      ),
    },
    {
      key: 'arc',
      title: 'Mood Arc',
      content: (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
          <MoodArc width={180} height={80} />
        </div>
      ),
    },
    {
      key: 'new',
      title: 'New Session',
      content: (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 0',
          }}
        >
          {/* Quill SVG */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path
              d="M26 3 C26 3 20 10 14 20 C10 28 8 31 8 31 L12 27 C16 21 22 13 26 3 Z"
              stroke="var(--gold)"
              strokeWidth="1.4"
              fill="rgba(200,160,40,0.07)"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M8 31 L6 33" stroke="var(--gold)" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: '13px', color: 'var(--text)', letterSpacing: '0.08em' }}>
            New Session
          </p>
          <p style={{ fontFamily: 'IM Fell English, serif', fontStyle: 'italic', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Begin a new journey of creative reflection
          </p>
          <motion.button
            whileHover={{ scale: 1.08, background: 'rgba(200,160,40,0.14)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/session')}
            style={{
              width: '36px', height: '36px',
              borderRadius: '50%',
              border: '1px solid var(--gold)',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M4 7 L10 7 M7.5 4.5 L10 7 L7.5 9.5" stroke="var(--gold)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.button>
        </div>
      ),
    },
  ]

  return (
    <div ref={sectionRef} style={{ minHeight: '350vh', position: 'relative' }}>
      {/* Sticky viewport */}
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
        {/* Background image with scroll-driven zoom */}
        <motion.img
          src={deskImg}
          alt="Study desk at golden hour"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            scale: imageScale,
            y: imageY,
            transformOrigin: 'center center',
          }}
          onError={(e) => {
            e.target.style.display = 'none'
          }}
        />

        {/* Fallback gradient if image missing */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(160deg, #1a0d04 0%, #3d1f08 30%, #7a4820 55%, #c8902a 80%, #f2e8d5 100%)',
            zIndex: -1,
          }}
        />

        {/* Hotspot overlay — fades in at 30–50% scroll */}
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: overlayOpacity,
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          {/* ── Journal hotspot ── */}
          <HotSpot
            style={{ left: '22%', top: '38%', width: '18%', height: '32%' }}
            onHover={setHoveredHot}
            id="journal"
            hoveredHot={hoveredHot}
            onClick={() => navigate('/journal/1')}
            glowColor="rgba(200,160,40,0.4)"
            label="open journal"
          />

          {/* ── Scroll / mood-arc hotspot ── */}
          <HotSpot
            style={{ left: '38%', top: '48%', width: '26%', height: '24%' }}
            onHover={setHoveredHot}
            id="scroll"
            hoveredHot={hoveredHot}
            tooltip={
              <div style={{ padding: '12px 14px' }}>
                <p style={{ fontFamily: 'Cinzel, serif', fontSize: '9px', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  MOOD ARC
                </p>
                <MoodArc width={150} height={60} />
              </div>
            }
          />

          {/* ── Plant hotspot ── */}
          <HotSpot
            style={{ left: '52%', top: '32%', width: '12%', height: '35%' }}
            onHover={setHoveredHot}
            id="plant"
            hoveredHot={hoveredHot}
            plantSway
          />

          {/* ── Quill hotspot ── */}
          <HotSpot
            style={{ left: '68%', top: '42%', width: '14%', height: '30%' }}
            onHover={setHoveredHot}
            id="quill"
            hoveredHot={hoveredHot}
            onClick={() => navigate('/session')}
            label="begin session"
            quillHover
          />
        </motion.div>

        {/* Scroll hint at bottom */}
        <motion.div
          style={{
            position: 'absolute',
            bottom: '5%',
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: useTransform(scrollYProgress, [0, 0.15], [1, 0]),
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <p
            style={{
              fontFamily: 'IM Fell English, serif',
              fontStyle: 'italic',
              color: 'rgba(242,232,213,0.65)',
              fontSize: '13px',
            }}
          >
            explore the room
          </p>
        </motion.div>
      </div>

      {/* ── Below-fold cards ── */}
      <div
        style={{
          background: 'var(--bg)',
          padding: '80px 40px 80px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
          maxWidth: '960px',
          margin: '0 auto',
        }}
      >
        {belowCards.map((card) => (
          <motion.div
            key={card.key}
            className="card"
            style={{ padding: '24px' }}
            initial={{ y: 40, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <p
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '10px',
                letterSpacing: '0.15em',
                color: 'var(--gold)',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              {card.title}
            </p>
            <OrnamentalDivider />
            {card.content}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ─── Hotspot component ─── */
function HotSpot({
  style, id, onHover, hoveredHot, onClick,
  glowColor, label, tooltip, plantSway, quillHover,
}) {
  const isHovered = hoveredHot === id

  return (
    <div
      style={{ position: 'absolute', ...style, pointerEvents: 'auto', zIndex: 10 }}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
    >
      <motion.div
        animate={
          quillHover && isHovered
            ? { y: -8, rotate: -8 }
            : isHovered && glowColor
            ? { y: -6 }
            : { y: 0, rotate: 0 }
        }
        transition={
          quillHover
            ? { type: 'spring', damping: 16, stiffness: 200 }
            : { duration: 0.4, ease: 'easeOut' }
        }
        className={plantSway && isHovered ? 'plant-sway' : ''}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '8px',
          cursor: onClick ? 'pointer' : 'default',
          boxShadow:
            isHovered && glowColor
              ? `0 0 36px ${glowColor}, inset 0 0 18px ${glowColor}`
              : 'none',
          transition: 'box-shadow 0.4s ease',
        }}
      />

      {/* Label tooltip */}
      <AnimatePresence>
        {isHovered && label && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              bottom: '-30px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(8,5,2,0.72)',
              border: '1px solid var(--border-gold)',
              borderRadius: '12px',
              padding: '3px 12px',
              whiteSpace: 'nowrap',
              fontFamily: 'Cinzel, serif',
              fontSize: '8px',
              letterSpacing: '0.12em',
              color: 'rgba(200,160,40,0.9)',
              pointerEvents: 'none',
            }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tooltip card */}
      <AnimatePresence>
        {isHovered && tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
            className="card"
            style={{
              position: 'absolute',
              bottom: '110%',
              left: '50%',
              transform: 'translateX(-50%)',
              minWidth: '180px',
              pointerEvents: 'none',
            }}
          >
            {tooltip}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── HomePage (continuous scroll) ─── */
export default function HomePage() {
  const { scrollY } = useScroll()
  const topBarOpacity = useTransform(
    scrollY,
    [typeof window !== 'undefined' ? window.innerHeight * 0.8 : 600, typeof window !== 'undefined' ? window.innerHeight : 800],
    [0, 1]
  )

  return (
    <div style={{ background: 'var(--bg)' }}>
      {/* TopBar fades in after scrolling past landing */}
      <motion.div style={{ opacity: topBarOpacity, pointerEvents: useTransform(topBarOpacity, [0, 0.5], ['none', 'auto']) }}>
        <TopBar />
      </motion.div>

      <LandingSection />
      <DashboardSection />
    </div>
  )
}
