import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import TopBar from '../components/TopBar'
import OrnamentalDivider from '../components/OrnamentalDivider'
import { useApp } from '../context/AppContext'
import { api } from '../utils/api'

const FALLBACK_LETTER =
  'You showed up today. That is enough. Whatever you carried here, you set it down long enough to let something move through your hands. The marks you made are yours — honest, unhurried, alive. There is a kind of courage in that.'

const FALLBACK_QUESTIONS = [
  'How do you feel after creating this?',
  'What comes to mind when looking at it now?',
  'Is there anything that surprised you while drawing?',
]

function LoadingDots() {
  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', padding: '48px 0' }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, delay: i * 0.18, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'var(--gold)' }}
        />
      ))}
    </div>
  )
}

export default function SummaryPage() {
  const navigate = useNavigate()
  const { session, setSession, resetSession } = useApp()

  // stages: 'questions' | 'loading' | 'letter'
  const [stage, setStage]     = useState('questions')
  const [answers, setAnswers] = useState([])
  const [moodOut, setMoodOut] = useState('')

  const [fullText, setFullText]     = useState('')
  const [displayed, setDisplayed]   = useState('')
  const intervalRef = useRef(null)

  const questions = session.reflectionQuestions?.length > 0
    ? session.reflectionQuestions
    : FALLBACK_QUESTIONS

  // Initialize answers array when questions are known
  useEffect(() => {
    setAnswers(Array(questions.length).fill(''))
  }, [questions.length])

  const durationSec = session.startTime
    ? Math.round(((session.endTime || Date.now()) - session.startTime) / 1000)
    : 0
  const durationMin = Math.max(1, Math.round(durationSec / 60))

  const colorsUsed = session.paintColors?.length > 0
    ? Array.from(new Set(session.paintColors)).slice(0, 5)
    : ['#2d4a3e', '#7a3b2e', '#b07a3a']

  // Typewriter effect
  useEffect(() => {
    if (stage === 'letter' && fullText) {
      setDisplayed('')
      let i = 0
      intervalRef.current = setInterval(() => {
        i++
        setDisplayed(fullText.slice(0, i))
        if (i >= fullText.length) clearInterval(intervalRef.current)
      }, 28)
      return () => clearInterval(intervalRef.current)
    }
  }, [stage, fullText])

  async function handleGenerateLetter() {
    setStage('loading')
    try {
      const fullSessionData = {
        canvas_summary: session.canvasSummary || {},
        vision_description: session.visionDescription || '',
        dialogue_history: session.dialogueHistory || [],
        reflection_questions: questions,
        drawing_url: session.drawingUrl || '',
        intake_themes: session.themes || [],
      }

      let letter = FALLBACK_LETTER

      if (session.sessionId && session.userId) {
        const res = await api.completeSession(session.sessionId, session.userId, {
          moodCheckout: moodOut.trim() || session.mood || '',
          userAnswers: answers,
          durationSeconds: durationSec,
          fullSessionData,
        })
        letter = res.letter || FALLBACK_LETTER
      }

      setFullText(letter)
      setSession((s) => ({ ...s, letter }))
    } catch (err) {
      console.error('[SummaryPage] completeSession failed:', err)
      setFullText(FALLBACK_LETTER)
    } finally {
      setStage('letter')
    }
  }

  function handleClose() {
    resetSession()
    navigate('/')
  }

  const allAnswered = answers.length > 0 && answers.every((a) => a.trim().length > 0)

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      paddingTop: '52px', display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <TopBar />

      <div style={{
        width: '100%', maxWidth: '600px',
        padding: '48px 20px 80px', flex: 1, display: 'flex', flexDirection: 'column',
      }}>

        {/* Drawing preview */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{
            fontFamily: 'IM Fell English, serif', fontSize: '24px',
            fontStyle: 'italic', marginBottom: '16px', color: 'var(--text)',
          }}>
            Your Canvas
          </h2>
          <div style={{
            border: '1px solid rgba(160,120,60,0.3)', borderRadius: '8px',
            overflow: 'hidden', background: '#faf2de',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)', minHeight: '200px',
          }}>
            {session.drawingDataURL ? (
              <img
                src={session.drawingDataURL}
                alt="Your painting"
                style={{ width: '100%', display: 'block' }}
              />
            ) : (
              <p style={{
                fontFamily: 'IM Fell English, serif', fontStyle: 'italic',
                color: 'var(--text-muted)',
              }}>
                your painting
              </p>
            )}
          </div>

          {/* Colors used */}
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{
              fontFamily: 'Cinzel, serif', fontSize: '10px',
              letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: '8px',
            }}>
              COLORS EXPLORED
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {colorsUsed.map((c, i) => (
                <div key={i} style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: c, border: '1px solid var(--border)',
                }} />
              ))}
            </div>
          </div>

          {/* Session stats */}
          <p style={{
            fontFamily: 'Cinzel, serif', fontSize: '10px',
            letterSpacing: '0.12em', color: 'var(--text-muted)',
            marginTop: '12px',
          }}>
            {durationMin} MIN · {session.erasureCount || 0} ERASURES
          </p>
        </div>

        <OrnamentalDivider />

        <div style={{
          marginTop: '32px', flex: 1, display: 'flex',
          flexDirection: 'column', justifyContent: 'center',
        }}>
          <AnimatePresence mode="wait">

            {/* Questions stage */}
            {stage === 'questions' && (
              <motion.div
                key="questions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={{ width: '100%' }}
              >
                <div className="card" style={{ padding: '32px' }}>
                  <h3 style={{
                    fontFamily: 'Cinzel, serif', fontSize: '12px',
                    letterSpacing: '0.15em', color: 'var(--text-muted)',
                    textAlign: 'center', marginBottom: '24px',
                  }}>
                    BEFORE WE CLOSE...
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
                    {questions.map((q, i) => (
                      <div key={i}>
                        <p style={{
                          fontFamily: 'IM Fell English, serif', fontStyle: 'italic',
                          fontSize: '18px', color: 'var(--text)', marginBottom: '8px',
                        }}>
                          {q}
                        </p>
                        <input
                          value={answers[i] ?? ''}
                          onChange={(e) => {
                            const next = [...answers]
                            next[i] = e.target.value
                            setAnswers(next)
                          }}
                          placeholder="It feels..."
                          style={{
                            width: '100%', background: 'transparent', border: 'none',
                            borderBottom: '1px solid var(--border-gold)',
                            padding: '8px 0', outline: 'none',
                            fontFamily: 'IM Fell English, serif',
                            color: 'var(--text)', fontSize: '15px',
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Mood checkout */}
                  <div style={{ marginBottom: '28px' }}>
                    <p style={{
                      fontFamily: 'IM Fell English, serif', fontStyle: 'italic',
                      fontSize: '17px', color: 'var(--text)', marginBottom: '8px',
                    }}>
                      How are you leaving today?
                    </p>
                    <input
                      value={moodOut}
                      onChange={(e) => setMoodOut(e.target.value)}
                      placeholder="a word for now..."
                      style={{
                        width: '100%', background: 'transparent', border: 'none',
                        borderBottom: '1px solid var(--border-gold)',
                        padding: '8px 0', outline: 'none',
                        fontFamily: 'IM Fell English, serif',
                        color: 'var(--text)', fontSize: '15px',
                      }}
                    />
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <button
                      className="btn btn-primary"
                      disabled={!allAnswered}
                      onClick={handleGenerateLetter}
                      style={{ padding: '12px 32px', opacity: allAnswered ? 1 : 0.4 }}
                    >
                      Receive your letter
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Loading stage */}
            {stage === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ textAlign: 'center', padding: '40px 0' }}
              >
                <p style={{
                  fontFamily: 'Cinzel, serif', fontSize: '10px',
                  letterSpacing: '0.15em', color: 'var(--text-muted)',
                }}>
                  COMPOSING YOUR LETTER
                </p>
                <LoadingDots />
              </motion.div>
            )}

            {/* Letter stage */}
            {stage === 'letter' && (
              <motion.div
                key="letter"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
                style={{ padding: '32px' }}
              >
                <h3 style={{
                  fontFamily: 'Cinzel, serif', fontSize: '12px',
                  letterSpacing: '0.15em', color: 'var(--text-muted)',
                  textAlign: 'center', marginBottom: '24px',
                }}>
                  A RECORD OF YOUR TIME
                </h3>

                <div style={{ marginBottom: '24px' }}>
                  <p style={{
                    fontFamily: 'IM Fell English, serif', fontStyle: 'italic',
                    fontSize: '16px', lineHeight: 1.8, color: 'var(--text)', opacity: 0.85,
                  }}>
                    <span style={{
                      fontFamily: 'Georgia, serif', fontSize: '20px',
                      lineHeight: 0, verticalAlign: '-5px', opacity: 0.35,
                    }}>
                      "
                    </span>
                    {displayed}
                    {displayed.length >= fullText.length && (
                      <span style={{
                        fontFamily: 'Georgia, serif', fontSize: '20px',
                        lineHeight: 0, verticalAlign: '-5px', opacity: 0.35,
                      }}>
                        "
                      </span>
                    )}
                  </p>
                </div>

                {displayed.length >= fullText.length && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    style={{ textAlign: 'center' }}
                  >
                    <button
                      className="btn"
                      onClick={handleClose}
                      style={{ padding: '10px 24px' }}
                    >
                      Close Journal
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
