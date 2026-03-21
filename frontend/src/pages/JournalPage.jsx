import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import OrnamentalDivider from '../components/OrnamentalDivider'
import { api } from '../utils/api'

/* ─── Placeholder entries ─── */
const PLACEHOLDER = [
  {
    id: 1,
    date: 'Mar 18, 2026',
    duration: '38 min',
    mood: 'foggy',
    moodColor: '#3b4f7a',
    letter:
      'The morning carried a particular weight — the kind that settles in the chest before you\'ve had time to name it. You moved through blues and grays, letting them bleed into each other without urgency. There was a tenderness in the way you let the fog be fog.',
    thumbnail: null,
  },
  {
    id: 2,
    date: 'Mar 15, 2026',
    duration: '52 min',
    mood: 'tender',
    moodColor: '#c4854a',
    letter:
      'Something opened today. In warm ochres and soft edges, a gentleness you sometimes forget you carry. You let the color breathe. This session felt like remembering — not something lost, but something patient.',
    thumbnail: null,
  },
  {
    id: 3,
    date: 'Mar 12, 2026',
    duration: '24 min',
    mood: 'restless',
    moodColor: '#8b2252',
    letter:
      'Reds and blacks in quick, unresolved strokes. The session was short — not because you ran out of things to say, but because some feelings ask only to be marked, not finished.',
    thumbnail: null,
  },
  {
    id: 4,
    date: 'Mar 10, 2026',
    duration: '61 min',
    mood: 'expansive',
    moodColor: '#2d7d9a',
    letter:
      'Horizons. Over an hour spent on something that kept opening. Blues deepening toward the center. You stayed with it even when it felt too large — and that is its own kind of courage.',
    thumbnail: null,
  },
  {
    id: 5,
    date: 'Mar 7, 2026',
    duration: '45 min',
    mood: 'quiet',
    moodColor: '#5a7a5a',
    letter:
      'Greens and near-whites. A session that moved like breath — slow, recurring, with small variations each time. Some days the canvas is a place to simply be.',
    thumbnail: null,
  },
  {
    id: 6,
    date: 'Mar 3, 2026',
    duration: '33 min',
    mood: 'searching',
    moodColor: '#b8860b',
    letter:
      'Warm golds pulled toward the edges, as if reaching. You came in without a direction and found one anyway — not a destination, but a leaning.',
    thumbnail: null,
  },
]

/* ─── Single page ─── */
function JournalPageContent({ entry, pageNum }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: '9px', color: 'var(--text-muted)' }}>{pageNum}</span>
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: '9px', color: 'var(--text-muted)' }}>{entry.date}</span>
      </div>

      {/* Drawing thumbnail */}
      <div
        className="drawing-frame"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          border: '1px solid var(--border)',
          borderRadius: '6px',
          overflow: 'hidden',
          marginBottom: '10px',
          background: entry.moodColor ? `${entry.moodColor}22` : '#f0e8d0',
          minHeight: '90px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: hovered ? 'brightness(1.15)' : 'brightness(1)',
          transition: 'filter 0.3s',
        }}
      >
        {entry.thumbnail ? (
          <img src={entry.thumbnail} alt="" style={{ display: 'block', width: '100%' }} />
        ) : (
          <svg width="60" height="36" viewBox="0 0 60 36" fill="none" style={{ opacity: 0.3 }}>
            <path d="M6 28 C14 10 22 20 30 14 C38 8 44 22 54 8" stroke={entry.moodColor || '#c8a040'} strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <circle cx="6" cy="28" r="2" fill={entry.moodColor || '#c8a040'} />
            <circle cx="30" cy="14" r="2" fill={entry.moodColor || '#c8a040'} />
            <circle cx="54" cy="8" r="2" fill={entry.moodColor || '#c8a040'} />
          </svg>
        )}
      </div>

      <OrnamentalDivider />

      <p
        style={{
          fontFamily: 'IM Fell English, serif',
          fontStyle: 'italic',
          fontSize: '11px',
          lineHeight: 1.72,
          color: 'var(--text)',
          opacity: 0.8,
          marginTop: '6px',
        }}
      >
        {entry.letter}
      </p>

      <div
        style={{
          fontFamily: 'Cinzel, serif',
          fontSize: '8px',
          letterSpacing: '0.12em',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginTop: '12px',
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: entry.moodColor, display: 'inline-block', flexShrink: 0 }} />
        {entry.duration.toUpperCase()} · {entry.mood.toUpperCase()}
      </div>
    </div>
  )
}

