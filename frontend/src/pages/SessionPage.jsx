import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import TopBar from '../components/TopBar'
import OrnamentalDivider from '../components/OrnamentalDivider'
import { useApp } from '../context/AppContext'

const MOODS = ['heavy', 'restless', 'foggy', 'okay', 'light', 'tender']

const PALETTE = [
  '#1a1a2e', '#3b4f7a', '#2d4a3e', '#4a6b4a',
  '#6b3d7a', '#7a3b2e', '#b07a3a', '#c8a040',
  '#8a7a6a', '#d4af37', '#c4854a', '#d4956a',
]

const cardVariants = {
  enter: { y: 24, opacity: 0 },
  center: { y: 0, opacity: 1 },
  exit: { y: -24, opacity: 0 },
}

/* ─── Card 1: Arrival ─── */
function ArrivalCard({ onNext }) {
  return (
    <div className="card" style={{ padding: '52px 44px', textAlign: 'center', maxWidth: '440px', width: '100%' }}>
      <OrnamentalDivider />
      <p
        style={{
          fontFamily: 'IM Fell English, serif',
          fontStyle: 'italic',
          fontSize: '22px',
          lineHeight: 1.55,
          color: 'var(--text)',
          margin: '24px 0',
        }}
      >
        How are you arriving today?
      </p>
      <OrnamentalDivider />
      <button className="btn" style={{ marginTop: '28px', padding: '10px 36px' }} onClick={onNext}>
        I'm here
      </button>
    </div>
  )
}

/* ─── Card 2: Mood word ─── */
function MoodCard({ onNext }) {
  const [selected, setSelected] = useState('')
  const [custom, setCustom] = useState('')
  const mood = selected || custom.trim()

  return (
    <div className="card" style={{ padding: '40px 40px', maxWidth: '440px', width: '100%' }}>
      <p
        style={{
          fontFamily: 'Cinzel, serif',
          fontSize: '12px',
          letterSpacing: '0.15em',
          color: 'var(--text-muted)',
          textAlign: 'center',
          marginBottom: '24px',
        }}
      >
        GIVE THIS MOMENT A WORD
      </p>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          justifyContent: 'center',
          marginBottom: '20px',
        }}
      >
        {MOODS.map((m) => (
          <button
            key={m}
            onClick={() => { setSelected(m); setCustom('') }}
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '10px',
              letterSpacing: '0.06em',
              padding: '6px 16px',
              borderRadius: '16px',
              border: `1px solid ${selected === m ? 'var(--gold)' : 'var(--border-gold)'}`,
              background: selected === m ? 'var(--gold-wash)' : 'transparent',
              color: 'var(--text)',
              cursor: 'pointer',
              transition: 'all var(--transition)',
            }}
          >
            {m}
          </button>
        ))}
      </div>
      <input
        value={custom}
        onChange={(e) => { setCustom(e.target.value); setSelected('') }}
        placeholder="or write your own..."
        style={{
          width: '100%',
          fontFamily: 'IM Fell English, serif',
          fontStyle: 'italic',
          fontSize: '16px',
          color: 'var(--text)',
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid var(--border-gold)',
          padding: '8px 0',
          outline: 'none',
          marginBottom: '24px',
        }}
      />
      <div style={{ textAlign: 'center' }}>
        <button
          className="btn"
          disabled={!mood}
          onClick={() => mood && onNext(mood)}
          style={{ padding: '10px 36px' }}
        >
          Continue
        </button>
      </div>
    </div>
  )
}

