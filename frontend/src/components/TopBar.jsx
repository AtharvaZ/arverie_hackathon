import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const EKG_PATH = 'M0,8 L6,8 L9,2 L12,14 L15,5 L18,11 L21,8 L48,8'
const FLAT_PATH = 'M0,8 L48,8'

export default function TopBar({ style, children }) {
  const { soundOn, setSoundOn } = useApp()
  const navigate = useNavigate()

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 50,
        height: '64px',
        background: 'rgba(242,232,213,0.88)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 28px',
        ...style,
      }}
    >
      {/* Wordmark — navigates to homepage */}
      <button
        onClick={() => navigate('/')}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          fontFamily: 'Cinzel, serif',
          fontSize: '19px',
          color: '#1a3a30',
          letterSpacing: '0.14em',
          fontWeight: 500,
        }}
      >
        Arverié
      </button>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        {/* Sound toggle */}
        <button
          onClick={() => setSoundOn((s) => !s)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 0',
          }}
          aria-label={soundOn ? 'Mute ambient' : 'Enable ambient'}
        >
          <svg
            width="68"
            height="24"
            viewBox="0 0 48 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <motion.path
              animate={{ d: soundOn ? EKG_PATH : FLAT_PATH }}
              transition={{ duration: 0.55, ease: 'easeInOut' }}
              stroke="var(--gold)"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <span
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '11px',
              color: 'var(--gold)',
              letterSpacing: '0.12em',
              opacity: 0.85,
              width: '46px',
              textAlign: 'left',
            }}
          >
            {soundOn ? 'ambient' : 'silent'}
          </span>
        </button>

        {children}
      </div>
    </div>
  )
}
