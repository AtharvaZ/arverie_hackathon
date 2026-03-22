import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import OrnamentalDivider from "../components/OrnamentalDivider";
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

function toSeconds(sessionRow, data) {
  const directDuration = Number(sessionRow?.duration_seconds);
  if (Number.isFinite(directDuration) && directDuration > 0)
    return directDuration;

  const dataDuration = Number(data?.duration_seconds);
  if (Number.isFinite(dataDuration) && dataDuration > 0) return dataDuration;

  const summaryDuration = Number(data?.canvas_summary?.total_time_seconds);
  if (Number.isFinite(summaryDuration) && summaryDuration > 0)
    return summaryDuration;

  return 0;
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

  return unique.slice(0, 6);
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
  const duration =
    seconds > 0
      ? `${Math.max(1, Math.round(seconds / 60))} min`
      : "Unknown duration";
  const palette = collectPalette(data);
  const questions = buildAnsweredQuestions(data);
  const letter = toText(data?.letter, "No letter saved for this session yet.");

  return {
    id: toText(row?.id, crypto.randomUUID()),
    sortDate: validDate ? dateValue.getTime() : 0,
    date: formattedDate,
    mood: toText(row?.mood_checkout || row?.mood_checkin, "Unknown mood"),
    duration,
    drawingUrl: toText(row?.drawing_url || data?.drawing_url, ""),
    palette,
    questions,
    letter,
    moodColor: palette[0] || "#8a7a6a",
  };
}

function JournalCover({ userName, onComplete }) {
  return (
    <motion.div
      initial={{ scale: 0.15, rotateY: -28 }}
      animate={[
        {
          scale: 1,
          rotateY: -28,
          transition: { duration: 0.5, ease: [0.34, 1.2, 0.64, 1] },
        },
        {
          rotateY: 0,
          transition: { duration: 0.85, ease: "easeInOut", delay: 0.5 },
        },
      ]}
      onAnimationComplete={onComplete}
      style={{
        width: "180px",
        height: "240px",
        position: "relative",
        perspective: "1000px",
        transformStyle: "preserve-3d",
        cursor: "default",
      }}
    >
      {/* Cover body */}
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#4a2006",
          borderRadius: "3px 12px 12px 3px",
          border: "1px solid rgba(212,175,55,0.3)",
          boxShadow:
            "6px 6px 28px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,175,55,0.18)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Spine */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "13px",
            background: "#2e1303",
            borderRadius: "3px 0 0 3px",
          }}
        />
        {/* Page edge */}
        <div
          style={{
            position: "absolute",
            right: "-7px",
            top: "5px",
            bottom: "5px",
            width: "8px",
            background: "#f0e4c0",
            borderRadius: "0 2px 2px 0",
            border: "1px solid rgba(170,140,80,0.25)",
          }}
        />
        {/* Ornament diamond */}
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path
            d="M14 2 L26 14 L14 26 L2 14 Z"
            stroke="rgba(212,175,55,0.55)"
            strokeWidth="1"
            fill="none"
          />
          <path
            d="M14 7 L21 14 L14 21 L7 14 Z"
            stroke="rgba(212,175,55,0.3)"
            strokeWidth="0.8"
            fill="none"
          />
        </svg>
        <p
          style={{
            fontFamily: "Cinzel, serif",
            fontSize: "13px",
            color: "rgba(212,175,55,0.9)",
            letterSpacing: "0.1em",
          }}
        >
          {userName || "Journal"}
        </p>
        <div
          style={{
            width: "52px",
            height: "1px",
            background: "rgba(212,175,55,0.28)",
          }}
        />
        <p
          style={{
            fontFamily: "Cinzel, serif",
            fontSize: "8px",
            color: "rgba(212,175,55,0.4)",
            letterSpacing: "0.2em",
          }}
        >
          JOURNAL I
        </p>
      </div>
    </motion.div>
  );
}

function DotRow({ activeCount }) {
  return (
    <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          animate={{
            background:
              i < activeCount
                ? "rgba(212,175,55,0.85)"
                : "rgba(212,175,55,0.18)",
          }}
          transition={{ duration: 0.3 }}
          style={{ width: "7px", height: "7px", borderRadius: "50%" }}
        />
      ))}
    </div>
  );
}

