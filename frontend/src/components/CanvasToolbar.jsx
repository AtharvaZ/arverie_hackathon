import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { HexColorPicker } from 'react-colorful'

// ─── Brush Icons (18×18 SVG) ───────────────────────────────────────────────

function IconWatercolor({ active }) {
  const c = active ? '#b08c1a' : '#6b5533'
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill={c} stroke="none">
      <circle cx="6"  cy="9"  r="5" opacity="0.55" />
      <circle cx="12" cy="9"  r="5" opacity="0.55" />
      <circle cx="9"  cy="13" r="4" opacity="0.55" />
    </svg>
  )
}

function IconPencil({ active }) {
  const c = active ? '#b08c1a' : '#6b5533'
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="14" x2="13" y2="4" />
      <polygon points="13,4 16,3 16,6 13,6" fill={c} stroke="none" />
      <line x1="4" y1="14" x2="2" y2="16" />
    </svg>
  )
}

function IconInk({ active }) {
  const c = active ? '#b08c1a' : '#6b5533'
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill={c} stroke="none">
      <path d="M9 2 C9 2 15 9 15 13 C15 16 12.3 17.5 9 17.5 C5.7 17.5 3 16 3 13 C3 9 9 2 9 2 Z" />
    </svg>
  )
}

function IconSmudge({ active }) {
  const c = active ? '#b08c1a' : '#6b5533'
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round">
      <path d="M2 13 Q5 5 10 7 Q15 9 16 12" />
      <circle cx="16" cy="12" r="1.5" fill={c} stroke="none" />
    </svg>
  )
}

function IconBlur({ active }) {
  const c = active ? '#b08c1a' : '#6b5533'
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={c} strokeLinecap="round">
      <circle cx="9" cy="9" r="7" strokeWidth="1"   opacity="0.25" />
      <circle cx="9" cy="9" r="5" strokeWidth="1.4" opacity="0.5"  />
      <circle cx="9" cy="9" r="3" strokeWidth="1.8" opacity="0.85" />
    </svg>
  )
}

function IconEraser({ active }) {
  const c = active ? '#b08c1a' : '#6b5533'
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="6" width="15" height="8" rx="2" />
      <line x1="1.5" y1="10" x2="16.5" y2="10" opacity="0.45" />
    </svg>
  )
}

const BRUSHES = [
  { id: 'watercolor', label: 'Watercolor', Icon: IconWatercolor },
  { id: 'pencil',     label: 'Pencil',     Icon: IconPencil     },
  { id: 'ink',        label: 'Ink',        Icon: IconInk        },
  { id: 'smudge',     label: 'Smudge',     Icon: IconSmudge     },
  { id: 'blur',       label: 'Blur',       Icon: IconBlur       },
  { id: 'eraser',     label: 'Eraser',     Icon: IconEraser     },
]

// ─── Slider ────────────────────────────────────────────────────────────────

function LabeledSlider({ label, value, min, max, step, onChange, display }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
      <span style={{
        fontFamily: 'Cinzel, serif',
        fontSize: '9px',
        letterSpacing: '0.14em',
        color: '#9a7c45',
        textTransform: 'uppercase',
      }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
        <input
          type="range"
          className="arverie-slider"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ width: '110px' }}
        />
        <span style={{
          fontFamily: 'Cinzel, serif',
          fontSize: '10px',
          color: '#6b5533',
          minWidth: '28px',
          textAlign: 'right',
        }}>
          {display(value)}
        </span>
      </div>
    </div>
  )
}

// ─── Main Toolbar ──────────────────────────────────────────────────────────

