import { useRef, useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import TopBar from '../components/TopBar'
import OrnamentalDivider from '../components/OrnamentalDivider'
import { useApp } from '../context/AppContext'
import { useCanvasBehavior } from '../hooks/useCanvasBehavior'
import { api } from '../utils/api'

/* ─── Brush SVG icons ─── */
function WatercolorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <ellipse cx="8" cy="10" rx="5" ry="4" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <path d="M6 7 C6 5 7 3 8 2 C9 3 10 5 10 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M5 9 Q4 11 5 12" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
    </svg>
  )
}
function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M11 2 L14 5 L5 14 L2 14 L2 11 L11 2 Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
      <path d="M9 4 L12 7" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}
function GlowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2 L9 6 L13 6 L10 9 L11 13 L8 11 L5 13 L6 9 L3 6 L7 6 Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
    </svg>
  )
}
function EraserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="8" width="12" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <path d="M8 8 L8 14" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    </svg>
  )
}

const BRUSHES = [
  { id: 'watercolor', label: 'Watercolor', Icon: WatercolorIcon },
  { id: 'pencil', label: 'Pencil', Icon: PencilIcon },
  { id: 'glow', label: 'Glow Pen', Icon: GlowIcon },
  { id: 'eraser', label: 'Eraser', Icon: EraserIcon },
]

const SWATCHES = [
  '#2d4a3e', '#7a3b2e', '#3b4f7a', '#6b3d7a',
  '#b07a3a', '#4a6b4a', '#8a7a6a', '#1a1a2e',
]