function OverlayModal({ title, children, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(32, 19, 4, 0.66)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 160,
        padding: "20px",
      }}
    >
      <motion.div
        initial={{ y: 18, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 10, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
        style={{
          width: "min(620px, 100%)",
          maxHeight: "78vh",
          overflowY: "auto",
          borderRadius: "12px",
          border: "1px solid rgba(190, 148, 68, 0.35)",
          background: "#fbf3e1",
          boxShadow: "0 20px 56px rgba(0,0,0,0.36)",
          padding: "16px 16px 18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontFamily: "Cinzel, serif",
              fontSize: "12px",
              letterSpacing: "0.12em",
              color: "var(--text-muted)",
            }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              border: "1px solid rgba(190, 148, 68, 0.4)",
              background: "rgba(255, 248, 232, 0.94)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text)",
              fontSize: "14px",
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            X
          </button>
        </div>
        <OrnamentalDivider />
        <div style={{ marginTop: "12px" }}>{children}</div>
      </motion.div>
    </motion.div>
  );
}

function LeftJournalPage({ entry, pageNum }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            fontFamily: "Cinzel, serif",
            fontSize: "9px",
            color: "var(--text-muted)",
          }}
        >
          {pageNum}
        </span>
        <span
          style={{
            fontFamily: "Cinzel, serif",
            fontSize: "9px",
            color: "var(--text-muted)",
          }}
        >
          {entry.date}
        </span>
      </div>

      <div
        className="drawing-frame"
        style={{
          border: "1px solid var(--border)",
          borderRadius: "6px",
          overflow: "hidden",
          marginBottom: "10px",
          background: entry.moodColor ? `${entry.moodColor}22` : "#f0e8d0",
          minHeight: "300px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {entry.drawingUrl ? (
          <img
            src={entry.drawingUrl}
            alt="Session drawing"
            style={{ display: "block", width: "100%" }}
          />
        ) : (
          <svg
            width="120"
            height="72"
            viewBox="0 0 60 36"
            fill="none"
            style={{ opacity: 0.3 }}
          >
            <path
              d="M6 28 C14 10 22 20 30 14 C38 8 44 22 54 8"
              stroke={entry.moodColor || "#c8a040"}
              strokeWidth="1.4"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="6" cy="28" r="2" fill={entry.moodColor || "#c8a040"} />
            <circle cx="30" cy="14" r="2" fill={entry.moodColor || "#c8a040"} />
            <circle cx="54" cy="8" r="2" fill={entry.moodColor || "#c8a040"} />
          </svg>
        )}
      </div>

      <OrnamentalDivider />

      <div
        style={{
          fontFamily: "Cinzel, serif",
          fontSize: "8px",
          letterSpacing: "0.12em",
          color: "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginTop: "12px",
        }}
      >
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: entry.moodColor,
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        {entry.duration.toUpperCase()} . {entry.mood.toUpperCase()}
      </div>
    </div>
  );
}

