import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import TopBar from "../components/TopBar";
import OrnamentalDivider from "../components/OrnamentalDivider";
import { useApp } from "../context/AppContext";
import { useCanvasBehavior } from "../hooks/useCanvasBehavior";
import { api } from "../utils/api";

/* ─── AI companion panel ─── */
function AIPanel({ open, onToggle, messages, onSend }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  }

  return (
    <div style={{ position: "relative", display: "flex", height: "100%" }}>
      {/* Toggle tab — always visible */}
      <button
        onClick={onToggle}
        style={{
          position: "absolute",
          left: 0,
          top: "50%",
          transform: "translateY(-50%)",
          width: "28px",
          height: "60px",
          background: "var(--bg-card)",
          border: "1px solid var(--border-gold)",
          borderRight: "none",
          borderRadius: "var(--radius-sm) 0 0 var(--radius-sm)",
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
            stroke="var(--gold)"
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
          background: "var(--bg-card)",
          borderLeft: open ? "1px solid var(--border-gold)" : "none",
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
                padding: "12px",
                overflow: "hidden",
                minWidth: "300px",
              }}
            >
              <OrnamentalDivider
                label="reflections"
                style={{ margin: "4px 0 12px" }}
              />

              {/* Messages */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  paddingRight: "4px",
                }}
              >
                {messages.length === 0 && (
                  <p
                    style={{
                      fontFamily: "IM Fell English, serif",
                      fontStyle: "italic",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      textAlign: "center",
                      marginTop: "24px",
                    }}
                  >
                    I'm here, watching what you create...
                  </p>
                )}
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      alignSelf:
                        msg.role === "user" ? "flex-end" : "flex-start",
                      maxWidth: "92%",
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      background:
                        msg.role === "assistant"
                          ? "rgba(200,160,40,0.06)"
                          : "rgba(200,160,40,0.1)",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "IM Fell English, serif",
                        fontStyle: "italic",
                        fontSize: "13px",
                        lineHeight: 1.7,
                        color: "var(--text)",
                      }}
                    >
                      {msg.content}
                    </p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                  borderTop: "1px solid var(--border)",
                  paddingTop: "10px",
                  marginTop: "8px",
                }}
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="respond..."
                  style={{
                    flex: 1,
                    fontFamily: "IM Fell English, serif",
                    fontStyle: "italic",
                    fontSize: "13px",
                    color: "var(--text)",
                    background: "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    padding: "8px 12px",
                    outline: "none",
                  }}
                />
                <button
                  onClick={send}
                  className="btn"
                  style={{
                    padding: "7px 12px",
                    fontSize: "12px",
                    flexShrink: 0,
                  }}
                >
                  send
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* ─── CanvasPage ─── */
export default function CanvasPage() {
  const navigate = useNavigate();
  const { session, setSession } = useApp();

  const [editor, setEditor] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [messages, setMessages] = useState([]);

  const { resetIdle } = useCanvasBehavior({
    onIdleSignal: () => {
      if (session.guided) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: "Take your time... what feels unfinished right now?",
          },
        ]);
        if (!aiOpen) setAiOpen(true);
      }
    },
  });

  async function handleSendMessage(text) {
    const msgs = [...messages, { role: "user", content: text }];
    setMessages(msgs);
    const res = await api.chat({
      messages: msgs,
      session: { mood: session.mood, guided: session.guided },
    });
    setMessages([
      ...msgs,
      { role: "assistant", content: res.reply || res.content || "..." },
    ]);
  }

  async function handleFinish() {
    if (!editor) {
      navigate("/summary");
      return;
    }

    const shapeIds = Array.from(editor.getCurrentPageShapeIds());
    if (shapeIds.length === 0) {
      setSession((s) => ({ ...s, endTime: Date.now() }));
      navigate("/summary");
      return;
    }

    try {
      const { blob } = await editor.toImage(shapeIds, { format: "png", background: true, padding: 16 });

      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const dataURL = reader.result;
        setSession((s) => ({
          ...s,
          drawingDataURL: dataURL,
          endTime: Date.now(),
        }));
        navigate("/summary");
      };
    } catch (e) {
      console.error("Failed to export Tldraw canvas:", e);
      setSession((s) => ({ ...s, endTime: Date.now() }));
      navigate("/summary");
    }
  }

  return (
    <div
      className="canvas-layout"
      style={{ height: "100vh", display: "flex", flexDirection: "column" }}
    >
      {/* Top bar */}
      <div
        style={{
          height: "48px",
          background: "rgba(242,232,213,0.92)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "Cinzel, serif",
            fontSize: "15px",
            color: "#1a3a30",
            letterSpacing: "0.12em",
          }}
        >
          Arverié
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <TopBar
            style={{
              position: "static",
              height: "auto",
              background: "none",
              border: "none",
              padding: 0,
              backdropFilter: "none",
            }}
          >
            <button
              className="btn"
              onClick={handleFinish}
              style={{ padding: "6px 16px", fontSize: "14px" }}
            >
              Finish session
            </button>
          </TopBar>
        </div>
      </div>

      {/* Main area */}
      <div
        style={{ flex: 1, display: "flex", overflow: "hidden" }}
        onPointerMove={resetIdle}
      >
        {/* Drawing area */}
        <div style={{ flex: 1, position: "relative" }}>
          <Tldraw onMount={setEditor} />
        </div>

        {/* AI panel */}
        <AIPanel
          open={aiOpen}
          onToggle={() => setAiOpen((o) => !o)}
          messages={messages}
          onSend={handleSendMessage}
        />
      </div>
    </div>
  );
}