/* ─── Card 3: Color ─── */
function ColorCard({ onNext }) {
  const [selected, setSelected] = useState(null)
  const [custom, setCustom] = useState(null)
  const color = custom || selected

  return (
    <div className="card" style={{ padding: '40px 40px', maxWidth: '440px', width: '100%' }}>
      <p
        style={{
          fontFamily: 'Cinzel, serif',
          fontSize: '12px',
          letterSpacing: '0.15em',
          color: 'var(--text-muted)',
          textAlign: 'center',
          marginBottom: '24px',
        }}
      >
        PICK A COLOR THAT FEELS LIKE THIS MOMENT
      </p>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          justifyContent: 'center',
          marginBottom: '16px',
        }}
      >
        {PALETTE.map((c) => (
          <motion.div
            key={c}
            onClick={() => { setSelected(c); setCustom(null) }}
            animate={
              selected === c && !custom
                ? { scale: 1.1, boxShadow: '0 0 0 3px rgba(200,160,40,0.7)' }
                : { scale: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.22)' }
            }
            transition={{ duration: 0.2 }}
            style={{
              width: '30px', height: '30px',
              borderRadius: '50%',
              background: c,
              cursor: 'pointer',
            }}
          />
        ))}
      </div>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <label
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '9px',
            color: 'var(--gold)',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            opacity: 0.85,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          or choose your own →
          <input
            type="color"
            onChange={(e) => { setCustom(e.target.value); setSelected(null) }}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
          />
        </label>
        {custom && (
          <div
            style={{
              width: '30px', height: '30px',
              borderRadius: '50%',
              background: custom,
              margin: '8px auto 0',
              boxShadow: '0 0 0 3px rgba(200,160,40,0.7)',
            }}
          />
        )}
      </div>
      <div style={{ textAlign: 'center' }}>
        <button
          className="btn"
          disabled={!color}
          onClick={() => color && onNext(color)}
          style={{ padding: '10px 36px' }}
        >
          Continue
        </button>
      </div>
    </div>
  )
}

/* ─── Card 4: Mode selection ─── */
function ModeCard({ mood, moodColor }) {
  const navigate = useNavigate()
  const { setSession } = useApp()
  const [mode, setMode] = useState(null)
  const [bursting, setBursting] = useState(false)

  function handleBegin() {
    if (!mode) return
    setSession((s) => ({
      ...s,
      mood,
      moodColor,
      guided: mode === 'guided',
      startTime: Date.now(),
    }))
    setBursting(true)
    setTimeout(() => navigate('/canvas'), 780)
  }

  return (
    <>
      {/* Radial burst transition */}
      <AnimatePresence>
        {bursting && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 32, opacity: 0 }}
            transition={{ duration: 0.75, ease: 'easeInOut' }}
            style={{
              position: 'fixed',
              inset: 0, margin: 'auto',
              width: '60px', height: '60px',
              borderRadius: '50%',
              background: moodColor || 'var(--gold)',
              zIndex: 200,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      <div className="card" style={{ padding: '40px 40px', maxWidth: '440px', width: '100%' }}>
        <p
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '12px',
            letterSpacing: '0.15em',
            color: 'var(--text-muted)',
            textAlign: 'center',
            marginBottom: '24px',
          }}
        >
          HOW WOULD YOU LIKE TO PAINT TODAY?
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '28px' }}>
          {[
            { key: 'guided', label: 'Guided', sub: "I'll offer gentle prompts" },
            { key: 'free', label: 'Free', sub: 'just me and the canvas' },
          ].map((opt) => (
            <div
              key={opt.key}
              onClick={() => setMode(opt.key)}
              style={{
                width: '190px',
                padding: '22px 18px',
                borderRadius: 'var(--radius-md)',
                border: `${mode === opt.key ? 2 : 1}px solid ${mode === opt.key ? 'var(--gold)' : 'var(--border)'}`,
                background: mode === opt.key ? 'var(--gold-wash)' : 'var(--bg-card)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all var(--transition)',
              }}
            >
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: '13px', color: 'var(--text)', marginBottom: '8px' }}>
                {opt.label}
              </p>
              <p style={{ fontFamily: 'IM Fell English, serif', fontStyle: 'italic', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {opt.sub}
              </p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center' }}>
          <button
            className="btn btn-primary"
            disabled={!mode}
            onClick={handleBegin}
            style={{ padding: '10px 36px' }}
          >
            Begin painting
          </button>
        </div>
      </div>
    </>
  )
}

/* ─── SessionPage ─── */
export default function SessionPage() {
  const [step, setStep] = useState(0)
  const [mood, setMood] = useState(null)
  const [moodColor, setMoodColor] = useState(null)

  const cards = [
    <ArrivalCard onNext={() => setStep(1)} />,
    <MoodCard onNext={(m) => { setMood(m); setStep(2) }} />,
    <ColorCard onNext={(c) => { setMoodColor(c); setStep(3) }} />,
    <ModeCard mood={mood} moodColor={moodColor} />,
  ]

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        paddingTop: '52px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <TopBar />
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: step === 0 ? 0.45 : 0.35, ease: 'easeInOut' }}
            style={{ width: '100%', maxWidth: '440px', display: 'flex', justifyContent: 'center' }}
          >
            {cards[step]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
