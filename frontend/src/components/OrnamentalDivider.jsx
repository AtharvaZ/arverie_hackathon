export default function OrnamentalDivider({ label, style }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        margin: '10px 0',
        ...style,
      }}
    >
      <div style={{ flex: 1, height: '1px', background: 'var(--border-gold)' }} />
      <div
        style={{
          width: '5px', height: '5px',
          background: 'var(--gold-muted)',
          transform: 'rotate(45deg)',
          flexShrink: 0,
        }}
      />
      {label && (
        <>
          <span
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '8px',
              letterSpacing: '0.18em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </span>
          <div
            style={{
              width: '5px', height: '5px',
              background: 'var(--gold-muted)',
              transform: 'rotate(45deg)',
              flexShrink: 0,
            }}
          />
        </>
      )}
      <div style={{ flex: 1, height: '1px', background: 'var(--border-gold)' }} />
    </div>
  )
}
