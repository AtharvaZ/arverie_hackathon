import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { api } from "../utils/api";

const EMPTY_LABEL = "No response shared.";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toText(value, fallback = "") {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (value == null) return fallback;
  return String(value);
}

function isColorToken(value) {
  if (typeof value !== "string") return false;
  const color = value.trim();
  if (!color) return false;
  return (
    /^#[0-9a-f]{3,8}$/i.test(color) ||
    /^rgba?\(/i.test(color) ||
    /^hsla?\(/i.test(color)
  );
}

function toSeconds(sessionRow, data) {
  const directDuration = Number(sessionRow?.duration_seconds);
  if (Number.isFinite(directDuration) && directDuration > 0) return directDuration;
  const dataDuration = Number(data?.duration_seconds);
  if (Number.isFinite(dataDuration) && dataDuration > 0) return dataDuration;
  const summaryDuration = Number(data?.canvas_summary?.total_time_seconds);
  if (Number.isFinite(summaryDuration) && summaryDuration > 0) return summaryDuration;
  return 0;
}

function collectPalette(data) {
  const paletteCandidates = [
    ...safeArray(data?.color_palette),
    ...safeArray(data?.canvas_summary?.colors_used),
    ...safeArray(data?.canvas_summary?.palette),
  ];
  const unique = [];
  paletteCandidates.forEach((token) => {
    if (isColorToken(token) && !unique.includes(token)) unique.push(token);
  });
  return unique.slice(0, 8);
}

function buildAnsweredQuestions(data) {
  const fromPairs = safeArray(data?.qa_pairs)
    .map((pair, index) => {
      if (!pair || typeof pair !== "object") return null;
      const question = toText(pair.question, `Question ${index + 1}`);
      const answer = toText(pair.answer, EMPTY_LABEL);
      return { question, answer };
    })
    .filter(Boolean);

  if (fromPairs.length > 0) return fromPairs;

  const questions = safeArray(data?.reflection_questions);
  const answers = safeArray(
    data?.user_answers?.length ? data.user_answers : data?.answers,
  );

  if (questions.length === 0 && answers.length === 0) return [];

  const total = Math.max(questions.length, answers.length);
  return Array.from({ length: total }, (_, index) => ({
    question: toText(questions[index], `Question ${index + 1}`),
    answer: toText(answers[index], EMPTY_LABEL),
  }));
}

function normalizeSessionRow(row) {
  const data = row?.data && typeof row.data === "object" ? row.data : {};
  const dateValue = row?.created_at ? new Date(row.created_at) : null;
  const validDate = dateValue && !Number.isNaN(dateValue.getTime());

  const formattedDate = validDate
    ? dateValue.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Unknown date";

  const seconds = toSeconds(row, data);
  const durationLabel =
    seconds > 0 ? `${Math.max(1, Math.round(seconds / 60))} min` : "Unknown duration";

  return {
    id: toText(row?.id, crypto.randomUUID()),
    sortDate: validDate ? dateValue.getTime() : 0,
    date: formattedDate,
    duration: durationLabel,
    moodCheckin: toText(row?.mood_checkin || data?.mood_checkin, "Unknown"),
    moodCheckout: toText(
      row?.mood_checkout || data?.mood_checkout,
      toText(row?.mood_checkin || data?.mood_checkin, "Unknown"),
    ),
    palette: collectPalette(data),
    letter: toText(data?.letter, "No letter saved for this session yet."),
    questions: buildAnsweredQuestions(data),
    drawingUrl: toText(row?.drawing_url || data?.drawing_url, ""),
  };
}

// ── Popup overlay ──────────────────────────────────────────────────────────
function Popup({ onClose, type, children }) {
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="jv-popup-backdrop" onClick={onClose}>
      <div className={`jv-popup-box${type === "image" ? " popup-image-box" : ""}`} onClick={(e) => e.stopPropagation()}>
        <button className="jv-popup-close" onClick={onClose} style={type === "image" ? { background: "rgba(30,22,20,.8)", color: "#F5EDDA", border: "1px solid rgba(245,237,218,.2)" } : {}}>✕</button>
        {children}
      </div>
    </div>
  );
}

// ── Left page — drawing preview only ──────────────────────────────────────
function LeftSessionPage({ entry, onImageClick, onDelete, deleting }) {
  return (
    <div className="journal-page-content">
      <h3 className="journal-heading">Session — {entry.date}</h3>
      <p className="journal-body" style={{ opacity: 0.6, fontSize: 11 }}>{entry.duration}</p>

      {entry.drawingUrl ? (
        <div
          className="drawing-preview-wrap"
          onClick={() => onImageClick(entry.drawingUrl)}
          title="Click to enlarge"
        >
          <img
            src={entry.drawingUrl}
            alt="Session drawing"
            className="drawing-preview-img"
          />
          <div className="drawing-preview-hint">click to enlarge</div>
        </div>
      ) : (
        <div className="drawing-preview-empty">
          <span>No drawing saved</span>
        </div>
      )}

      <button
        className="delete-session-btn"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        disabled={deleting}
      >
        {deleting ? "Deleting…" : "Delete session"}
      </button>
    </div>
  );
}

// ── Right page — info cards with click-to-expand ───────────────────────────
function RightSessionPage({ entry, onExpand }) {
  return (
    <div className="journal-page-content">
      <h3 className="journal-heading">Journal</h3>

      {/* Color Palette */}
      <div
        className="journal-section journal-section-clickable"
        onClick={() => onExpand("palette", entry)}
      >
        <p className="journal-label">Color Palette</p>
        <div className="journal-swatch-row">
          {entry.palette.length > 0 ? (
            entry.palette.slice(0, 5).map((color) => (
              <span key={`${entry.id}-${color}`} className="swatch" style={{ background: color }} />
            ))
          ) : (
            <p className="journal-body muted">No palette saved.</p>
          )}
          {entry.palette.length > 5 && (
            <span className="swatch-more">+{entry.palette.length - 5}</span>
          )}
        </div>
      </div>

      {/* Mood */}
      <div
        className="journal-section journal-section-clickable"
        onClick={() => onExpand("mood", entry)}
      >
        <p className="journal-label">Mood</p>
        <div className="mood-row">
          <span className="m-chip">{entry.moodCheckin}</span>
          <span className="m-arr">→</span>
          <span className="m-chip">{entry.moodCheckout}</span>
        </div>
      </div>

      {/* Session Letter */}
      <div
        className="journal-section journal-section-clickable"
        onClick={() => onExpand("letter", entry)}
      >
        <p className="journal-label">Session Letter</p>
        <p className="journal-body letter-preview">{entry.letter}</p>
      </div>

      {/* Reflection Q&A */}
      <div
        className="journal-section journal-section-clickable"
        onClick={() => onExpand("qa", entry)}
      >
        <p className="journal-label">Reflections</p>
        {entry.questions.length > 0 ? (
          <p className="journal-body muted">{entry.questions.length} question{entry.questions.length !== 1 ? "s" : ""} answered</p>
        ) : (
          <p className="journal-body muted">No reflections saved.</p>
        )}
      </div>
    </div>
  );
}

// ── Popup content by type ──────────────────────────────────────────────────
function PopupContent({ type, entry }) {
  if (type === "image") {
    return (
      <div className="popup-image-wrap">
        <img src={entry} alt="Session drawing" className="popup-image" />
      </div>
    );
  }
  if (type === "palette") {
    return (
      <div className="popup-body">
        <h2 className="popup-title">Color Palette</h2>
        <p className="popup-sub">{entry.date}</p>
        <div className="popup-swatch-grid">
          {entry.palette.length > 0 ? entry.palette.map((color) => (
            <div key={color} className="popup-swatch-item">
              <span className="popup-swatch" style={{ background: color }} />
              <small>{color}</small>
            </div>
          )) : <p className="popup-empty">No palette saved for this session.</p>}
        </div>
      </div>
    );
  }
  if (type === "mood") {
    return (
      <div className="popup-body">
        <h2 className="popup-title">Mood</h2>
        <p className="popup-sub">{entry.date} &middot; {entry.duration}</p>
        <div className="popup-mood-row">
          <div className="popup-mood-card">
            <span className="popup-mood-label">Check-in</span>
            <span className="popup-mood-val">{entry.moodCheckin}</span>
          </div>
          <span className="popup-mood-arrow">→</span>
          <div className="popup-mood-card">
            <span className="popup-mood-label">Check-out</span>
            <span className="popup-mood-val">{entry.moodCheckout}</span>
          </div>
        </div>
      </div>
    );
  }
  if (type === "letter") {
    return (
      <div className="popup-body">
        <h2 className="popup-title">Session Letter</h2>
        <p className="popup-sub">{entry.date}</p>
        <p className="popup-letter">{entry.letter}</p>
      </div>
    );
  }
  if (type === "qa") {
    return (
      <div className="popup-body">
        <h2 className="popup-title">Reflections</h2>
        <p className="popup-sub">{entry.date}</p>
        {entry.questions.length > 0 ? entry.questions.map((qa, i) => (
          <div key={i} className="popup-qa-block">
            <p className="popup-qa-q">{qa.question}</p>
            <p className="popup-qa-a">{qa.answer}</p>
          </div>
        )) : <p className="popup-empty">No answered prompts were saved for this session.</p>}
      </div>
    );
  }
  return null;
}

// ── Main component ─────────────────────────────────────────────────────────
export default function JournalPage() {
  const navigate = useNavigate();
  const { session, user, pastSessions, refreshPastSessions } = useApp();

  const [cur, setCur] = useState(0);
  const [busy, setBusy] = useState(false);
  const [coverState, setCoverState] = useState("closed"); // 'closed' | 'animating' | 'open'
  const [flipping, setFlipping] = useState(null); // { dir:'f'|'b', from:idx, to:idx } | null
  const [popup, setPopup] = useState(null); // { type, data } | null
  const [deleting, setDeleting] = useState(false);

  const opened = coverState === "open";
  const flipRef = useRef(null);

  useEffect(() => {
    const userId = session.userId || user.id;
    if (!userId) return;
    refreshPastSessions(userId);
    const onFocus = () => refreshPastSessions(userId);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshPastSessions, session.userId, user.id]);

  const entries = useMemo(() => {
    const normalized = safeArray(pastSessions)
      .map(normalizeSessionRow)
      .sort((a, b) => b.sortDate - a.sortDate);
    return normalized.slice(0, 10);
  }, [pastSessions]);

  function openCover() {
    if (coverState !== "closed") return;
    setCoverState("animating");
    setTimeout(() => setCoverState("open"), 700);
  }

  function flip(dir) {
    if (busy || !opened) return;
    const nxt = dir === "f" ? cur + 1 : cur - 1;
    if (nxt < 0 || nxt >= entries.length) return;
    setBusy(true);
    setFlipping({ dir, from: cur, to: nxt });
    setTimeout(() => {
      setCur(nxt);
      setFlipping(null);
      setBusy(false);
    }, 580);
  }

  flipRef.current = flip;

  // Clamp cur whenever entries shrinks (e.g. after deletion)
  useEffect(() => {
    if (entries.length > 0 && cur >= entries.length) {
      setCur(entries.length - 1);
    }
  }, [entries.length, cur]);

  useEffect(() => {
    if (!opened) return;
    function onKey(e) {
      if (e.key === "ArrowLeft") flipRef.current("b");
      if (e.key === "ArrowRight") flipRef.current("f");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opened]);

  function openPopup(type, data) { setPopup({ type, data }); }
  function closePopup() { setPopup(null); }

  async function handleDelete() {
    const entry = entries[cur];
    if (!entry) return;
    const userId = session.userId || user.id;
    if (!userId) return;
    setDeleting(true);
    try {
      await api.deleteSession(userId, entry.id);
      // Move to adjacent session after deletion
      const nextCur = cur > 0 ? cur - 1 : 0;
      await refreshPastSessions(userId);
      setCur(nextCur);
    } catch (err) {
      console.error("Failed to delete session:", err);
    } finally {
      setDeleting(false);
    }
  }

  const leftEntry = flipping
    ? flipping.dir === "f" ? entries[flipping.from] : entries[flipping.to]
    : entries[cur];
  const rightEntry = flipping
    ? flipping.dir === "f" ? entries[flipping.to] : entries[flipping.from]
    : entries[cur];

  return (
    <div className="journal-stage">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        .journal-stage {
          position: fixed;
          inset: 0;
          background: #1A1614;
          z-index: 120;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 16px;
          padding: 22px 16px;
          overflow: auto;
          font-family: 'DM Sans', sans-serif;
        }

        .journal-close {
          position: fixed;
          top: 18px;
          right: 18px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid rgba(245, 237, 218, 0.35);
          color: #F5EDDA;
          background: rgba(245, 237, 218, 0.08);
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          z-index: 130;
        }

        /* ── SPREAD ── */
        .jv-spread {
          display: flex;
          height: 520px;
          width: 960px;
          max-width: min(960px, calc(100vw - 40px));
          max-height: min(520px, calc(100vh - 140px));
          position: relative;
          perspective: 1400px;
        }

        .jv-page {
          flex: 1;
          background: #F5EDDA;
          padding: 1.5rem 1.4rem;
          overflow-y: auto;
          position: relative;
          scrollbar-width: thin;
          scrollbar-color: rgba(92,64,51,.3) transparent;
        }
        .jv-lp { border-radius: 5px 0 0 5px; box-shadow: -4px 0 20px rgba(0,0,0,.4); }
        .jv-rp { border-radius: 0 5px 5px 0; box-shadow: 4px 0 20px rgba(0,0,0,.4); }

        .jv-spine {
          width: 16px;
          flex-shrink: 0;
          background: #3A2C1E;
          box-shadow: 0 0 14px rgba(0,0,0,.5);
          z-index: 5;
        }

        /* ── COVER ── */
        .jv-cover-left {
          position: absolute;
          top: 0; left: 0;
          width: calc(50% - 8px);
          height: 100%;
          background: transparent;
          border-radius: 5px 0 0 5px;
          z-index: 18;
          transition: opacity .3s ease .15s;
          pointer-events: none;
        }
        .jv-cover {
          position: absolute;
          top: 0; right: 0;
          width: calc(50% - 8px);
          height: 100%;
          transform-style: preserve-3d;
          transform-origin: left center;
          z-index: 20;
        }
        .jv-cover-front {
          position: absolute; inset: 0;
          background: #5C4033;
          border-radius: 0 5px 5px 0;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 10px;
          box-shadow: 4px 0 20px rgba(0,0,0,.4);
        }
        .jv-cover-back {
          position: absolute; inset: 0;
          background: #EDE2C8;
          border-radius: 5px 0 0 5px;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform: rotateY(180deg);
        }
        .c-orn { font-size: 20px; color: #C4A882; font-family: 'Cormorant Garamond', serif; }
        .c-t { font-family: 'Cormorant Garamond', serif; font-size: 13px; font-style: italic; color: #D4B896; letter-spacing: 2px; }
        .c-d { width: 32px; height: .5px; background: #8B6A4A; }

        @keyframes jvCoverFlip {
          0%   { transform: rotateY(0deg); }
          100% { transform: rotateY(-180deg); }
        }
        .jv-cover-flipping { animation: jvCoverFlip .65s cubic-bezier(.4,0,.2,1) forwards; }

        /* ── PAGE FLIPPER ── */
        .jv-flipper {
          position: absolute;
          top: 0;
          width: calc(50% - 8px);
          height: 100%;
          transform-style: preserve-3d;
          z-index: 10;
        }
        .jv-flipper-fwd { right: 0; transform-origin: left center; animation: jvFlipFwd .55s ease-in-out forwards; }
        .jv-flipper-bwd { left: 0; transform-origin: right center; animation: jvFlipBwd .55s ease-in-out forwards; }
        .jv-ff, .jv-fb {
          position: absolute; inset: 0;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          padding: 1.5rem 1.4rem;
          overflow: hidden;
          background: #F5EDDA;
        }
        .jv-fb { transform: rotateY(180deg); }
        .jv-flipper-fwd .jv-ff { border-radius: 0 5px 5px 0; }
        .jv-flipper-fwd .jv-fb { border-radius: 5px 0 0 5px; }
        .jv-flipper-bwd .jv-ff { border-radius: 5px 0 0 5px; }
        .jv-flipper-bwd .jv-fb { border-radius: 0 5px 5px 0; }

        @keyframes jvFlipFwd { 0% { transform: rotateY(0); } 100% { transform: rotateY(-180deg); } }
        @keyframes jvFlipBwd { 0% { transform: rotateY(0); } 100% { transform: rotateY(180deg); } }

        /* ── PAGE CONTENT ── */
        .journal-page-content {
          display: flex;
          flex-direction: column;
          gap: 10px;
          height: 100%;
          overflow-y: auto;
          padding-right: 2px;
          scrollbar-width: thin;
          scrollbar-color: rgba(92,64,51,.3) transparent;
        }

        .journal-heading {
          margin: 0 0 2px;
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          font-weight: 600;
          line-height: 1.1;
          color: #2d211c;
          border-bottom: 1px solid rgba(92,64,51,.2);
          padding-bottom: 8px;
        }

        .journal-body {
          margin: 0;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          line-height: 1.5;
          color: #2d211c;
        }
        .journal-body.muted { opacity: 0.55; }

        /* ── DRAWING PREVIEW (left page) ── */
        .drawing-preview-wrap {
          flex: 1;
          border-radius: 6px;
          overflow: hidden;
          cursor: pointer;
          position: relative;
          background: rgba(255,255,255,0.5);
          border: 1px solid rgba(92,64,51,.15);
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 0;
        }
        .drawing-preview-wrap:hover .drawing-preview-hint { opacity: 1; }
        .drawing-preview-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }
        .drawing-preview-hint {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          padding: 6px;
          text-align: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 10px;
          color: #5C4033;
          letter-spacing: .8px;
          background: rgba(245,237,218,.85);
          opacity: 0;
          transition: opacity .2s;
        }
        .drawing-preview-empty {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          border: 1px dashed rgba(92,64,51,.25);
          font-family: 'Cormorant Garamond', serif;
          font-size: 12px;
          font-style: italic;
          color: rgba(92,64,51,.45);
          min-height: 0;
        }

        .delete-session-btn {
          align-self: flex-start;
          margin-top: auto;
          padding: 5px 14px;
          border-radius: 20px;
          border: 1px solid rgba(180,40,40,.4);
          background: rgba(180,40,40,.08);
          color: #b42828;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          cursor: pointer;
          transition: background .15s, border-color .15s;
        }
        .delete-session-btn:hover:not(:disabled) {
          background: rgba(180,40,40,.16);
          border-color: rgba(180,40,40,.65);
        }
        .delete-session-btn:disabled {
          opacity: .45;
          cursor: default;
        }

        /* ── INFO CARDS (right page) ── */
        .journal-section {
          border: 1px solid rgba(92,64,51,.15);
          border-radius: 8px;
          padding: 9px 11px;
          background: rgba(255,255,255,.4);
        }
        .journal-section-clickable {
          cursor: pointer;
          transition: background .15s, border-color .15s;
        }
        .journal-section-clickable:hover {
          background: rgba(255,255,255,.7);
          border-color: rgba(92,64,51,.3);
        }

        .journal-label {
          margin: 0 0 5px;
          font-family: 'Cormorant Garamond', serif;
          font-size: 14px;
          font-weight: 600;
          color: #2d211c;
        }

        .journal-swatch-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .swatch {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 1px solid rgba(92,64,51,.25);
          flex-shrink: 0;
          display: inline-block;
        }
        .swatch-more {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          color: #8B6A4A;
        }

        .mood-row { display: flex; align-items: center; gap: 8px; }
        .m-chip {
          font-family: 'Cormorant Garamond', serif;
          font-size: 11px;
          padding: 2px 9px;
          border-radius: 20px;
          background: #EDE0C4;
          color: #5C4033;
        }
        .m-arr { font-size: 11px; color: #8B6A4A; }

        .letter-preview {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          font-style: italic;
          font-size: 11px;
          opacity: 0.75;
        }

        /* ── CONTROLS ── */
        .journal-controls {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .journal-controls button {
          background: none;
          border: .5px solid rgba(255,255,255,.2);
          color: rgba(255,255,255,.6);
          padding: 6px 18px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 12px;
          font-family: 'Cormorant Garamond', serif;
          transition: background .2s;
        }
        .journal-controls button:hover:not(:disabled) { background: rgba(255,255,255,.08); }
        .journal-controls button:disabled { opacity: .25; cursor: default; }
        .journal-page-indicator {
          font-size: 11px;
          color: rgba(255,255,255,.35);
          font-family: 'Cormorant Garamond', serif;
          min-width: 60px;
          text-align: center;
        }

        /* ── POPUP ── */
        .jv-popup-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(18,14,12,.75);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          backdrop-filter: blur(4px);
        }
        .jv-popup-box {
          position: relative;
          background: #F5EDDA;
          border-radius: 12px;
          max-width: 600px;
          width: 100%;
          max-height: 88vh;
          overflow-y: auto;
          box-shadow: 0 24px 80px rgba(0,0,0,.55);
          scrollbar-width: thin;
          scrollbar-color: rgba(92,64,51,.3) transparent;
        }
        .jv-popup-box.popup-image-box {
          max-width: 90vw;
          background: #1A1614;
          border-radius: 10px;
        }
        .jv-popup-close {
          position: sticky;
          top: 14px;
          float: right;
          margin: 14px 14px 0 0;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1px solid rgba(92,64,51,.3);
          background: rgba(245,237,218,.9);
          color: #5C4033;
          cursor: pointer;
          font-size: 12px;
          line-height: 1;
          z-index: 1;
          flex-shrink: 0;
        }

        .popup-image-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: #1A1614;
          border-radius: 10px;
        }
        .popup-image {
          max-width: 100%;
          max-height: 82vh;
          object-fit: contain;
          border-radius: 4px;
          display: block;
        }

        .popup-body {
          padding: 20px 24px 24px;
          clear: both;
        }
        .popup-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px;
          font-weight: 600;
          color: #2d211c;
          margin: 0 0 4px;
        }
        .popup-sub {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          color: #8B6A4A;
          margin: 0 0 16px;
          text-transform: uppercase;
          letter-spacing: .8px;
        }
        .popup-swatch-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 8px;
        }
        .popup-swatch-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
        }
        .popup-swatch {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid rgba(92,64,51,.25);
          display: inline-block;
        }
        .popup-swatch-item small {
          font-family: 'DM Sans', sans-serif;
          font-size: 9px;
          color: #5C4033;
        }
        .popup-mood-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 8px;
        }
        .popup-mood-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          background: rgba(237,224,196,.5);
          border-radius: 10px;
          padding: 14px 24px;
          flex: 1;
        }
        .popup-mood-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .8px;
          color: #8B6A4A;
        }
        .popup-mood-val {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-weight: 600;
          color: #2d211c;
        }
        .popup-mood-arrow {
          font-size: 20px;
          color: #8B6A4A;
        }
        .popup-letter {
          font-family: 'Cormorant Garamond', serif;
          font-size: 16px;
          line-height: 2;
          font-style: italic;
          color: #2d211c;
          white-space: pre-wrap;
        }
        .popup-qa-block {
          border-top: 1px dashed rgba(92,64,51,.22);
          padding-top: 12px;
          margin-top: 12px;
        }
        .popup-qa-block:first-of-type { border-top: none; padding-top: 0; margin-top: 0; }
        .popup-qa-q {
          font-family: 'Cormorant Garamond', serif;
          font-size: 14px;
          font-style: italic;
          color: #5C4033;
          margin: 0 0 5px;
          line-height: 1.5;
        }
        .popup-qa-a {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #2d211c;
          margin: 0;
          line-height: 1.6;
        }
        .popup-empty {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          color: #8B6A4A;
          font-style: italic;
          margin: 0;
        }

        /* ── EMPTY STATE ── */
        .journal-empty {
          width: min(720px, calc(100vw - 40px));
          border: 1px solid rgba(245,237,218,.2);
          border-radius: 14px;
          background: rgba(245,237,218,.06);
          padding: 32px 24px;
          text-align: center;
          color: #F5EDDA;
        }
        .journal-subheading {
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 10px;
        }
      `}</style>

      <button className="journal-close" onClick={() => navigate(-1)}>✕</button>

      {entries.length > 0 ? (
        <>
          <div
            className="jv-spread"
            onClick={coverState === "closed" ? openCover : undefined}
            style={{ cursor: coverState === "closed" ? "pointer" : "default" }}
          >
            {/* Left page — drawing preview */}
            <div
              className="jv-page jv-lp"
              style={{ visibility: coverState === "closed" ? "hidden" : "visible" }}
            >
              {leftEntry && (
                <LeftSessionPage
                  entry={leftEntry}
                  onImageClick={(url) => openPopup("image", url)}
                  onDelete={handleDelete}
                  deleting={deleting}
                />
              )}
            </div>

            <div className="jv-spine" />

            {/* Right page — info cards */}
            <div className="jv-page jv-rp">
              {rightEntry && (
                <RightSessionPage
                  entry={rightEntry}
                  onExpand={(type, entry) => openPopup(type, entry)}
                />
              )}
            </div>

            {/* Page flipper */}
            {flipping && (
              <div className={`jv-flipper jv-flipper-${flipping.dir === "f" ? "fwd" : "bwd"}`}>
                <div className="jv-ff">
                  {flipping.dir === "f"
                    ? <RightSessionPage entry={entries[flipping.from]} onExpand={openPopup} />
                    : <LeftSessionPage entry={entries[flipping.from]} onImageClick={(url) => openPopup("image", url)} onDelete={() => {}} deleting={false} />}
                </div>
                <div className="jv-fb">
                  {flipping.dir === "f"
                    ? <LeftSessionPage entry={entries[flipping.to]} onImageClick={(url) => openPopup("image", url)} onDelete={() => {}} deleting={false} />
                    : <RightSessionPage entry={entries[flipping.to]} onExpand={openPopup} />}
                </div>
              </div>
            )}

            {/* Cover */}
            {coverState !== "open" && (
              <>
                <div
                  className="jv-cover-left"
                  style={{ opacity: coverState === "animating" ? 0 : 1 }}
                />
                <div className={`jv-cover${coverState === "animating" ? " jv-cover-flipping" : ""}`}>
                  <div className="jv-cover-front">
                    <span className="c-orn">✦</span>
                    <span className="c-t">Arverié</span>
                    <div className="c-d" />
                  </div>
                  <div className="jv-cover-back" />
                </div>
              </>
            )}
          </div>

          {opened && (
            <div className="journal-controls">
              <button onClick={() => flip("b")} disabled={busy || cur === 0}>← Prev</button>
              <span className="journal-page-indicator">{cur + 1} / {entries.length}</span>
              <button onClick={() => flip("f")} disabled={busy || cur === entries.length - 1}>Next →</button>
            </div>
          )}
        </>
      ) : (
        <div className="journal-empty">
          <h3 className="journal-subheading">No completed sessions yet</h3>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(245,237,218,0.65)", marginTop: 8 }}>
            Finish a canvas session and your journal pages will appear here.
          </p>
        </div>
      )}

      {popup && (
        <Popup onClose={closePopup} type={popup.type}>
          <PopupContent type={popup.type} entry={popup.data} />
        </Popup>
      )}
    </div>
  );
}