/* ─── AI companion panel ─── */
function AIPanel({ open, onToggle, messages, onSend }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  function send() {
    if (!input.trim()) return
    onSend(input.trim())
    setInput('')
  }

  return (
    <div style={{ position: 'relative', display: 'flex', height: '100%' }}>
      {/* Toggle tab — always visible */}
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          left: open ? 0 : 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: '28px',
          height: '60px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-gold)',
          borderRight: 'none',
          borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
          marginLeft: open ? '-28px' : '-28px',
        }}
      >
        <svg
          width="7"
          height="12"
          viewBox="0 0 7 12"
          fill="none"
          style={{ transform: open ? 'rotate(0)' : 'rotate(180deg)', transition: 'transform 0.3s' }}
        >
          <path d="M5 1 L1 6 L5 11" stroke="var(--gold)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Panel body */}
      <motion.div
        animate={{ width: open ? 300 : 16 }}
        transition={{ type: 'spring', damping: 22, stiffness: 180 }}
        style={{
          height: '100%',
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border-gold)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px', overflow: 'hidden' }}
            >
              <OrnamentalDivider label="reflections" style={{ margin: '4px 0 12px' }} />

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                {messages.length === 0 && (
                  <p style={{ fontFamily: 'IM Fell English, serif', fontStyle: 'italic', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '24px' }}>
                    I'm here, watching what you create...
                  </p>
                )}
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '92%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: msg.role === 'assistant'
                        ? 'rgba(200,160,40,0.06)'
                        : 'rgba(200,160,40,0.1)',
                    }}
                  >
                    <p style={{ fontFamily: 'IM Fell English, serif', fontStyle: 'italic', fontSize: '13px', lineHeight: 1.7, color: 'var(--text)' }}>
                      {msg.content}
                    </p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '8px' }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="respond..."
                  style={{
                    flex: 1,
                    fontFamily: 'IM Fell English, serif',
                    fontStyle: 'italic',
                    fontSize: '13px',
                    color: 'var(--text)',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 12px',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={send}
                  className="btn"
                  style={{ padding: '7px 12px', fontSize: '9px', flexShrink: 0 }}
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

/* ─── CanvasPage ─── */
export default function CanvasPage() {
  const navigate = useNavigate()
  const { session, setSession } = useApp()

  const mainCanvasRef = useRef(null)
  const glowCanvasRef = useRef(null)
  const isDrawing = useRef(false)
  const lastPos = useRef(null)
  const brushRef = useRef('watercolor')
  const colorRef = useRef('#2d4a3e')
  const sizeRef = useRef(14)

  const [brush, setBrushState] = useState('watercolor')
  const [color, setColorState] = useState('#2d4a3e')
  const [size, setSizeState] = useState(14)
  const [aiOpen, setAiOpen] = useState(false)
  const [messages, setMessages] = useState([])

  // Keep refs in sync
  const setBrush = useCallback((v) => { brushRef.current = v; setBrushState(v) }, [])
  const setColor = useCallback((v) => { colorRef.current = v; setColorState(v) }, [])
  const setSize = useCallback((v) => { sizeRef.current = v; setSizeState(v) }, [])

  const { resetIdle, recordColor, recordErasure } = useCanvasBehavior({
    onIdleSignal: () => {
      if (session.guided) {
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: 'Take your time... what feels unfinished right now?' },
        ])
        if (!aiOpen) setAiOpen(true)
      }
    },
  })

  // Canvas resize
  useEffect(() => {
    const resize = () => {
      const main = mainCanvasRef.current
      const glow = glowCanvasRef.current
      if (!main || !glow) return
      const parent = main.parentElement
      const w = parent.clientWidth
      const h = parent.clientHeight
      // Preserve existing drawing
      const tmpMain = document.createElement('canvas')
      tmpMain.width = main.width; tmpMain.height = main.height
      tmpMain.getContext('2d').drawImage(main, 0, 0)
      const tmpGlow = document.createElement('canvas')
      tmpGlow.width = glow.width; tmpGlow.height = glow.height
      tmpGlow.getContext('2d').drawImage(glow, 0, 0)

      main.width = w; main.height = h
      glow.width = w; glow.height = h
      main.getContext('2d').drawImage(tmpMain, 0, 0)
      glow.getContext('2d').drawImage(tmpGlow, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // ─── Drawing functions ───
  const getPos = useCallback((e) => {
    const canvas = mainCanvasRef.current
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches?.[0]
    return {
      x: ((touch?.clientX ?? e.clientX) - rect.left) * (canvas.width / rect.width),
      y: ((touch?.clientY ?? e.clientY) - rect.top) * (canvas.height / rect.height),
    }
  }, [])

  const lerp = (a, b, t) => a + (b - a) * t

  const paintAt = useCallback((x, y) => {
    const ctx = mainCanvasRef.current?.getContext('2d')
    const gCtx = glowCanvasRef.current?.getContext('2d')
    if (!ctx || !gCtx) return
    const b = brushRef.current
    const col = colorRef.current
    const sz = sizeRef.current
    const lp = lastPos.current

    if (b === 'watercolor') {
      // Interpolate points between lastPos and current
      const steps = lp ? Math.ceil(Math.hypot(x - lp.x, y - lp.y) / (sz * 0.4)) + 1 : 1
      for (let s = 0; s < steps; s++) {
        const tx = lp ? lerp(lp.x, x, s / steps) : x
        const ty = lp ? lerp(lp.y, y, s / steps) : y
        // Scatter 4 radial gradient blobs
        for (let i = 0; i < 4; i++) {
          const jx = tx + (Math.random() - 0.5) * sz * 0.7
          const jy = ty + (Math.random() - 0.5) * sz * 0.7
          const r = sz * 0.5 + Math.random() * sz * 0.7
          const alpha = 0.04 + Math.random() * 0.05
          const grad = ctx.createRadialGradient(jx, jy, 0, jx, jy, r)
          grad.addColorStop(0, hexToRgba(col, alpha))
          grad.addColorStop(1, hexToRgba(col, 0))
          ctx.fillStyle = grad
          ctx.beginPath(); ctx.arc(jx, jy, r, 0, Math.PI * 2); ctx.fill()
        }
        // Core blob
        ctx.globalAlpha = 0.12
        ctx.fillStyle = col
        ctx.beginPath(); ctx.arc(tx, ty, sz * 0.3, 0, Math.PI * 2); ctx.fill()
        ctx.globalAlpha = 1
        // Glow layer
        const gGrad = gCtx.createRadialGradient(tx, ty, 0, tx, ty, sz * 1.2)
        gGrad.addColorStop(0, hexToRgba(col, 0.2))
        gGrad.addColorStop(1, hexToRgba(col, 0))
        gCtx.fillStyle = gGrad
        gCtx.beginPath(); gCtx.arc(tx, ty, sz * 1.2, 0, Math.PI * 2); gCtx.fill()
      }
    } else if (b === 'pencil') {
      if (lp) {
        const steps = Math.ceil(Math.hypot(x - lp.x, y - lp.y) / 2) + 1
        for (let s = 0; s < steps; s++) {
          const tx = lerp(lp.x, x, s / steps)
          const ty = lerp(lp.y, y, s / steps)
          ctx.globalAlpha = 0.75
          ctx.strokeStyle = col
          ctx.lineWidth = sz * 0.35
          ctx.lineCap = 'round'
          ctx.beginPath(); ctx.moveTo(lp.x, lp.y); ctx.lineTo(tx, ty); ctx.stroke()
          // Grain scatter
          for (let g = 0; g < 3; g++) {
            ctx.globalAlpha = 0.1 + Math.random() * 0.15
            ctx.fillStyle = col
            ctx.beginPath()
            ctx.arc(tx + (Math.random() - 0.5) * sz * 0.6, ty + (Math.random() - 0.5) * sz * 0.6, Math.random() * 0.8, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.globalAlpha = 1
        }
      }
    } else if (b === 'glow') {
      // Glow pen — main paint on glowCanvas
      for (let i = 0; i < 3; i++) {
        const gGrad = gCtx.createRadialGradient(x, y, 0, x, y, sz * 1.6)
        gGrad.addColorStop(0, hexToRgba(col, 0.25))
        gGrad.addColorStop(1, hexToRgba(col, 0))
        gCtx.fillStyle = gGrad
        gCtx.beginPath(); gCtx.arc(x, y, sz * 1.6, 0, Math.PI * 2); gCtx.fill()
      }
      // Thin main stroke
      if (lp) {
        ctx.globalAlpha = 0.18
        ctx.strokeStyle = col
        ctx.lineWidth = sz * 0.2
        ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(lp.x, lp.y); ctx.lineTo(x, y); ctx.stroke()
        ctx.globalAlpha = 1
      }
    } else if (b === 'eraser') {
      const prev = ctx.globalCompositeOperation
      ctx.globalCompositeOperation = 'destination-out'
      const grad = ctx.createRadialGradient(x, y, 0, x, y, sz * 1.4)
      grad.addColorStop(0, 'rgba(0,0,0,0.35)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.beginPath(); ctx.arc(x, y, sz * 1.4, 0, Math.PI * 2); ctx.fill()
      ctx.globalCompositeOperation = prev

      const prevG = gCtx.globalCompositeOperation
      gCtx.globalCompositeOperation = 'destination-out'
      gCtx.fillStyle = 'rgba(0,0,0,0.35)'
      gCtx.beginPath(); gCtx.arc(x, y, sz * 1.4, 0, Math.PI * 2); gCtx.fill()
      gCtx.globalCompositeOperation = prevG

      recordErasure()
    }
  }, [recordErasure])

  const onDown = useCallback((e) => {
    e.preventDefault()
    isDrawing.current = true
    const pos = getPos(e)
    lastPos.current = pos
    paintAt(pos.x, pos.y)
    resetIdle()
    if (brushRef.current !== 'eraser') recordColor(colorRef.current)
  }, [getPos, paintAt, resetIdle, recordColor])

  const onMove = useCallback((e) => {
    e.preventDefault()
    if (!isDrawing.current) return
    const pos = getPos(e)
    paintAt(pos.x, pos.y)
    lastPos.current = pos
    resetIdle()
  }, [getPos, paintAt, resetIdle])

  const onUp = useCallback(() => {
    isDrawing.current = false
    lastPos.current = null
  }, [])

  // Track color changes
  useEffect(() => {
    if (brush !== 'eraser') recordColor(color)
  }, [color]) // eslint-disable-line

  async function handleSendMessage(text) {
    const msgs = [...messages, { role: 'user', content: text }]
    setMessages(msgs)
    const res = await api.chat({ messages: msgs, session: { mood: session.mood, guided: session.guided } })
    setMessages([...msgs, { role: 'assistant', content: res.reply || res.content || '...' }])
  }

  function handleFinish() {
    // Merge canvases
    const main = mainCanvasRef.current
    const glow = glowCanvasRef.current
    if (!main) { navigate('/summary'); return }
    const merged = document.createElement('canvas')
    merged.width = main.width; merged.height = main.height
    const ctx = merged.getContext('2d')
    ctx.fillStyle = '#faf2de'
    ctx.fillRect(0, 0, merged.width, merged.height)
    ctx.drawImage(main, 0, 0)
    if (glow) {
      ctx.globalCompositeOperation = 'overlay'
      ctx.globalAlpha = 0.55
      ctx.drawImage(glow, 0, 0)
    }
    setSession((s) => ({ ...s, drawingDataURL: merged.toDataURL('image/png'), endTime: Date.now() }))
    navigate('/summary')
  }

  return (
    <div className="canvas-layout">
      {/* Top bar */}
      <div
        style={{
          height: '48px',
          background: 'rgba(242,232,213,0.92)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: '15px', color: '#1a3a30', letterSpacing: '0.12em' }}>
          Arverié
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <TopBar style={{ position: 'static', height: 'auto', background: 'none', border: 'none', padding: 0, backdropFilter: 'none' }}>
            <button className="btn" onClick={handleFinish} style={{ padding: '6px 16px' }}>
              Finish session
            </button>
          </TopBar>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Drawing area */}
        <div style={{ flex: 1, position: 'relative', background: '#faf2de' }}>
          <canvas
            ref={mainCanvasRef}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: brush === 'eraser' ? 'cell' : 'crosshair', touchAction: 'none' }}
            onMouseDown={onDown}
            onMouseMove={onMove}
            onMouseUp={onUp}
            onMouseLeave={onUp}
            onTouchStart={onDown}
            onTouchMove={onMove}
            onTouchEnd={onUp}
          />
          <canvas
            ref={glowCanvasRef}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              mixBlendMode: 'overlay', opacity: 0.55, pointerEvents: 'none',
            }}
          />
        </div>

        {/* AI panel */}
        <AIPanel
          open={aiOpen}
          onToggle={() => setAiOpen((o) => !o)}
          messages={messages}
          onSend={handleSendMessage}
        />
      </div>

      {/* Bottom toolbar */}
      <div
        style={{
          height: '56px',
          background: 'rgba(242,232,213,0.95)',
          borderTop: '1px solid var(--border)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        {/* Brushes */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {BRUSHES.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setBrush(id)}
              title={label}
              style={{
                width: '36px', height: '36px',
                borderRadius: '50%',
                border: `${brush === id ? 1.5 : 1}px solid ${brush === id ? 'var(--gold)' : 'var(--border)'}`,
                background: brush === id ? 'var(--gold-wash)' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1px',
                color: brush === id ? 'var(--gold)' : 'var(--text-secondary)',
                transition: 'all var(--transition)',
              }}
            >
              <Icon />
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: '6px', letterSpacing: '0.04em' }}>{label.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        <div style={{ width: '1px', height: '30px', background: 'var(--border)' }} />

        {/* Size slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: '8px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>size</span>
          <input
            type="range"
            className="brush-slider"
            min={2} max={42}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
        </div>

        <div style={{ width: '1px', height: '30px', background: 'var(--border)' }} />

        {/* Color swatches */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {SWATCHES.map((c) => (
            <div
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: '24px', height: '24px',
                borderRadius: '50%',
                background: c,
                cursor: 'pointer',
                boxShadow:
                  color === c
                    ? '0 0 0 2.5px white, 0 0 0 4px var(--gold)'
                    : '0 1px 3px rgba(0,0,0,0.2)',
                transition: 'box-shadow 0.2s',
                flexShrink: 0,
              }}
            />
          ))}
          {/* Custom color */}
          <label style={{ cursor: 'pointer', flexShrink: 0 }}>
            <div
              style={{
                width: '24px', height: '24px',
                borderRadius: '50%',
                background: 'conic-gradient(red,orange,yellow,green,blue,violet,red)',
                border: '1px solid var(--border)',
              }}
            />
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
            />
          </label>
        </div>
      </div>
    </div>
  )
}

/* ─── Hex → rgba helper ─── */
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
