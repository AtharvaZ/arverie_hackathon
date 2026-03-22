import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

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
  };
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") { resolve(); return; }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(src)), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = false; // keep order: jQuery must load before turn.js
    script.onload = () => { script.dataset.loaded = "true"; resolve(); };
    script.onerror = () => reject(new Error(src));
    document.body.appendChild(script);
  });
}

function LeftSessionPage({ entry }) {
  return (
    <div className="journal-page-content">
      <h3 className="journal-heading">Session — {entry.date}</h3>

      <div className="journal-section">
        <p className="journal-label">Color Palette</p>
        <div className="journal-swatch-row">
          {entry.palette.length > 0 ? (
            entry.palette.map((color) => (
              <div key={`${entry.id}-${color}`} className="swatch-wrap">
                <span className="swatch" style={{ background: color }} />
                <small>{color}</small>
              </div>
            ))
          ) : (
            <p className="journal-body">No palette data saved for this session.</p>
          )}
        </div>
      </div>

      <div className="journal-section">
        <p className="journal-label">Mood</p>
        <p className="journal-body">
          Check-in: <strong>{entry.moodCheckin}</strong>
        </p>
        <p className="journal-body">
          Check-out: <strong>{entry.moodCheckout}</strong>
        </p>
        <p className="journal-body">Duration: {entry.duration}</p>
      </div>

      <div className="journal-section">
        <p className="journal-label">Session Letter</p>
        <p className="journal-body letter-body">{entry.letter}</p>
      </div>
    </div>
  );
}

function RightSessionPage({ entry }) {
  return (
    <div className="journal-page-content">
      <h3 className="journal-heading">Reflection</h3>

      <div className="journal-section">
        <p className="journal-label">Reflection Q&amp;A</p>
        {entry.questions.length > 0 ? (
          entry.questions.map((qa, index) => (
            <div key={`${entry.id}-qa-${index}`} className="qa-block">
              <p className="qa-question">Q: {qa.question}</p>
              <p className="qa-answer">A: {qa.answer}</p>
            </div>
          ))
        ) : (
          <p className="journal-body">No answered prompts were saved for this session.</p>
        )}
      </div>
    </div>
  );
}

