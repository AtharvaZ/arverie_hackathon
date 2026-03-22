import { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import TopBar from '../components/TopBar'
import OrnamentalDivider from '../components/OrnamentalDivider'
import DrawingCanvas from '../components/DrawingCanvas'
import CanvasToolbar from '../components/CanvasToolbar'
import { useApp } from '../context/AppContext'

// ─── AI Companion Panel (UI only) ──────────────────────────────────────────

function AIPanel({ open, onToggle }) {
  const [input, setInput] = useState('')

  return (
    <div style={{ position: 'relative', display: 'flex', height: '100%' }}>
      {/* Slide tab */}
      <button
        onClick={onToggle}
        style={{
          position:     'absolute',
          left:         0,
          top:          '50%',
          transform:    'translateY(-50%)',
          width:        '28px',
          height:       '60px',
          background:   'rgba(245,235,208,0.95)',
          border:       '1px solid rgba(200,168,40,0.4)',
          borderRight:  'none',
          borderRadius: '6px 0 0 6px',
          cursor:       'pointer',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          zIndex:       20,
          marginLeft:   '-28px',
        }}
      >
        <svg
          width="7" height="12" viewBox="0 0 7 12" fill="none"
          style={{ transform: open ? 'rotate(0)' : 'rotate(180deg)', transition: 'transform 0.3s' }}
        >
          <path
            d="M5 1 L1 6 L5 11"
            stroke="#c8a828"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Panel body */}
      <motion.div
        animate={{ width: open ? 300 : 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 180 }}
        style={{
          height:      '100%',
          background:  'rgba(245,235,208,0.97)',
          borderLeft:  open ? '1px solid rgba(200,168,40,0.3)' : 'none',
          display:     'flex',
          flexDirection: 'column',
          overflow:    'hidden',
          flexShrink:  0,
        }}
      >
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                flex:           1,
                display:        'flex',
                flexDirection:  'column',
                padding:        '14px',
                overflow:       'hidden',
                minWidth:       '300px',
              }}
            >
              <OrnamentalDivider label="reflections" style={{ margin: '4px 0 14px' }} />

              {/* Message area */}
              <div style={{
                flex:          1,
                overflowY:     'auto',
                display:       'flex',
                flexDirection: 'column',
                alignItems:    'center',
                justifyContent:'center',
                gap:           '10px',
                paddingRight:  '4px',
              }}>
                <p style={{
                  fontFamily: 'IM Fell English, serif',
                  fontStyle:  'italic',
                  fontSize:   '16px',
                  lineHeight: 1.75,
                  color:      'rgba(80,55,30,0.55)',
                  textAlign:  'center',
                  padding:    '0 8px',
                }}>
                  I am here, watching what you create...
                </p>
                {/* TODO: Atharva wires AI responses here */}
              </div>

              {/* Input */}
              <div style={{
                display:   'flex',
                gap:       '8px',
                alignItems: 'center',
                borderTop: '1px solid rgba(160,130,60,0.2)',
                paddingTop: '10px',
                marginTop:  '8px',
              }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="respond..."
                  style={{
                    flex:        1,
                    fontFamily:  'IM Fell English, serif',
                    fontStyle:   'italic',
                    fontSize:    '16px',
                    color:       '#3d2b10',
                    background:  'transparent',
                    border:      '1px solid rgba(160,130,60,0.3)',
                    borderRadius:'6px',
                    padding:     '8px 12px',
                    outline:     'none',
                  }}
                />
                <button
                  className="btn"
                  style={{ padding: '7px 12px', fontSize: '14px', flexShrink: 0 }}
                >
                  send
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// ─── Paper grain SVG noise pattern ─────────────────────────────────────────

const GRAIN_BG = {
  background:    '#faf2de',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E")`,
  backgroundSize: '200px 200px',
}

// ─── CanvasPage ─────────────────────────────────────────────────────────────

export default function CanvasPage() {
  const navigate         = useNavigate()
  const { setSession } = useApp()

  // ── Tool state ──
  const [brush,   setBrush]   = useState('pencil')
  const [color,   setColor]   = useState('#1d1d1d')
  const [size,    setSize]    = useState(20)
  const [opacity, setOpacity] = useState(0.85)
  const [aiOpen,  setAiOpen]  = useState(false)

  // ── Canvas ref (exposes getDataURL) ──
  const canvasRef = useRef(null)

  // ── Behavioral data — stored silently in a ref, never displayed ──
  const behaviorData = useRef({
    strokes:        [],
    erasures:       [],
    colorChanges:   [],
    brushChanges:   [],
    opacityChanges: [],
    idleMoments:    [],
  })

  // ── Prev-value refs for change tracking ──
  const prevColor   = useRef(color)
  const prevBrush   = useRef(brush)
  const prevOpacity = useRef(opacity)

  // ── Idle detection (30 s of no pointer movement) ──
  const idleTimer = useRef(null)
  const idleStart = useRef(null)

  const resetIdleTimer = useCallback(() => {
    // Settle any open idle period
    if (idleStart.current !== null) {
      behaviorData.current.idleMoments.push({
        timestamp: idleStart.current,
        duration:  Date.now() - idleStart.current,
      })
      idleStart.current = null
    }
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => {
      idleStart.current = Date.now()
    }, 30_000)
  }, [])

  useEffect(() => () => clearTimeout(idleTimer.current), [])

  // ── Track color changes (record once per settled value) ──
  const colorRecordTimer = useRef(null)
  useEffect(() => {
    if (color === prevColor.current) return
    clearTimeout(colorRecordTimer.current)
    const from = prevColor.current
    colorRecordTimer.current = setTimeout(() => {
      behaviorData.current.colorChanges.push({ from, to: color, timestamp: Date.now() })
      prevColor.current = color
    }, 400)
    // Also update session.paintColors for SummaryPage
    setSession(s => {
      const last = s.paintColors[s.paintColors.length - 1]
      if (last === color) return s
      return { ...s, paintColors: [...s.paintColors, color] }
    })
  }, [color, setSession])

  // ── Track brush changes ──
  useEffect(() => {
    if (brush === prevBrush.current) return
    behaviorData.current.brushChanges.push({
      from:      prevBrush.current,
      to:        brush,
      timestamp: Date.now(),
    })
    prevBrush.current = brush
  }, [brush])

  // ── Sync --brush-size CSS variable for CustomCursor brush preview ──
  useEffect(() => {
    document.documentElement.style.setProperty('--brush-size', size + 'px')
  }, [size])

  // ── Track opacity changes (debounced) ──
  const opacityRecordTimer = useRef(null)
  useEffect(() => {
    if (opacity === prevOpacity.current) return
    clearTimeout(opacityRecordTimer.current)
    const from = prevOpacity.current
    opacityRecordTimer.current = setTimeout(() => {
      behaviorData.current.opacityChanges.push({ from, to: opacity, timestamp: Date.now() })
      prevOpacity.current = opacity
    }, 400)
  }, [opacity])

  // ── Stroke callback (called by DrawingCanvas on pointer-up) ──
  const handleStroke = useCallback((data) => {
    behaviorData.current.strokes.push(data)
  }, [])

  // ── Erase callback (called by DrawingCanvas during eraser moves) ──
  const handleErase = useCallback((data) => {
    behaviorData.current.erasures.push(data)
    // Keep session.erasureCount in sync
    setSession(s => ({ ...s, erasureCount: s.erasureCount + 1 }))
  }, [setSession])

  // ── Finish session ──
  async function handleFinish() {
    const dataURL = canvasRef.current?.getDataURL() ?? null

    // Flush any open idle period
    if (idleStart.current !== null) {
      behaviorData.current.idleMoments.push({
        timestamp: idleStart.current,
        duration:  Date.now() - idleStart.current,
      })
    }

    // Store in localStorage
    if (dataURL) localStorage.setItem('session.drawingDataURL', dataURL)
    localStorage.setItem('session.behaviorData', JSON.stringify(behaviorData.current))

    // Update session context so SummaryPage has the drawing
    setSession(s => ({ ...s, drawingDataURL: dataURL, endTime: Date.now() }))
    navigate('/summary')
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <TopBar
        style={{
          position:         'relative',
          height:           '64px',
          background:       'rgba(245,235,208,0.95)',
          backdropFilter:   'none',
          WebkitBackdropFilter: 'none',
          padding:          '0 24px',
          flexShrink:       0,
          borderBottom:     '1px solid rgba(200,168,40,0.25)',
        }}
      >
        <button
          className="btn"
          onClick={handleFinish}
          style={{ padding: '6px 18px', fontSize: '13px' }}
        >
          Finish Session
        </button>
      </TopBar>

      {/* Main row */}
      <div
        style={{ flex: 1, display: 'flex', overflow: 'hidden' }}
        onPointerMove={resetIdleTimer}
      >
        {/* Canvas column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Drawing area */}
          <div
            data-cursor="canvas"
            style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
          >
            {/* Parchment + grain background */}
            <div style={{ position: 'absolute', inset: 0, ...GRAIN_BG }} />
            {/* Drawing canvas on top */}
            <DrawingCanvas
              ref={canvasRef}
              brush={brush}
              color={color}
              size={size}
              opacity={opacity}
              onStroke={handleStroke}
              onErase={handleErase}
            />
          </div>

          {/* Toolbar at bottom of canvas column */}
          <CanvasToolbar
            brush={brush}     onBrushChange={setBrush}
            color={color}     onColorChange={setColor}
            size={size}       onSizeChange={setSize}
            opacity={opacity} onOpacityChange={setOpacity}
          />
        </div>

        {/* AI Companion Panel */}
        <AIPanel open={aiOpen} onToggle={() => setAiOpen(o => !o)} />
      </div>
    </div>
  )
}
