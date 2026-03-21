import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import TopBar from '../components/TopBar'
import OrnamentalDivider from '../components/OrnamentalDivider'
import { useApp } from '../context/AppContext'
import { api } from '../utils/api'

const FALLBACK =
  "You showed up today. That is enough. Whatever you carried here, you set it down long enough to let something move through your hands. The marks you made are yours — honest, unhurried, alive. There is a kind of courage in that."

function LoadingDots() {
  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', padding: '48px 0' }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, delay: i * 0.18, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: '9px', height: '9px',
            borderRadius: '50%',
            background: 'var(--gold)',
          }}
        />
      ))}
    </div>
  )
}

export default function SummaryPage() {
  const navigate = useNavigate()
  const { session, setReflection } = useApp()
  const [loading, setLoading] = useState(true)
  const [fullText, setFullText] = useState('')
  const [displayed, setDisplayed] = useState('')
  const [saved, setSaved] = useState(false)
  const intervalRef = useRef(null)

  const durationMin = session.startTime
    ? Math.round((Date.now() - session.startTime) / 60_000)
    : 41
  const dateStr = new Date()
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    .toUpperCase()

  // Fetch reflection
  useEffect(() => {
    api
      .reflection({
        mood: session.mood || 'present',
        moodColor: session.moodColor,
        guided: session.guided,
        duration: durationMin,
        erasureCount: session.erasureCount,
        paintColors: session.paintColors,
      })
      .then((res) => {
        const text = res.reflection || res.text || FALLBACK
        setFullText(text)
        setReflection(text)
      })
      .catch(() => {
        setFullText(FALLBACK)
        setReflection(FALLBACK)
      })
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line

  // Typewriter
  useEffect(() => {
    if (loading || !fullText) return
    setDisplayed('')
    let i = 0
    intervalRef.current = setInterval(() => {
      i++
      setDisplayed(fullText.slice(0, i))
      if (i >= fullText.length) clearInterval(intervalRef.current)
    }, 28)
    return () => clearInterval(intervalRef.current)
  }, [loading, fullText])

  async function handleSave() {
    await api.saveJournal({
      reflection: fullText,
      mood: session.mood,
      moodColor: session.moodColor,
      duration: durationMin,
      drawingDataURL: session.drawingDataURL,
      date: new Date().toISOString(),
    })
    setSaved(true)
    setTimeout(() => navigate('/'), 700)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: '52px' }}>
      <TopBar />
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 20px 80px' }}>
        <motion.div
          className="card"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{ maxWidth: '560px', width: '100%', padding: '28px', borderRadius: 'var(--radius-lg)' }}
        >
          {loading ? (
            <>
              <p
                style={{
                  fontFamily: 'Cinzel, serif',
                  fontSize: '10px',
                  letterSpacing: '0.15em',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                }}
              >
                REFLECTING ON YOUR SESSION
              </p>
              <LoadingDots />
            </>
          ) : (
            <>
              {/* Drawing frame */}
              <div
                className="drawing-frame"
                style={{
                  border: '1px solid rgba(160,120,60,0.3)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  marginBottom: '20px',
                }}
              >
                {session.drawingDataURL ? (
                  <img src={session.drawingDataURL} alt="Your painting" />
                ) : (
                  <div
                    style={{
                      height: '140px',
                      background: '#faf2de',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <p style={{ fontFamily: 'IM Fell English, serif', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '13px' }}>
                      your painting
                    </p>
                  </div>
                )}
              </div>

              <OrnamentalDivider label="reflection" />

              {/* Typewriter text */}
              <div style={{ margin: '16px 0 12px' }}>
                <p
                  style={{
                    fontFamily: 'IM Fell English, serif',
                    fontStyle: 'italic',
                    fontSize: '15px',
                    lineHeight: 1.8,
                    color: 'var(--text)',
                    opacity: 0.78,
                  }}
                >
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '20px', lineHeight: 0, verticalAlign: '-5px', opacity: 0.35 }}>"</span>
                  {displayed}
                  {displayed.length < fullText.length && (
                    <span className="cursor-blink">|</span>
                  )}
                  {displayed.length >= fullText.length && fullText.length > 0 && (
                    <span style={{ fontFamily: 'Georgia, serif', fontSize: '20px', lineHeight: 0, verticalAlign: '-5px', opacity: 0.35 }}>"</span>
                  )}
                </p>
              </div>

              {/* Metadata */}
              <div
                style={{
                  fontFamily: 'Cinzel, serif',
                  fontSize: '9px',
                  letterSpacing: '0.15em',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '16px',
                  marginBottom: '22px',
                }}
              >
                {session.moodColor && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px', height: '8px',
                      borderRadius: '50%',
                      background: session.moodColor,
                      flexShrink: 0,
                    }}
                  />
                )}
                {dateStr} · {durationMin} min · {(session.mood || 'present').toUpperCase()}
              </div>

              <OrnamentalDivider />

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
                <button
                  className="btn btn-primary"
                  disabled={saved}
                  onClick={handleSave}
                  style={{ padding: '10px 28px' }}
                >
                  {saved ? 'Saved ✓' : 'Save to journal'}
                </button>
                <button
                  className="btn"
                  onClick={() => navigate('/session')}
                  style={{ padding: '10px 28px' }}
                >
                  Paint again
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