export default function JournalPage() {
  const navigate = useNavigate();
  const { session, user, pastSessions, refreshPastSessions } = useApp();
  const [scriptsReady, setScriptsReady] = useState(false);
  const [bookReady, setBookReady] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const flipbookRef = useRef(null);
  const totalPagesRef = useRef(0);

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

  // Load jQuery then turn.js in order
  useEffect(() => {
    let cancelled = false;
    async function ensureLibraries() {
      try {
        if (!window.jQuery) {
          await loadScript("/journal-flip/jquery.js");
        }
        const jq = window.jQuery;
        if (!jq?.fn?.turn) {
          await loadScript("/journal-flip/turn.js");
        }
        if (!cancelled) setScriptsReady(true);
      } catch {
        if (!cancelled) setScriptsReady(false);
      }
    }
    ensureLibraries();
    return () => { cancelled = true; };
  }, []);

  // Init turn.js after scripts + entries are ready
  useEffect(() => {
    if (!scriptsReady || entries.length === 0 || !flipbookRef.current) return;

    const jq = window.jQuery;
    if (!jq?.fn?.turn) return;

    const element = flipbookRef.current;
    const $flipbook = jq(element);

    // Destroy previous instance if any
    if ($flipbook.data("turn")) {
      try { $flipbook.turn("destroy"); } catch (_) { /* ignore */ }
    }

    // Delay slightly so React has committed all children to DOM
    const timer = setTimeout(() => {
      const w = element.offsetWidth || 1000;
      const h = element.offsetHeight || 600;

      $flipbook.turn({
        width: w,
        height: h,
        autoCenter: true,
        gradients: true,
        acceleration: true,
        when: {
          turned: function (e, page) {
            setCurrentPage(page);
          },
        },
      });

      totalPagesRef.current = $flipbook.turn("pages");
      setCurrentPage(1);
      setBookReady(true);
    }, 120);

    return () => {
      clearTimeout(timer);
      if ($flipbook.data("turn")) {
        try { $flipbook.turn("destroy"); } catch (_) { /* ignore */ }
      }
      setBookReady(false);
    };
  }, [scriptsReady, entries]);

  // Keyboard navigation
  useEffect(() => {
    if (!bookReady) return;
    function onKey(e) {
      const jq = window.jQuery;
      if (!jq || !bookReady) return;
      if (e.key === "ArrowLeft") jq(".flipbook").turn("previous");
      if (e.key === "ArrowRight") jq(".flipbook").turn("next");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bookReady]);

  function handlePrev() {
    const jq = window.jQuery;
    if (!jq || !bookReady) return;
    jq(".flipbook").turn("previous");
  }

  function handleNext() {
    const jq = window.jQuery;
    if (!jq || !bookReady) return;
    jq(".flipbook").turn("next");
  }

  return (
    <div className="journal-stage">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@400;500;600&display=swap');

        .journal-stage {
          position: fixed;
          inset: 0;
          background: #1A1614;
          z-index: 120;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 14px;
          padding: 22px 16px;
          overflow: auto;
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
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          line-height: 1;
        }

        .flipbook {
          width: 1000px;
          height: 600px;
          max-width: min(1000px, calc(100vw - 40px));
          max-height: min(600px, calc(100vh - 140px));
        }

        .flipbook .hard {
          background: #5C4033 !important;
          color: #F5EDDA;
          border: 0;
          font-family: 'Cormorant Garamond', serif;
          font-size: 38px;
          font-weight: 600;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 24px;
        }

        .cover-symbol {
          font-family: 'Cormorant Garamond', serif;
          font-size: 48px;
          line-height: 1;
          margin-bottom: 12px;
          opacity: 0.95;
        }

        .cover-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 56px;
          font-style: italic;
          font-weight: 500;
          line-height: 1;
          letter-spacing: 0.01em;
        }

        .cover-subtitle {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          margin-top: 14px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          opacity: 0.75;
        }

        .back-cover-name {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          margin-top: 12px;
          letter-spacing: 0.04em;
          opacity: 0.8;
        }

        .flipbook .page {
          background: #F5EDDA;
          border: 1px solid rgba(92, 64, 51, 0.2);
          color: #2d211c;
          display: flex;
          flex-direction: column;
          padding: 22px 20px;
          overflow: hidden;
        }

        .journal-page-content {
          display: flex;
          flex-direction: column;
          gap: 10px;
          height: 100%;
          overflow: auto;
          padding-right: 4px;
          scrollbar-width: thin;
          scrollbar-color: rgba(92, 64, 51, 0.3) transparent;
        }

        .journal-heading {
          margin: 0 0 2px;
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px;
          font-weight: 600;
          line-height: 1.1;
          border-bottom: 1px solid rgba(92, 64, 51, 0.2);
          padding-bottom: 8px;
        }

        .journal-subheading {
          margin: 0;
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px;
          font-weight: 600;
        }

        .journal-body {
          margin: 0;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          line-height: 1.5;
        }

        .journal-label {
          margin: 0 0 5px;
          font-family: 'Cormorant Garamond', serif;
          font-size: 17px;
          font-weight: 600;
          line-height: 1.15;
        }

        .journal-section {
          border: 1px solid rgba(92, 64, 51, 0.15);
          border-radius: 8px;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.4);
        }

        .journal-swatch-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 4px;
        }

        .swatch-wrap {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          min-width: 48px;
        }

        .swatch-wrap small {
          font-family: 'DM Sans', sans-serif;
          font-size: 9px;
          color: #5c4033;
          text-align: center;
        }

        .swatch {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 1px solid rgba(92, 64, 51, 0.3);
          display: inline-block;
        }

        .letter-body {
          white-space: pre-wrap;
          font-style: italic;
          font-size: 12px;
          opacity: 0.9;
        }

        .qa-block {
          border-top: 1px dashed rgba(92, 64, 51, 0.22);
          padding-top: 7px;
          margin-top: 7px;
        }

        .qa-block:first-child {
          border-top: none;
          padding-top: 0;
          margin-top: 0;
        }

        .qa-question,
        .qa-answer {
          margin: 0;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          line-height: 1.5;
        }

        .qa-question {
          font-weight: 600;
          margin-bottom: 3px;
          color: #3d2b20;
        }

        .journal-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .journal-controls button {
          border: 1px solid rgba(245, 237, 218, 0.45);
          color: #F5EDDA;
          background: rgba(245, 237, 218, 0.08);
          border-radius: 999px;
          padding: 8px 20px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .journal-controls button:hover:not(:disabled) {
          background: rgba(245, 237, 218, 0.15);
        }

        .journal-controls button:disabled {
          opacity: 0.4;
          cursor: default;
        }

        .journal-page-indicator {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          color: rgba(245, 237, 218, 0.5);
          min-width: 80px;
          text-align: center;
        }

        .journal-empty {
          width: min(720px, calc(100vw - 40px));
          border: 1px solid rgba(245, 237, 218, 0.2);
          border-radius: 14px;
          background: rgba(245, 237, 218, 0.06);
          padding: 32px 24px;
          text-align: center;
          color: #F5EDDA;
        }

        .journal-empty .journal-subheading {
          color: #F5EDDA;
          margin-bottom: 10px;
        }
      `}</style>

      <button className="journal-close" onClick={() => navigate(-1)}>✕</button>

      {entries.length > 0 ? (
        <>
          <div className="flipbook" ref={flipbookRef}>
            {/* Front cover */}
            <div className="hard">
              <span className="cover-symbol">✦</span>
              <span className="cover-title">Arverié</span>
              <span className="cover-subtitle">Journal Sessions</span>
            </div>
            {/* Inside front cover (blank) */}
            <div className="hard" />

            {/* Session spreads — left + right page per session */}
            {entries.flatMap((entry) => [
              <div className="page" key={`${entry.id}-left`}>
                <LeftSessionPage entry={entry} />
              </div>,
              <div className="page" key={`${entry.id}-right`}>
                <RightSessionPage entry={entry} />
              </div>,
            ])}

            {/* Inside back cover (blank) */}
            <div className="hard" />
            {/* Back cover */}
            <div className="hard">
              <span className="cover-symbol">✦</span>
              <span className="back-cover-name">{user?.name || "Arverié"}</span>
            </div>
          </div>

          <div className="journal-controls">
            <button onClick={handlePrev} disabled={!bookReady}>← Prev</button>
            <span className="journal-page-indicator">
              {bookReady ? `${currentPage} / ${totalPagesRef.current}` : "…"}
            </span>
            <button onClick={handleNext} disabled={!bookReady}>Next →</button>
          </div>
        </>
      ) : (
        <div className="journal-empty">
          <h3 className="journal-subheading">No completed sessions yet</h3>
          <p className="journal-body" style={{ color: "rgba(245,237,218,0.65)", marginTop: 8 }}>
            Finish a canvas session and your journal pages will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
