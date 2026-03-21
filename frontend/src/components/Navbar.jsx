import React from 'react'
import { useApp } from '../context/AppContext'
import { motion } from 'framer-motion'

// Heartbeat EKG SVG that morphs between active and flat line
function HeartbeatSVG({ active }) {
  return (
    <svg
      width="80"
      height="28"
      viewBox="0 0 80 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ cursor: 'pointer' }}
    >
      <motion.path
        d={
          active
            ? 'M0 14 L14 14 L18 4 L22 24 L26 8 L30 20 L34 14 L80 14'
            : 'M0 14 L80 14'
        }
        stroke="var(--gold)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        animate={{
          d: active
            ? 'M0 14 L14 14 L18 4 L22 24 L26 8 L30 20 L34 14 L80 14'
            : 'M0 14 L80 14',
        }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        className={active ? 'ekg-path' : ''}
        style={
          active
            ? {
                strokeDasharray: 140,
                strokeDashoffset: 0,
                animation: 'ekg-pulse 2s ease-in-out infinite',
              }
            : {}
        }
      />
    </svg>
  )
}

export default function Navbar({ rightContent }) {
  const { soundOn, setSoundOn } = useApp()

  return (
    <nav
      style={{
        height: '48px',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'relative',
        zIndex: 10,
      }}
    >
      <span
        style={{
          fontFamily: 'Cinzel, serif',
          fontSize: '16px',
          letterSpacing: '0.15em',
          color: 'var(--text)',
        }}
      >
        Arverié
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          onClick={() => setSoundOn((s) => !s)}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          title={soundOn ? 'Mute' : 'Unmute'}
        >
          <HeartbeatSVG active={soundOn} />
        </div>
        {rightContent}
      </div>
    </nav>
  )
}