/* ─── Page spread ─── */
function PageSpread({ entries, spreadIndex, onFlipForward, onFlipBack, flipping, flipDir }) {
  const left = entries[spreadIndex * 2]
  const right = entries[spreadIndex * 2 + 1]
  const [leftCurl, setLeftCurl] = useState(false)
  const [rightCurl, setRightCurl] = useState(false)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 13px 1fr',
        width: 'min(820px, 96vw)',
        border: '1px solid rgba(150,110,55,0.2)',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 8px 48px rgba(0,0,0,0.38)',
        position: 'relative',
      }}
    >
      {/* Left page */}
      <div
        className="journal-ruled"
        style={{
          background: '#faf2de',
          minHeight: '420px',
          padding: '18px 16px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {left ? (
          <JournalPageContent entry={left} pageNum={spreadIndex * 2 + 1} />
        ) : (
          <p style={{ fontFamily: 'IM Fell English, serif', fontStyle: 'italic', color: 'rgba(58,34,8,0.18)', fontSize: '13px', textAlign: 'center', paddingTop: '40px' }}>
            — empty —
          </p>
        )}
        {/* Left corner curl */}
        {left && spreadIndex > 0 && (
          <div
            onMouseEnter={() => setLeftCurl(true)}
            onMouseLeave={() => setLeftCurl(false)}
            onClick={onFlipBack}
            style={{
              position: 'absolute', bottom: 0, left: 0,
              width: 0, height: 0,
              borderStyle: 'solid',
              borderWidth: leftCurl ? '0 0 44px 44px' : '0',
              borderColor: `transparent transparent transparent rgba(175,145,75,0.35)`,
              cursor: 'pointer',
              transition: 'border-width 0.25s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        )}
      </div>

      {/* Spine */}
      <div
        style={{
          background: 'linear-gradient(90deg, rgba(120,85,30,0.1), rgba(170,130,50,0.15), rgba(120,85,30,0.1))',
          zIndex: 4,
        }}
      />

      {/* Right page */}
      <div
        className="journal-ruled"
        style={{
          background: '#faf2de',
          minHeight: '420px',
          padding: '18px 16px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {right ? (
          <JournalPageContent entry={right} pageNum={spreadIndex * 2 + 2} />
        ) : (
          <p style={{ fontFamily: 'IM Fell English, serif', fontStyle: 'italic', color: 'rgba(58,34,8,0.18)', fontSize: '13px', textAlign: 'center', paddingTop: '40px' }}>
            — end —
          </p>
        )}
        {/* Right corner curl */}
        {right && (
          <div
            onMouseEnter={() => setRightCurl(true)}
            onMouseLeave={() => setRightCurl(false)}
            onClick={onFlipForward}
            style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 0, height: 0,
              borderStyle: 'solid',
              borderWidth: rightCurl ? '0 44px 44px 0' : '0',
              borderColor: `transparent rgba(175,145,75,0.35) transparent transparent`,
              cursor: 'pointer',
              transition: 'border-width 0.25s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        )}

        {/* Page flip overlay */}
        <AnimatePresence>
          {flipping && (
            <motion.div
              initial={{ rotateY: 0 }}
              animate={{ rotateY: flipDir === 'forward' ? -180 : 180 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.62, ease: [0.4, 0, 0.2, 1] }}
              style={{
                position: 'absolute', top: 0, bottom: 0,
                left: flipDir === 'forward' ? 0 : 'auto',
                right: flipDir === 'back' ? 0 : 'auto',
                width: '50%',
                background: '#f5ecca',
                transformOrigin: flipDir === 'forward' ? 'left center' : 'right center',
                transformStyle: 'preserve-3d',
                zIndex: 10,
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ─── JournalPage ─── */
export default function JournalPage() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState(PLACEHOLDER)
  const [phase] = useState('spread')
  const [spreadIndex, setSpreadIndex] = useState(0)
  const [flipping, setFlipping] = useState(false)
  const [flipDir, setFlipDir] = useState(null)

  // Fetch
  useEffect(() => {
    api.getJournal().then((data) => {
      if (data?.entries?.length) setEntries(data.entries)
    })
  }, [])

  function flipForward() {
    const maxSpread = Math.ceil(entries.length / 2) - 1
    if (flipping || spreadIndex >= maxSpread) return
    setFlipping(true); setFlipDir('forward')
    setTimeout(() => { setSpreadIndex((i) => i + 1); setFlipping(false); setFlipDir(null) }, 340)
  }

  function flipBack() {
    if (flipping || spreadIndex <= 0) return
    setFlipping(true); setFlipDir('back')
    setTimeout(() => { setSpreadIndex((i) => i - 1); setFlipping(false); setFlipDir(null) }, 340)
  }

  function handleClose() {
    navigate(-1)
  }

  const maxSpread = Math.ceil(entries.length / 2) - 1

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.38 }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(58,34,8,0.88)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      {/* Close button */}
      <button
        onClick={handleClose}
        style={{
          position: 'fixed', top: '18px', right: '18px',
          width: '30px', height: '30px',
          borderRadius: '50%',
          border: '1px solid rgba(212,175,55,0.35)',
          background: 'rgba(255,250,238,0.12)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 110,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path d="M1 1 L10 10 M10 1 L1 10" stroke="var(--gold)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>

      <AnimatePresence mode="wait">
        {phase === 'spread' && (
          <motion.div
            key="spread"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.42 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
          >
            <PageSpread
              entries={entries}
              spreadIndex={spreadIndex}
              onFlipForward={flipForward}
              onFlipBack={flipBack}
              flipping={flipping}
              flipDir={flipDir}
            />

            {/* Nav buttons fallback */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn"
                onClick={flipBack}
                disabled={spreadIndex <= 0}
                style={{ padding: '6px 18px', fontSize: '10px', opacity: spreadIndex <= 0 ? 0.18 : 1 }}
              >
                ← prev
              </button>
              <button
                className="btn"
                onClick={flipForward}
                disabled={spreadIndex >= maxSpread}
                style={{ padding: '6px 18px', fontSize: '10px', opacity: spreadIndex >= maxSpread ? 0.18 : 1 }}
              >
                next →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