function RightJournalPage({ entry, pageNum, onOpenQuestions, onOpenLetter }) {
  const hasPalette = entry.palette.length > 0;
  const hasQuestions = entry.questions.length > 0;
  const hasLetter = Boolean(entry.letter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            fontFamily: "Cinzel, serif",
            fontSize: "9px",
            color: "var(--text-muted)",
          }}
        >
          {pageNum}
        </span>
        <span
          style={{
            fontFamily: "Cinzel, serif",
            fontSize: "9px",
            color: "var(--text-muted)",
          }}
        >
          {entry.date}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <section
          className="card"
          style={{ padding: "12px", borderRadius: "7px" }}
        >
          <h4
            style={{
              margin: 0,
              marginBottom: "10px",
              fontFamily: "Cinzel, serif",
              letterSpacing: "0.12em",
              fontSize: "9px",
              color: "var(--text-muted)",
            }}
          >
            Color Palette
          </h4>
          {hasPalette ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {entry.palette.map((color) => (
                <div
                  key={color}
                  title={color}
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    border: "1px solid rgba(145, 108, 50, 0.35)",
                    background: color,
                  }}
                />
              ))}
            </div>
          ) : (
            <p
              style={{
                margin: 0,
                fontFamily: "IM Fell English, serif",
                fontSize: "12px",
                color: "var(--text-muted)",
              }}
            >
              No palette data saved for this session.
            </p>
          )}
        </section>

        <button
          onClick={onOpenQuestions}
          className="card"
          style={{
            borderRadius: "7px",
            padding: "12px",
            background: "rgba(255, 252, 242, 0.92)",
            border: "1px solid rgba(160, 120, 60, 0.22)",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <h4
            style={{
              margin: 0,
              marginBottom: "6px",
              fontFamily: "Cinzel, serif",
              letterSpacing: "0.12em",
              fontSize: "9px",
              color: "var(--text-muted)",
            }}
          >
            Questions Answered
          </h4>
          <p
            style={{
              margin: 0,
              fontFamily: "IM Fell English, serif",
              fontSize: "13px",
              color: "var(--text)",
              opacity: 0.85,
            }}
          >
            {hasQuestions
              ? `${entry.questions.length} answered prompts. Click to read all.`
              : "No answered prompts were saved for this session."}
          </p>
        </button>

        <button
          onClick={onOpenLetter}
          className="card"
          style={{
            borderRadius: "7px",
            padding: "12px",
            background: "rgba(255, 252, 242, 0.92)",
            border: "1px solid rgba(160, 120, 60, 0.22)",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <h4
            style={{
              margin: 0,
              marginBottom: "6px",
              fontFamily: "Cinzel, serif",
              letterSpacing: "0.12em",
              fontSize: "9px",
              color: "var(--text-muted)",
            }}
          >
            Session Letter
          </h4>
          <p
            style={{
              margin: 0,
              fontFamily: "IM Fell English, serif",
              fontSize: "13px",
              color: "var(--text)",
              opacity: 0.85,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
            }}
          >
            {hasLetter ? entry.letter : "No letter saved for this session yet."}
          </p>
        </button>
      </div>
    </div>
  );
}

function PageSpread({
  entry,
  spreadIndex,
  hasPrev,
  hasNext,
  onFlipForward,
  onFlipBack,
  flipping,
  flipDir,
  onOpenQuestions,
  onOpenLetter,
}) {
  const [leftCurl, setLeftCurl] = useState(false);
  const [rightCurl, setRightCurl] = useState(false);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 13px 1fr",
        width: "min(820px, 96vw)",
        border: "1px solid rgba(150,110,55,0.2)",
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0 8px 48px rgba(0,0,0,0.38)",
        position: "relative",
      }}
    >
      <div
        className="journal-ruled"
        style={{
          background: "#faf2de",
          minHeight: "420px",
          padding: "18px 16px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {entry ? (
          <LeftJournalPage entry={entry} pageNum={spreadIndex * 2 + 1} />
        ) : (
          <p
            style={{
              fontFamily: "IM Fell English, serif",
              fontStyle: "italic",
              color: "rgba(58,34,8,0.18)",
              fontSize: "13px",
              textAlign: "center",
              paddingTop: "40px",
            }}
          >
            — empty —
          </p>
        )}
        {entry && hasPrev && (
          <div
            onMouseEnter={() => setLeftCurl(true)}
            onMouseLeave={() => setLeftCurl(false)}
            onClick={onFlipBack}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: 0,
              height: 0,
              borderStyle: "solid",
              borderWidth: leftCurl ? "0 0 44px 44px" : "0",
              borderColor: `transparent transparent transparent rgba(175,145,75,0.35)`,
              cursor: "pointer",
              transition: "border-width 0.25s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        )}
      </div>

      {/* Spine */}
      <div
        style={{
          background:
            "linear-gradient(90deg, rgba(120,85,30,0.1), rgba(170,130,50,0.15), rgba(120,85,30,0.1))",
          zIndex: 4,
        }}
      />

      <div
        className="journal-ruled"
        style={{
          background: "#faf2de",
          minHeight: "420px",
          padding: "18px 16px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {entry ? (
          <RightJournalPage
            entry={entry}
            pageNum={spreadIndex * 2 + 2}
            onOpenQuestions={onOpenQuestions}
            onOpenLetter={onOpenLetter}
          />
        ) : (
          <p
            style={{
              fontFamily: "IM Fell English, serif",
              fontStyle: "italic",
              color: "rgba(58,34,8,0.18)",
              fontSize: "13px",
              textAlign: "center",
              paddingTop: "40px",
            }}
          >
            — end —
          </p>
        )}
        {entry && hasNext && (
          <div
            onMouseEnter={() => setRightCurl(true)}
            onMouseLeave={() => setRightCurl(false)}
            onClick={onFlipForward}
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 0,
              height: 0,
              borderStyle: "solid",
              borderWidth: rightCurl ? "0 44px 44px 0" : "0",
              borderColor: `transparent rgba(175,145,75,0.35) transparent transparent`,
              cursor: "pointer",
              transition: "border-width 0.25s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        )}

        <AnimatePresence>
          {flipping && (
            <motion.div
              initial={{ rotateY: 0 }}
              animate={{ rotateY: flipDir === "forward" ? -180 : 180 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.62, ease: [0.4, 0, 0.2, 1] }}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: flipDir === "forward" ? 0 : "auto",
                right: flipDir === "back" ? 0 : "auto",
                width: "50%",
                background: "#f5ecca",
                transformOrigin:
                  flipDir === "forward" ? "left center" : "right center",
                transformStyle: "preserve-3d",
                zIndex: 10,
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function JournalPage() {
  const navigate = useNavigate();
  const { id: selectedSessionId } = useParams();
  const { session, user, pastSessions, refreshPastSessions } = useApp();
  const [phase, setPhase] = useState("cover");
  const [dotCount, setDotCount] = useState(0);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [flipDir, setFlipDir] = useState(null);
  const [closing, setClosing] = useState(false);
  const [activeModal, setActiveModal] = useState(null);

  useEffect(() => {
    const userId = session.userId || user.id;
    if (!userId) return;
    refreshPastSessions(userId);
  }, [refreshPastSessions, session.userId, user.id]);

  const entries = useMemo(() => {
    return safeArray(pastSessions)
      .map(normalizeSessionRow)
      .sort((a, b) => {
        const aHasDrawing = Boolean(a.drawingUrl);
        const bHasDrawing = Boolean(b.drawingUrl);
        if (aHasDrawing !== bHasDrawing) return aHasDrawing ? -1 : 1;
        return b.sortDate - a.sortDate;
      })
      .slice(0, 5);
  }, [pastSessions]);

  useEffect(() => {
    if (entries.length === 0) {
      setSpreadIndex(0);
      return;
    }

    if (!selectedSessionId) {
      setSpreadIndex((current) => Math.min(current, entries.length - 1));
      return;
    }

    const matchIndex = entries.findIndex(
      (entry) => entry.id === selectedSessionId,
    );
    if (matchIndex >= 0) {
      setSpreadIndex(matchIndex);
    }
  }, [entries, selectedSessionId]);

  function onCoverComplete() {
    setPhase("dots");
    let count = 0;
    const t = setInterval(() => {
      count++;
      setDotCount(count);
      if (count >= 4) {
        clearInterval(t);
        setTimeout(() => setPhase("spread"), 400);
      }
    }, 1000);
  }

  function flipForward() {
    const maxSpread = Math.max(entries.length - 1, 0);
    if (flipping || spreadIndex >= maxSpread) return;
    setFlipping(true);
    setFlipDir("forward");
    setTimeout(() => {
      setSpreadIndex((i) => i + 1);
      setFlipping(false);
      setFlipDir(null);
    }, 340);
  }

  function flipBack() {
    if (flipping || spreadIndex <= 0) return;
    setFlipping(true);
    setFlipDir("back");
    setTimeout(() => {
      setSpreadIndex((i) => i - 1);
      setFlipping(false);
      setFlipDir(null);
    }, 340);
  }

  function handleClose() {
    setClosing(true);
    setTimeout(() => navigate(-1), 380);
  }

  const activeEntry = entries[spreadIndex] || null;
  const maxSpread = Math.max(entries.length - 1, 0);
  const hasPrev = spreadIndex > 0;
  const hasNext = spreadIndex < maxSpread;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      transition={{ duration: 0.38 }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(58,34,8,0.88)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <button
        onClick={handleClose}
        style={{
          position: "fixed",
          top: "18px",
          right: "18px",
          width: "30px",
          height: "30px",
          borderRadius: "50%",
          border: "1px solid rgba(212,175,55,0.35)",
          background: "rgba(255,250,238,0.12)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 110,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path
            d="M1 1 L10 10 M10 1 L1 10"
            stroke="var(--gold)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <AnimatePresence mode="wait">
        {phase === "cover" && (
          <motion.div
            key="cover"
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.28 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <JournalCover
              userName={user?.name || "your journal"}
              onComplete={onCoverComplete}
            />
          </motion.div>
        )}

        {phase === "dots" && (
          <motion.div
            key="dots"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <JournalCover
              userName={user?.name || "your journal"}
              onComplete={() => {}}
            />
            <DotRow activeCount={dotCount} />
          </motion.div>
        )}

        {phase === "spread" && (
          <motion.div
            key="spread"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.42 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            {activeEntry ? (
              <>
                <PageSpread
                  entry={activeEntry}
                  spreadIndex={spreadIndex}
                  hasPrev={hasPrev}
                  hasNext={hasNext}
                  onFlipForward={flipForward}
                  onFlipBack={flipBack}
                  flipping={flipping}
                  flipDir={flipDir}
                  onOpenQuestions={() => setActiveModal("questions")}
                  onOpenLetter={() => setActiveModal("letter")}
                />

                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    className="btn"
                    onClick={flipBack}
                    disabled={!hasPrev}
                    style={{
                      padding: "6px 18px",
                      fontSize: "10px",
                      opacity: hasPrev ? 1 : 0.18,
                    }}
                  >
                    prev
                  </button>
                  <button
                    className="btn"
                    onClick={flipForward}
                    disabled={!hasNext}
                    style={{
                      padding: "6px 18px",
                      fontSize: "10px",
                      opacity: hasNext ? 1 : 0.18,
                    }}
                  >
                    next
                  </button>
                </div>
              </>
            ) : (
              <div
                className="card"
                style={{
                  width: "min(560px, 90vw)",
                  padding: "24px",
                  textAlign: "center",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    marginBottom: "10px",
                    fontFamily: "Cinzel, serif",
                    fontSize: "12px",
                    letterSpacing: "0.12em",
                    color: "var(--text-muted)",
                  }}
                >
                  Journal
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "IM Fell English, serif",
                    fontStyle: "italic",
                    color: "var(--text)",
                    fontSize: "18px",
                    opacity: 0.85,
                  }}
                >
                  No completed sessions yet. Finish a canvas session and your
                  entries will appear here.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "spread" && activeModal === "questions" && activeEntry && (
          <OverlayModal
            title="Answered Questions"
            onClose={() => setActiveModal(null)}
          >
            {activeEntry.questions.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {activeEntry.questions.map((item, index) => (
                  <div
                    key={`${item.question}-${index}`}
                    style={{
                      border: "1px solid rgba(160, 120, 60, 0.2)",
                      borderRadius: "8px",
                      padding: "10px",
                      background: "rgba(255, 250, 238, 0.7)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        marginBottom: "6px",
                        fontFamily: "Cinzel, serif",
                        fontSize: "10px",
                        letterSpacing: "0.08em",
                        color: "var(--text-muted)",
                      }}
                    >
                      {item.question}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontFamily: "IM Fell English, serif",
                        fontStyle: "italic",
                        fontSize: "17px",
                        lineHeight: 1.5,
                        color: "var(--text)",
                      }}
                    >
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p
                style={{
                  margin: 0,
                  fontFamily: "IM Fell English, serif",
                  fontStyle: "italic",
                  fontSize: "18px",
                  color: "var(--text-muted)",
                }}
              >
                No answered prompts were saved for this session.
              </p>
            )}
          </OverlayModal>
        )}

        {phase === "spread" && activeModal === "letter" && activeEntry && (
          <OverlayModal
            title="Session Letter"
            onClose={() => setActiveModal(null)}
          >
            <p
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                fontFamily: "IM Fell English, serif",
                fontStyle: "italic",
                fontSize: "20px",
                lineHeight: 1.7,
                color: "var(--text)",
              }}
            >
              {activeEntry.letter}
            </p>
          </OverlayModal>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
