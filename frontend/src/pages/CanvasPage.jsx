import { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import TopBar from "../components/TopBar";
import OrnamentalDivider from "../components/OrnamentalDivider";
import DrawingCanvas from "../components/DrawingCanvas";
import CanvasToolbar from "../components/CanvasToolbar";
import { useApp } from "../context/AppContext";
import { api } from "../utils/api";
import {
  computeSnapshot,
  buildCanvasSummary,
} from "../hooks/useSnapshotMetrics";
import { useHumeVoice } from "../hooks/useHumeVoice";

const SNAPSHOT_INTERVAL_MS = 7000;

function isFillerMessage(value) {
  if (typeof value !== "string") return false;
  const text = value.trim().toLowerCase();
  if (!text) return false;
  if (text.length > 20) return false;
  return /^(h+m+|h+mm+|h+mmm+|um+|uh+|mm+|mmm+|huh+|hm+|okay+|ok+|k+)[.!?]*$/.test(
    text,
  );
}

// ─── AI Companion Panel ──────────────────────────────────────────────────────

function AIPanel({
  open,
  onToggle,
  messages,
  isConnected,
  isSpeaking,
  onSendMessage,
}) {
  const messagesEndRef = useRef(null);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || sending) return;
    setInputValue("");
    setSending(true);
    try {
      await onSendMessage?.(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ position: "relative", display: "flex", height: "100%" }}>
      {/* Slide tab */}
      <button
        onClick={onToggle}
        style={{
          position: "absolute",
          left: 0,
          top: "50%",
          transform: "translateY(-50%)",
          width: "28px",
          height: "60px",
          background: "rgba(245,235,208,0.95)",
          border: "1px solid rgba(200,168,40,0.4)",
          borderRight: "none",
          borderRadius: "6px 0 0 6px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 20,
          marginLeft: "-28px",
        }}
      >
        <svg
          width="7"
          height="12"
          viewBox="0 0 7 12"
          fill="none"
          style={{
            transform: open ? "rotate(0)" : "rotate(180deg)",
            transition: "transform 0.3s",
          }}
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
        transition={{ type: "spring", damping: 22, stiffness: 180 }}
        style={{
          height: "100%",
          background: "rgba(245,235,208,0.97)",
          borderLeft: open ? "1px solid rgba(200,168,40,0.3)" : "none",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
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
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                padding: "14px",
                overflow: "hidden",
                minWidth: "300px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                }}
              >
                <OrnamentalDivider
                  label="reflections"
                  style={{ flex: 1, margin: "4px 0" }}
                />
                {/* Voice status indicator */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    marginLeft: "8px",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: isSpeaking
                        ? "#c8a040"
                        : isConnected
                          ? "#5a8a5a"
                          : "#888",
                      transition: "background 0.3s",
                      boxShadow: isConnected ? "0 0 4px currentColor" : "none",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "Cinzel, serif",
                      fontSize: "9px",
                      letterSpacing: "0.08em",
                      color: "rgba(80,55,30,0.5)",
                    }}
                  >
                    {isSpeaking
                      ? "speaking"
                      : isConnected
                        ? "listening"
                        : "offline"}
                  </span>
                </div>
              </div>

              {/* Messages area */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  paddingRight: "4px",
                  paddingTop: "8px",
                }}
              >
                {messages.length === 0 ? (
                  <p
                    style={{
                      fontFamily: "IM Fell English, serif",
                      fontStyle: "italic",
                      fontSize: "16px",
                      lineHeight: 1.75,
                      color: "rgba(80,55,30,0.45)",
                      textAlign: "center",
                      padding: "0 8px",
                      margin: "auto 0",
                    }}
                  >
                    I am here, watching what you create...
                  </p>
                ) : (
                  messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        background:
                          msg.role === "assistant"
                            ? "rgba(200,160,40,0.1)"
                            : "rgba(80,55,30,0.05)",
                        borderLeft:
                          msg.role === "assistant"
                            ? "2px solid rgba(200,160,40,0.4)"
                            : "2px solid transparent",
                      }}
                    >
                      <p
                        style={{
                          fontFamily: "IM Fell English, serif",
                          fontStyle: "italic",
                          fontSize: "15px",
                          lineHeight: 1.6,
                          color:
                            msg.role === "assistant"
                              ? "rgba(80,55,30,0.85)"
                              : "rgba(80,55,30,0.6)",
                        }}
                      >
                        {msg.content}
                      </p>
                      {msg.timestamp && (
                        <p
                          style={{
                            fontFamily: "Cinzel, serif",
                            fontSize: "9px",
                            color: "rgba(80,55,30,0.3)",
                            marginTop: "4px",
                          }}
                        >
                          {msg.timestamp}
                        </p>
                      )}
                    </motion.div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSubmit}
                style={{
                  display: "flex",
                  gap: "6px",
                  paddingTop: "10px",
                  borderTop: "1px solid rgba(200,168,40,0.2)",
                }}
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Write to Arverie..."
                  disabled={sending}
                  style={{
                    flex: 1,
                    padding: "7px 10px",
                    fontFamily: "IM Fell English, serif",
                    fontSize: "13px",
                    color: "rgba(80,55,30,0.85)",
                    background: "rgba(255,250,235,0.8)",
                    border: "1px solid rgba(200,168,40,0.35)",
                    borderRadius: "6px",
                    outline: "none",
                    opacity: sending ? 0.6 : 1,
                  }}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || sending}
                  style={{
                    width: "32px",
                    height: "32px",
                    flexShrink: 0,
                    background: "rgba(200,160,40,0.15)",
                    border: "1px solid rgba(200,168,40,0.4)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: inputValue.trim() && !sending ? 1 : 0.45,
                    transition: "opacity 0.15s",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M1 6h10M7 2l4 4-4 4"
                      stroke="#c8a040"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ─── Paper grain background ──────────────────────────────────────────────────

const GRAIN_BG = {
  background: "#faf2de",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E")`,
  backgroundSize: "200px 200px",
};

// ─── CanvasPage ──────────────────────────────────────────────────────────────

export default function CanvasPage() {
  const navigate = useNavigate();
  const { session, setSession } = useApp();

  const [brush, setBrush] = useState("pencil");
  const [color, setColor] = useState("#1d1d1d");
  const [size, setSize] = useState(20);
  const [opacity, setOpacity] = useState(0.85);
  const [aiOpen, setAiOpen] = useState(false);

  // Dialogue messages shown in AIPanel
  const [messages, setMessages] = useState(() => {
    if (session.openingResponse) {
      return [
        {
          role: "assistant",
          content: session.openingResponse,
          timestamp: "0:00",
        },
      ];
    }
    return [];
  });

  // Finishing state
  const [finishing, setFinishing] = useState(false);
  const finishingRef = useRef(false);

  const canvasRef = useRef(null);
  const canvasAreaRef = useRef(null); // for canvas dimensions
  const sessionStartRef = useRef(session.startTime || Date.now());

  // Raw behavioral data ref — never triggers re-renders
  const behaviorData = useRef({
    strokes: [],
    erasures: [],
    colorChanges: [],
    brushChanges: [],
    opacityChanges: [],
    idleMoments: [],
  });

  const prevColor = useRef(color);
  const prevBrush = useRef(brush);
  const prevOpacity = useRef(opacity);
  const idleTimer = useRef(null);
  const idleStart = useRef(null);
  const dialogueRef = useRef(messages); // keep dialogue in sync for snapshot calls

  // Keep dialogueRef in sync
  useEffect(() => {
    dialogueRef.current = messages;
  }, [messages]);

  // ── Hume voice ──
  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const handleSendMessage = useCallback(
    async (text) => {
      const trimmed = (text || "").trim();
      if (!trimmed) return;
      if (isFillerMessage(trimmed)) return;
      if (trimmed.length > 1200) {
        console.warn("[CanvasPage] Message too long; max 1200 characters");
        return;
      }

      const elapsed = (Date.now() - sessionStartRef.current) / 1000;
      const mm = String(Math.floor(elapsed / 60)).padStart(1, "0");
      const ss = String(Math.floor(elapsed % 60)).padStart(2, "0");
      addMessage({
        role: "user",
        content: trimmed,
        timestamp: `${mm}:${ss}`,
      });
      if (!session.sessionId) return;
      try {
        const result = await api.sendMessage(
          session.sessionId,
          trimmed,
          dialogueRef.current,
        );
        addMessage({
          role: "assistant",
          content: result.response,
          timestamp: `${mm}:${ss}`,
        });
        setAiOpen(true);
      } catch (err) {
        console.error("[CanvasPage] sendMessage failed:", err);
      }
    },
    [addMessage, session.sessionId],
  );

  const {
    isConnected,
    isSpeaking,
    connect: connectHume,
    disconnect: disconnectHume,
  } = useHumeVoice({
    onTranscript: useCallback(
      (text) => {
        const elapsed = (Date.now() - sessionStartRef.current) / 1000;
        const mm = String(Math.floor(elapsed / 60)).padStart(1, "0");
        const ss = String(Math.floor(elapsed % 60)).padStart(2, "0");
        addMessage({ role: "user", content: text, timestamp: `${mm}:${ss}` });
      },
      [addMessage],
    ),
    onAIMessage: useCallback(
      (text) => {
        const elapsed = (Date.now() - sessionStartRef.current) / 1000;
        const mm = String(Math.floor(elapsed / 60)).padStart(1, "0");
        const ss = String(Math.floor(elapsed % 60)).padStart(2, "0");
        addMessage({
          role: "assistant",
          content: text,
          timestamp: `${mm}:${ss}`,
        });
      },
      [addMessage],
    ),
  });

  // Connect Hume on mount if we have a sessionId
  useEffect(() => {
    if (session.sessionId) {
      api
        .getWsToken(session.sessionId)
        .then(({ ws_token }) => connectHume(session.sessionId, ws_token))
        .catch((err) => {
          console.warn(
            "[CanvasPage] WS token request failed, trying compatibility mode",
            err,
          );
          return connectHume(session.sessionId);
        })
        .catch((err) =>
          console.error("[CanvasPage] Hume connect failed:", err),
        );
    }
    return () => {
      disconnectHume();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.sessionId]);

  // ── Canvas snapshot polling ──
  useEffect(() => {
    if (!session.sessionId) return;
    const canvasEl = canvasAreaRef.current;

    const interval = setInterval(async () => {
      if (finishingRef.current) return;
      const w = canvasEl?.offsetWidth || 0;
      const h = canvasEl?.offsetHeight || 0;

      const snapshot = computeSnapshot(
        behaviorData.current,
        w,
        h,
        sessionStartRef.current,
      );

      try {
        const result = await api.sendSnapshot(
          session.sessionId,
          snapshot,
          dialogueRef.current,
          session.themes,
        );

        if (result.triggered && result.response) {
          const elapsed = snapshot.elapsed_seconds;
          const mm = String(Math.floor(elapsed / 60)).padStart(1, "0");
          const ss = String(Math.floor(elapsed % 60)).padStart(2, "0");
          const entry = {
            role: "assistant",
            content: result.response,
            timestamp: `${mm}:${ss}`,
            trigger: result.trigger_type || null,
          };
          setMessages((prev) => [...prev, entry]);
          // Auto-open AIPanel on first trigger
          setAiOpen(true);
        }
      } catch (err) {
        console.error("[CanvasPage] Snapshot failed:", err);
      }
    }, SNAPSHOT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [session.sessionId, session.themes]);

  // ── Idle detection ──
  const resetIdleTimer = useCallback(() => {
    if (idleStart.current !== null) {
      behaviorData.current.idleMoments.push({
        timestamp: idleStart.current,
        duration: Date.now() - idleStart.current,
      });
      idleStart.current = null;
    }
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      idleStart.current = Date.now();
    }, 30_000);
  }, []);

  useEffect(() => () => clearTimeout(idleTimer.current), []);

  // ── Track color changes ──
  const colorRecordTimer = useRef(null);
  useEffect(() => {
    if (color === prevColor.current) return;
    clearTimeout(colorRecordTimer.current);
    const from = prevColor.current;
    colorRecordTimer.current = setTimeout(() => {
      behaviorData.current.colorChanges.push({
        from,
        to: color,
        timestamp: Date.now(),
      });
      prevColor.current = color;
    }, 400);
    setSession((s) => {
      const last = s.paintColors[s.paintColors.length - 1];
      if (last === color) return s;
      return { ...s, paintColors: [...s.paintColors, color] };
    });
    return () => clearTimeout(colorRecordTimer.current);
  }, [color, setSession]);

  // ── Track brush changes ──
  useEffect(() => {
    if (brush === prevBrush.current) return;
    behaviorData.current.brushChanges.push({
      from: prevBrush.current,
      to: brush,
      timestamp: Date.now(),
    });
    prevBrush.current = brush;
  }, [brush]);

  // ── CSS brush size var ──
  useEffect(() => {
    document.documentElement.style.setProperty("--brush-size", size + "px");
  }, [size]);

  // ── Track opacity changes ──
  const opacityRecordTimer = useRef(null);
  useEffect(() => {
    if (opacity === prevOpacity.current) return;
    clearTimeout(opacityRecordTimer.current);
    const from = prevOpacity.current;
    opacityRecordTimer.current = setTimeout(() => {
      behaviorData.current.opacityChanges.push({
        from,
        to: opacity,
        timestamp: Date.now(),
      });
      prevOpacity.current = opacity;
    }, 400);
    return () => clearTimeout(opacityRecordTimer.current);
  }, [opacity]);

  // ── Stroke + erase callbacks ──
  const handleStroke = useCallback((data) => {
    behaviorData.current.strokes.push(data);
  }, []);

  const handleErase = useCallback(
    (data) => {
      behaviorData.current.erasures.push(data);
      setSession((s) => ({ ...s, erasureCount: s.erasureCount + 1 }));
    },
    [setSession],
  );

  // ── Finish session ──
  async function handleFinish() {
    if (finishing) return;
    finishingRef.current = true;
    setFinishing(true);

    disconnectHume();

    const dataURL = canvasRef.current?.getDataURL() ?? null;
    const canvasEl = canvasAreaRef.current;

    // Flush any open idle period
    if (idleStart.current !== null) {
      behaviorData.current.idleMoments.push({
        timestamp: idleStart.current,
        duration: Date.now() - idleStart.current,
      });
    }

    const w = canvasEl?.offsetWidth || 0;
    const h = canvasEl?.offsetHeight || 0;
    const canvasSummary = buildCanvasSummary(
      behaviorData.current,
      w,
      h,
      sessionStartRef.current,
    );

    // Always store drawing locally for fallback
    if (dataURL) localStorage.setItem("session.drawingDataURL", dataURL);

    if (session.sessionId && dataURL) {
      try {
        const result = await api.endSession(
          session.sessionId,
          dataURL,
          canvasSummary,
          dialogueRef.current,
        );
        localStorage.setItem(
          "session.endPayload",
          JSON.stringify({
            drawing_url: result.drawing_url || "",
            vision_description: result.vision_description || "",
            reflection_questions: result.reflection_questions || [],
            canvas_summary: canvasSummary,
          }),
        );
        setSession((s) => ({
          ...s,
          drawingDataURL: dataURL,
          drawingUrl: result.drawing_url,
          visionDescription: result.vision_description,
          reflectionQuestions: result.reflection_questions || [],
          canvasSummary,
          dialogueHistory: dialogueRef.current,
          endTime: Date.now(),
        }));
      } catch (err) {
        console.error("[CanvasPage] Session end failed:", err);
        localStorage.setItem(
          "session.endPayload",
          JSON.stringify({
            drawing_url: "",
            vision_description: "",
            reflection_questions: [],
            canvas_summary: canvasSummary,
          }),
        );
        setSession((s) => ({
          ...s,
          drawingDataURL: dataURL,
          canvasSummary,
          dialogueHistory: dialogueRef.current,
          endTime: Date.now(),
        }));
      }
    } else {
      setSession((s) => ({
        ...s,
        drawingDataURL: dataURL,
        canvasSummary,
        dialogueHistory: dialogueRef.current,
        endTime: Date.now(),
      }));
    }

    navigate("/summary");
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <TopBar
        style={{
          position: "relative",
          height: "64px",
          background: "rgba(245,235,208,0.95)",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          padding: "0 24px",
          flexShrink: 0,
          borderBottom: "1px solid rgba(200,168,40,0.25)",
        }}
      >
        <button
          className="btn"
          onClick={handleFinish}
          disabled={finishing}
          style={{
            padding: "6px 18px",
            fontSize: "13px",
            opacity: finishing ? 0.6 : 1,
          }}
        >
          {finishing ? "Saving..." : "Finish Session"}
        </button>
      </TopBar>

      {/* Main row */}
      <div
        style={{ flex: 1, display: "flex", overflow: "hidden" }}
        onPointerMove={resetIdleTimer}
      >
        {/* Canvas column */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Drawing area */}
          <div
            ref={canvasAreaRef}
            data-cursor="canvas"
            style={{ flex: 1, position: "relative", overflow: "hidden" }}
          >
            <div style={{ position: "absolute", inset: 0, ...GRAIN_BG }} />
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

          {/* Toolbar */}
          <CanvasToolbar
            brush={brush}
            onBrushChange={setBrush}
            color={color}
            onColorChange={setColor}
            size={size}
            onSizeChange={setSize}
            opacity={opacity}
            onOpacityChange={setOpacity}
          />
        </div>

        {/* AI Companion Panel */}
        <AIPanel
          open={aiOpen}
          onToggle={() => setAiOpen((o) => !o)}
          messages={messages}
          isConnected={isConnected}
          isSpeaking={isSpeaking}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}