export default function CanvasToolbar({
  brush, onBrushChange,
  color, onColorChange,
  size,  onSizeChange,
  opacity, onOpacityChange,
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerPos, setPickerPos]   = useState({ bottom: 0, left: 0 })
  const swatchRef = useRef(null)

  const handleSwatchClick = () => {
    if (!pickerOpen && swatchRef.current) {
      const rect = swatchRef.current.getBoundingClientRect()
      setPickerPos({ bottom: window.innerHeight - rect.top + 8, left: rect.left })
    }
    setPickerOpen(o => !o)
  }

  return (
    <>
      {/* Slider global styles */}
      <style>{`
        .arverie-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 3px;
          background: linear-gradient(to right, #c8a828 0%, #c8a828 ${((size - 1) / 99) * 100}%, rgba(160,130,60,0.25) ${((size - 1) / 99) * 100}%, rgba(160,130,60,0.25) 100%);
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }
        .arverie-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 13px;
          height: 13px;
          border-radius: 50%;
          background: #c8a828;
          border: 2px solid rgba(250,242,222,0.9);
          box-shadow: 0 1px 4px rgba(0,0,0,0.25);
          cursor: pointer;
        }
        .arverie-slider::-moz-range-thumb {
          width: 13px;
          height: 13px;
          border-radius: 50%;
          background: #c8a828;
          border: 2px solid rgba(250,242,222,0.9);
          cursor: pointer;
        }
      `}</style>

      {/* Color picker popup — portalled to body so overflow:hidden ancestors can't clip it */}
      {pickerOpen && createPortal(
        <>
          {/* Backdrop — click outside to close */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 8999 }}
            onClick={() => setPickerOpen(false)}
          />
          <div style={{
            position:     'fixed',
            bottom:       pickerPos.bottom,
            left:         pickerPos.left,
            zIndex:       9000,
            background:   'rgba(248, 240, 216, 0.98)',
            border:       '1px solid rgba(200,168,40,0.5)',
            borderRadius: '12px',
            padding:      '16px',
            boxShadow:    '0 -6px 28px rgba(0,0,0,0.14)',
          }}>
            <p style={{
              fontFamily: 'Cinzel, serif',
              fontSize:   '9px',
              letterSpacing: '0.18em',
              color:      '#9a7c45',
              marginBottom: '12px',
              textAlign:  'center',
            }}>
              COLOUR
            </p>
            <HexColorPicker color={color} onChange={onColorChange} />
            <p style={{
              fontFamily: 'Cinzel, serif',
              fontSize:   '10px',
              color:      '#6b5533',
              textAlign:  'center',
              marginTop:  '10px',
              letterSpacing: '0.1em',
            }}>
              {color.toUpperCase()}
            </p>
          </div>
        </>,
        document.body
      )}

      {/* Toolbar strip */}
      <div style={{
        position:       'relative',
        flexShrink:     0,
        height:         '82px',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '6px',
        background:     'rgba(245, 235, 208, 0.97)',
        borderTop:      '1px solid rgba(200,168,40,0.35)',
        boxShadow:      '0 -3px 18px rgba(160,130,60,0.08)',
        padding:        '0 24px',
        userSelect:     'none',
      }}>
        {/* Color swatch */}
        <button
          ref={swatchRef}
          onClick={handleSwatchClick}
          title="Pick colour"
          style={{
            width:        '34px',
            height:       '34px',
            borderRadius: '50%',
            background:   color,
            border:       pickerOpen
                            ? '2px solid #c8a828'
                            : '2px solid rgba(160,130,60,0.5)',
            boxShadow:    '0 1px 6px rgba(0,0,0,0.18)',
            cursor:       'pointer',
            flexShrink:   0,
            transition:   'border-color 0.15s',
          }}
        />

        {/* Divider */}
        <div style={{ width: '1px', height: '44px', background: 'rgba(160,130,60,0.2)', margin: '0 8px' }} />

        {/* Brush buttons */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {BRUSHES.map(({ id, label, Icon }) => {
            const active = brush === id
            return (
              <button
                key={id}
                onClick={() => onBrushChange(id)}
                style={{
                  display:        'flex',
                  flexDirection:  'column',
                  alignItems:     'center',
                  justifyContent: 'center',
                  gap:            '4px',
                  width:          '60px',
                  height:         '56px',
                  background:     active
                                    ? 'rgba(200,168,40,0.12)'
                                    : 'transparent',
                  border:         active
                                    ? '1px solid rgba(200,168,40,0.45)'
                                    : '1px solid transparent',
                  borderRadius:   '8px',
                  cursor:         'pointer',
                  transition:     'all 0.15s',
                  padding:        '4px 2px',
                }}
              >
                <Icon active={active} />
                <span style={{
                  fontFamily:    'Cinzel, serif',
                  fontSize:      '8.5px',
                  letterSpacing: '0.1em',
                  color:         active ? '#b08c1a' : '#6b5533',
                  whiteSpace:    'nowrap',
                }}>
                  {label.toUpperCase()}
                </span>
              </button>
            )
          })}
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '44px', background: 'rgba(160,130,60,0.2)', margin: '0 8px' }} />

        {/* Sliders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <LabeledSlider
            label="Size"
            value={size}
            min={1} max={100} step={1}
            onChange={onSizeChange}
            display={v => v}
          />
          <LabeledSlider
            label="Opacity"
            value={Math.round(opacity * 100)}
            min={5} max={100} step={1}
            onChange={v => onOpacityChange(v / 100)}
            display={v => `${v}%`}
          />
        </div>
      </div>
    </>
  )
}
