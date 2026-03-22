import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { HexColorPicker } from "react-colorful";

// ─── Tool Icons ─────────────────────────────────────────────────────────────

function IconWatercolor({ active }) {
  const c = active ? "#b08c1a" : "#6b5533";
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill={c} stroke="none">
      <circle cx="6" cy="9" r="5" opacity="0.55" />
      <circle cx="12" cy="9" r="5" opacity="0.55" />
      <circle cx="9" cy="13" r="4" opacity="0.55" />
    </svg>
  );
}

function IconPencil({ active }) {
  const c = active ? "#b08c1a" : "#6b5533";
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke={c}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="14" x2="13" y2="4" />
      <polygon points="13,4 16,3 16,6 13,6" fill={c} stroke="none" />
      <line x1="4" y1="14" x2="2" y2="16" />
    </svg>
  );
}

function IconInk({ active }) {
  const c = active ? "#b08c1a" : "#6b5533";
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill={c} stroke="none">
      <path d="M9 2 C9 2 15 9 15 13 C15 16 12.3 17.5 9 17.5 C5.7 17.5 3 16 3 13 C3 9 9 2 9 2 Z" />
    </svg>
  );
}

function IconSmudge({ active }) {
  const c = active ? "#b08c1a" : "#6b5533";
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M2 13 Q5 5 10 7 Q15 9 16 12" />
      <circle cx="16" cy="12" r="1.5" fill={c} stroke="none" />
    </svg>
  );
}

function IconBlur({ active }) {
  const c = active ? "#b08c1a" : "#6b5533";
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke={c}
      strokeLinecap="round"
    >
      <circle cx="9" cy="9" r="7" strokeWidth="1" opacity="0.25" />
      <circle cx="9" cy="9" r="5" strokeWidth="1.4" opacity="0.5" />
      <circle cx="9" cy="9" r="3" strokeWidth="1.8" opacity="0.85" />
    </svg>
  );
}

function IconEraser({ active }) {
  const c = active ? "#b08c1a" : "#6b5533";
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke={c}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1.5" y="6" width="15" height="8" rx="2" />
      <line x1="1.5" y1="10" x2="16.5" y2="10" opacity="0.45" />
    </svg>
  );
}

function IconLine({ active }) {
  const c = active ? "#b08c1a" : "#6b5533";
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke={c}
      strokeWidth="1.7"
      strokeLinecap="round"
    >
      <line x1="3" y1="14" x2="15" y2="4" />
    </svg>
  );
}

function IconRectangle({ active }) {
  const c = active ? "#b08c1a" : "#6b5533";
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke={c}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="12" height="10" rx="1.5" />
    </svg>
  );
}

function IconCircle({ active }) {
  const c = active ? "#b08c1a" : "#6b5533";
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke={c}
      strokeWidth="1.7"
    >
      <circle cx="9" cy="9" r="5.5" />
    </svg>
  );
}

function IconTriangle({ active }) {
  const c = active ? "#b08c1a" : "#6b5533";
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke={c}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 3 L15 14 H3 Z" />
    </svg>
  );
}

const PAINT_TOOLS = [
  { id: "watercolor", label: "Watercolor", Icon: IconWatercolor },
  { id: "pencil", label: "Pencil", Icon: IconPencil },
  { id: "ink", label: "Ink", Icon: IconInk },
  { id: "smudge", label: "Smudge", Icon: IconSmudge },
  { id: "blur", label: "Blur", Icon: IconBlur },
  { id: "eraser", label: "Eraser", Icon: IconEraser },
];

const SHAPE_TOOLS = [
  { id: "line", label: "Line", Icon: IconLine },
  { id: "rectangle", label: "Rectangle", Icon: IconRectangle },
  { id: "circle", label: "Circle", Icon: IconCircle },
  { id: "triangle", label: "Triangle", Icon: IconTriangle },
];

// ─── Slider ────────────────────────────────────────────────────────────────

function LabeledSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  fullWidth = false,
}) {
  const ratio = Math.max(
    0,
    Math.min(1, (value - min) / Math.max(max - min, 1)),
  );
  const percent = Math.round(ratio * 100);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "3px",
      }}
    >
      <span
        style={{
          fontFamily: "Cinzel, serif",
          fontSize: "9px",
          letterSpacing: "0.14em",
          color: "#9a7c45",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
        <input
          type="range"
          className="arverie-slider"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            width: fullWidth ? "100%" : "138px",
            flex: fullWidth ? 1 : "none",
            background: `linear-gradient(to right, #c8a828 0%, #c8a828 ${percent}%, rgba(160,130,60,0.25) ${percent}%, rgba(160,130,60,0.25) 100%)`,
          }}
          aria-label={label}
        />
        <span
          style={{
            fontFamily: "Cinzel, serif",
            fontSize: "10px",
            color: "#6b5533",
            minWidth: "28px",
            textAlign: "right",
          }}
        >
          {display(value)}
        </span>
      </div>
    </div>
  );
}

// ─── Main Toolbar ──────────────────────────────────────────────────────────

export default function CanvasToolbar({
  brush,
  onBrushChange,
  color,
  onColorChange,
  size,
  onSizeChange,
  opacity,
  onOpacityChange,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPos, setPickerPos] = useState({ bottom: 0, left: 0 });
  const [isCompact, setIsCompact] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 980 : false,
  );
  const [mobilePanel, setMobilePanel] = useState("paint");
  const [expandedAdjust, setExpandedAdjust] = useState("size");
  const [toolbarWidth, setToolbarWidth] = useState(0);
  const [shapeSelectValue, setShapeSelectValue] = useState("");
  const swatchRef = useRef(null);
  const toolbarRef = useRef(null);

  const shapeToolsSet = useRef(new Set(SHAPE_TOOLS.map((tool) => tool.id)));
  const useShapeDropdown =
    !isCompact && toolbarWidth > 0 && toolbarWidth < 1180;

  useEffect(() => {
    const onResize = () => setIsCompact(window.innerWidth <= 980);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isCompact) {
      setMobilePanel("paint");
      setExpandedAdjust("size");
    }
  }, [isCompact]);

  useEffect(() => {
    if (!toolbarRef.current) return;
    const updateWidth = () => {
      if (!toolbarRef.current) return;
      setToolbarWidth(toolbarRef.current.clientWidth || 0);
    };
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(toolbarRef.current);
    window.addEventListener("resize", updateWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  useEffect(() => {
    if (shapeToolsSet.current.has(brush)) {
      setShapeSelectValue(brush);
    }
  }, [brush]);

  const handleSwatchClick = () => {
    if (!pickerOpen && swatchRef.current) {
      const rect = swatchRef.current.getBoundingClientRect();
      setPickerPos({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
      });
    }
    setPickerOpen((o) => !o);
  };

  return (
    <>
      {/* Slider global styles */}
      <style>{`
        .arverie-toolbar {
          --gold: #c8a828;
          --ink: #6b5533;
          --line: rgba(160,130,60,0.2);
        }

        .arverie-tool-button {
          min-width: 72px;
          height: 72px;
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 6px;
          transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
        }

        .arverie-tool-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 18px rgba(70,45,16,0.14);
        }

        .arverie-tool-button:focus-visible {
          outline: 2px solid rgba(200,168,40,0.85);
          outline-offset: 2px;
        }

        .arverie-mobile-tab {
          min-width: 84px;
          height: 42px;
          border-radius: 12px;
          border: 1px solid rgba(160,130,60,0.3);
          background: rgba(255,250,235,0.65);
          color: #6b5533;
          font-family: Cinzel, serif;
          font-size: 11px;
          letter-spacing: 0.12em;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .arverie-mobile-tab.active {
          background: rgba(200,168,40,0.16);
          border-color: rgba(200,168,40,0.45);
          color: #9a7420;
        }

        .arverie-mobile-tab:focus-visible {
          outline: 2px solid rgba(200,168,40,0.85);
          outline-offset: 2px;
        }

        .arverie-adjust-chip {
          height: 42px;
          border-radius: 12px;
          border: 1px solid rgba(160,130,60,0.3);
          background: rgba(255,250,235,0.75);
          padding: 0 14px;
          font-family: Cinzel, serif;
          font-size: 10px;
          letter-spacing: 0.12em;
          color: #6b5533;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .arverie-adjust-chip.active {
          background: rgba(200,168,40,0.16);
          border-color: rgba(200,168,40,0.45);
          color: #9a7420;
        }

        .arverie-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 3px;
          background: rgba(160,130,60,0.25);
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

        .arverie-action-button {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          border: 1px solid rgba(160,130,60,0.3);
          background: rgba(255,250,235,0.78);
          color: #6b5533;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .arverie-action-button:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: rgba(200,168,40,0.48);
          box-shadow: 0 6px 12px rgba(70,45,16,0.12);
        }

        .arverie-action-button:disabled {
          opacity: 0.42;
          cursor: default;
        }

        .arverie-shape-select {
          height: 44px;
          min-width: 148px;
          border-radius: 10px;
          border: 1px solid rgba(160,130,60,0.3);
          background: rgba(255,250,235,0.8);
          color: #6b5533;
          font-family: Cinzel, serif;
          font-size: 11px;
          letter-spacing: 0.1em;
          padding: 0 12px;
          outline: none;
          cursor: pointer;
        }

        @media (max-width: 980px) {
          .arverie-toolbar {
            height: auto !important;
            min-height: 140px;
            padding: 10px 12px !important;
            row-gap: 8px;
            justify-content: flex-start !important;
            align-items: stretch !important;
            overflow: hidden;
          }

          .arverie-tool-button {
            min-width: 64px;
            height: 64px;
          }
        }
      `}</style>

      {/* Color picker popup — portalled to body so overflow:hidden ancestors can't clip it */}
      {pickerOpen &&
        createPortal(
          <>
            {/* Backdrop — click outside to close */}
            <div
              style={{ position: "fixed", inset: 0, zIndex: 8999 }}
              onClick={() => setPickerOpen(false)}
            />
            <div
              style={{
                position: "fixed",
                bottom: pickerPos.bottom,
                left: pickerPos.left,
                zIndex: 9000,
                background: "rgba(248, 240, 216, 0.98)",
                border: "1px solid rgba(200,168,40,0.5)",
                borderRadius: "12px",
                padding: "16px",
                boxShadow: "0 -6px 28px rgba(0,0,0,0.14)",
              }}
            >
              <p
                style={{
                  fontFamily: "Cinzel, serif",
                  fontSize: "9px",
                  letterSpacing: "0.18em",
                  color: "#9a7c45",
                  marginBottom: "12px",
                  textAlign: "center",
                }}
              >
                COLOUR
              </p>
              <HexColorPicker color={color} onChange={onColorChange} />
              <p
                style={{
                  fontFamily: "Cinzel, serif",
                  fontSize: "10px",
                  color: "#6b5533",
                  textAlign: "center",
                  marginTop: "10px",
                  letterSpacing: "0.1em",
                }}
              >
                {color.toUpperCase()}
              </p>
            </div>
          </>,
          document.body,
        )}

      {/* Toolbar strip */}
      <div
        ref={toolbarRef}
        className="arverie-toolbar"
        style={{
          position: "relative",
          flexShrink: 0,
          height: "110px",
          display: "flex",
          alignItems: "center",
          justifyContent: useShapeDropdown ? "flex-start" : "center",
          gap: "10px",
          background: "rgba(245, 235, 208, 0.97)",
          borderTop: "1px solid rgba(200,168,40,0.35)",
          boxShadow: "0 -8px 30px rgba(160,130,60,0.12)",
          padding: "0 20px",
          userSelect: "none",
          overflowX: isCompact ? "hidden" : "auto",
        }}
      >
        {!isCompact ? (
          <>
            {/* Color swatch */}
            <button
              ref={swatchRef}
              onClick={handleSwatchClick}
              title="Pick colour"
              aria-label="Pick color"
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "50%",
                background: color,
                border: pickerOpen
                  ? "2px solid #c8a828"
                  : "2px solid rgba(160,130,60,0.5)",
                boxShadow: "0 3px 10px rgba(0,0,0,0.18)",
                cursor: "pointer",
                flexShrink: 0,
                transition: "border-color 0.15s",
              }}
            />

            <div
              style={{
                width: "1px",
                height: "56px",
                background: "rgba(160,130,60,0.2)",
                margin: "0 2px",
              }}
            />

            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {PAINT_TOOLS.map(({ id, label, Icon }) => {
                const active = brush === id;
                return (
                  <button
                    key={id}
                    onClick={() => onBrushChange(id)}
                    className="arverie-tool-button"
                    aria-label={label}
                    style={{
                      background: active
                        ? "rgba(200,168,40,0.12)"
                        : "transparent",
                      border: active
                        ? "1px solid rgba(200,168,40,0.45)"
                        : "1px solid transparent",
                    }}
                  >
                    <Icon active={active} />
                    <span
                      style={{
                        fontFamily: "Cinzel, serif",
                        fontSize: "9.5px",
                        letterSpacing: "0.1em",
                        color: active ? "#b08c1a" : "#6b5533",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                width: "1px",
                height: "56px",
                background: "rgba(160,130,60,0.2)",
                margin: "0 2px",
              }}
            />

            {useShapeDropdown ? (
              <select
                className="arverie-shape-select"
                aria-label="Select shape tool"
                value={shapeSelectValue}
                onChange={(e) => {
                  const next = e.target.value;
                  if (!next) return;
                  setShapeSelectValue(next);
                  onBrushChange(next);
                }}
              >
                <option value="">SHAPES ▾</option>
                {SHAPE_TOOLS.map(({ id, label }) => (
                  <option key={id} value={id}>
                    {label.toUpperCase()}
                  </option>
                ))}
              </select>
            ) : (
              <div
                style={{ display: "flex", gap: "6px", alignItems: "center" }}
              >
                {SHAPE_TOOLS.map(({ id, label, Icon }) => {
                  const active = brush === id;
                  return (
                    <button
                      key={id}
                      onClick={() => onBrushChange(id)}
                      className="arverie-tool-button"
                      aria-label={label}
                      style={{
                        background: active
                          ? "rgba(200,168,40,0.12)"
                          : "transparent",
                        border: active
                          ? "1px solid rgba(200,168,40,0.45)"
                          : "1px solid transparent",
                      }}
                    >
                      <Icon active={active} />
                      <span
                        style={{
                          fontFamily: "Cinzel, serif",
                          fontSize: "9.5px",
                          letterSpacing: "0.1em",
                          color: active ? "#b08c1a" : "#6b5533",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {label.toUpperCase()}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div
              style={{
                width: "1px",
                height: "56px",
                background: "rgba(160,130,60,0.2)",
                margin: "0 2px",
              }}
            />

            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <LabeledSlider
                label="Size"
                value={size}
                min={1}
                max={100}
                step={1}
                onChange={onSizeChange}
                display={(v) => v}
              />
              <LabeledSlider
                label="Opacity"
                value={Math.round(opacity * 100)}
                min={5}
                max={100}
                step={1}
                onChange={(v) => onOpacityChange(v / 100)}
                display={(v) => `${v}%`}
              />
            </div>

            <div
              style={{
                width: "1px",
                height: "56px",
                background: "rgba(160,130,60,0.2)",
                margin: "0 2px",
              }}
            />

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                type="button"
                className="arverie-action-button"
                aria-label="Undo last stroke"
                title="Undo last stroke"
                disabled={!canUndo}
                onClick={onUndo}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M6 4 L2.5 7.5 L6 11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3 7.5 H9.2 C11.9 7.5 14 9.2 14 11.8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="arverie-action-button"
                aria-label="Redo last stroke"
                title="Redo last stroke"
                disabled={!canRedo}
                onClick={onRedo}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M10 4 L13.5 7.5 L10 11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13 7.5 H6.8 C4.1 7.5 2 9.2 2 11.8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                ref={swatchRef}
                onClick={handleSwatchClick}
                title="Pick colour"
                aria-label="Pick color"
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: color,
                  border: pickerOpen
                    ? "2px solid #c8a828"
                    : "2px solid rgba(160,130,60,0.5)",
                  boxShadow: "0 3px 10px rgba(0,0,0,0.18)",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "border-color 0.15s",
                }}
              />

              <div style={{ display: "flex", gap: "6px", flex: 1 }}>
                {[
                  { id: "paint", label: "PAINT" },
                  { id: "shape", label: "SHAPE" },
                  { id: "adjust", label: "ADJUST" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    className={`arverie-mobile-tab ${mobilePanel === tab.id ? "active" : ""}`}
                    onClick={() => setMobilePanel(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="arverie-action-button"
                aria-label="Undo last stroke"
                title="Undo last stroke"
                disabled={!canUndo}
                onClick={onUndo}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M6 4 L2.5 7.5 L6 11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3 7.5 H9.2 C11.9 7.5 14 9.2 14 11.8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="arverie-action-button"
                aria-label="Redo last stroke"
                title="Redo last stroke"
                disabled={!canRedo}
                onClick={onRedo}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M10 4 L13.5 7.5 L10 11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13 7.5 H6.8 C4.1 7.5 2 9.2 2 11.8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {mobilePanel !== "adjust" ? (
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  overflowX: "auto",
                  paddingBottom: "4px",
                }}
              >
                {(mobilePanel === "paint" ? PAINT_TOOLS : SHAPE_TOOLS).map(
                  ({ id, label, Icon }) => {
                    const active = brush === id;
                    return (
                      <button
                        key={id}
                        onClick={() => onBrushChange(id)}
                        className="arverie-tool-button"
                        aria-label={label}
                        style={{
                          background: active
                            ? "rgba(200,168,40,0.12)"
                            : "transparent",
                          border: active
                            ? "1px solid rgba(200,168,40,0.45)"
                            : "1px solid transparent",
                          minWidth: "72px",
                          height: "70px",
                          flexShrink: 0,
                        }}
                      >
                        <Icon active={active} />
                        <span
                          style={{
                            fontFamily: "Cinzel, serif",
                            fontSize: "9px",
                            letterSpacing: "0.1em",
                            color: active ? "#b08c1a" : "#6b5533",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {label.toUpperCase()}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className={`arverie-adjust-chip ${expandedAdjust === "size" ? "active" : ""}`}
                    onClick={() => setExpandedAdjust("size")}
                  >
                    SIZE {size}
                  </button>
                  <button
                    className={`arverie-adjust-chip ${expandedAdjust === "opacity" ? "active" : ""}`}
                    onClick={() => setExpandedAdjust("opacity")}
                  >
                    OPACITY {Math.round(opacity * 100)}%
                  </button>
                </div>

                {expandedAdjust === "size" ? (
                  <LabeledSlider
                    label="Size"
                    value={size}
                    min={1}
                    max={100}
                    step={1}
                    onChange={onSizeChange}
                    display={(v) => v}
                    fullWidth
                  />
                ) : (
                  <LabeledSlider
                    label="Opacity"
                    value={Math.round(opacity * 100)}
                    min={5}
                    max={100}
                    step={1}
                    onChange={(v) => onOpacityChange(v / 100)}
                    display={(v) => `${v}%`}
                    fullWidth
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
