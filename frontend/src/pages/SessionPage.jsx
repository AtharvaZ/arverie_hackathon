import { useState, useEffect } from 'react'
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

export default function SessionPage() {
  const navigate = useNavigate()
  const { setSession } = useApp()

  // Combined State
  const [moodSelected, setMoodSelected] = useState('')
  const [moodCustom, setMoodCustom] = useState('')
  const mood = moodSelected || moodCustom.trim()

  const [colorSelected, setColorSelected] = useState(null)
  const [colorCustom, setColorCustom] = useState(null)
  const moodColor = colorCustom || colorSelected

  const [mode, setMode] = useState(null)
  const [bursting, setBursting] = useState(false)

  const isReady = !!(mood && moodColor && mode)

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  function handleBegin() {
    if (!isReady) return
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
    <div
      className="min-h-screen flex flex-col items-center w-full"
      style={{ background: 'var(--bg)', paddingTop: '64px' }}
    >
      <TopBar />

      {/* Radial burst transition */}
      <AnimatePresence>
        {bursting && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 32, opacity: 0 }}
            transition={{ duration: 0.75, ease: 'easeInOut' }}
            style={{
              position: 'fixed',
              inset: 0,
              margin: 'auto',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: moodColor || 'var(--gold)',
              zIndex: 200,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      <div className="flex-1 w-full max-w-4xl px-6 py-12 flex flex-col items-center">
        
        {/* Header */}
        <div className="text-center mb-12 w-full max-w-md">
          <OrnamentalDivider />
          <h1
            style={{
              fontFamily: 'IM Fell English, serif',
              fontStyle: 'italic',
              fontSize: '31px',
              color: 'var(--text)',
              margin: '24px 0',
            }}
          >
            How are you arriving today?
          </h1>
          <OrnamentalDivider />
        </div>

        {/* Bento Collage Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-12">
          
          {/* Box 1: Mood */}
          <div className="card p-8 flex flex-col justify-between" style={{ minHeight: '320px' }}>
            <h2
              className="text-center mb-8 mt-2"
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '15px',
                letterSpacing: '0.15em',
                color: 'var(--text-muted)',
              }}
            >
              GIVE THIS MOMENT A WORD
            </h2>
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {MOODS.map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMoodSelected(m)
                    setMoodCustom('')
                  }}
                  style={{
                    fontFamily: 'Cinzel, serif',
                    fontSize: '14px',
                    letterSpacing: '0.06em',
                    padding: '8px 18px',
                    borderRadius: '20px',
                    border: `1px solid ${
                      moodSelected === m ? 'var(--gold)' : 'var(--border-gold)'
                    }`,
                    background:
                      moodSelected === m ? 'var(--gold-wash)' : 'transparent',
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
              value={moodCustom}
              onChange={(e) => {
                setMoodCustom(e.target.value)
                setMoodSelected('')
              }}
              placeholder="or write your own..."
              className="mt-auto mx-auto max-w-[280px]"
              style={{
                width: '100%',
                fontFamily: 'IM Fell English, serif',
                fontStyle: 'italic',
                fontSize: '21px',
                color: 'var(--text)',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border-gold)',
                padding: '8px 4px',
                outline: 'none',
                textAlign: 'center',
              }}
            />
          </div>

          {/* Box 2: Color */}
          <div className="card p-8 flex flex-col items-center justify-between" style={{ minHeight: '320px' }}>
            <h2
              className="text-center mb-8 mt-2"
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '15px',
                letterSpacing: '0.15em',
                color: 'var(--text-muted)',
              }}
            >
              A COLOR FOR THIS MOMENT
            </h2>
            <div className="flex flex-wrap gap-3 justify-center mb-6 w-full max-w-[240px]">
              {PALETTE.map((c) => (
                <motion.div
                  key={c}
                  onClick={() => {
                    setColorSelected(c)
                    setColorCustom(null)
                  }}
                  animate={
                    colorSelected === c && !colorCustom
                      ? { scale: 1.15, boxShadow: '0 0 0 3px rgba(200,160,40,0.7)' }
                      : { scale: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.22)' }
                  }
                  transition={{ duration: 0.2 }}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: c,
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>

            <div className="flex flex-col items-center h-[50px] mt-auto">
              <label
                style={{
                  fontFamily: 'Cinzel, serif',
                  fontSize: '13px',
                  color: 'var(--gold)',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  opacity: 0.85,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  position: 'relative',
                }}
              >
                or choose your own →
                <input
                  type="color"
                  onChange={(e) => {
                    setColorCustom(e.target.value)
                    setColorSelected(null)
                  }}
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    cursor: 'pointer',
                  }}
                />
              </label>
              {colorCustom && (
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: colorCustom,
                    marginTop: '12px',
                    boxShadow: '0 0 0 3px rgba(200,160,40,0.7)',
                  }}
                />
              )}
            </div>
          </div>

          {/* Box 3: Mode */}
          <div className="card p-8 md:col-span-2">
            <h2
              className="text-center mb-8"
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '15px',
                letterSpacing: '0.15em',
                color: 'var(--text-muted)',
              }}
            >
              HOW WOULD YOU LIKE TO PAINT TODAY?
            </h2>
            <div className="flex flex-col sm:flex-row gap-6 justify-center max-w-2xl mx-auto">
              {[
                { key: 'guided', label: 'Guided', sub: "I'll offer gentle prompts" },
                { key: 'free', label: 'Free', sub: 'just me and the canvas' },
              ].map((opt) => (
                <div
                  key={opt.key}
                  onClick={() => setMode(opt.key)}
                  style={{
                    flex: 1,
                    padding: '28px 24px',
                    borderRadius: 'var(--radius-md)',
                    border: `${mode === opt.key ? 2 : 1}px solid ${
                      mode === opt.key ? 'var(--gold)' : 'var(--border)'
                    }`,
                    background:
                      mode === opt.key ? 'var(--gold-wash)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all var(--transition)',
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'Cinzel, serif',
                      fontSize: '18px',
                      color: 'var(--text)',
                      marginBottom: '8px',
                    }}
                  >
                    {opt.label}
                  </p>
                  <p
                    style={{
                      fontFamily: 'IM Fell English, serif',
                      fontStyle: 'italic',
                      fontSize: '19px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {opt.sub}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center pb-24">
          <button
            className="btn btn-primary"
            onClick={handleBegin}
            disabled={!isReady}
            style={{
              padding: '16px 48px',
              fontSize: '16px',
              opacity: isReady ? 1 : 0.4,
              transform: isReady ? 'scale(1)' : 'scale(0.98)',
              pointerEvents: isReady ? 'auto' : 'none',
              transition: 'all 0.4s ease',
            }}
          >
            Begin painting
          </button>
          {!isReady && (
            <p
              className="mt-6"
              style={{
                fontFamily: 'IM Fell English, serif',
                fontStyle: 'italic',
                color: 'var(--text-secondary)',
                fontSize: '16px',
              }}
            >
              Please select a word, a color, and a mode to begin.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}