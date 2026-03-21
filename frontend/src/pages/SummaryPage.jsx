import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import TopBar from "../components/TopBar";
import OrnamentalDivider from "../components/OrnamentalDivider";
import { useApp } from "../context/AppContext";
import { api } from "../utils/api";

const FALLBACK =
  "You showed up today. That is enough. Whatever you carried here, you set it down long enough to let something move through your hands. The marks you made are yours — honest, unhurried, alive. There is a kind of courage in that.";

function LoadingDots() {
  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        justifyContent: "center",
        padding: "48px 0",
      }}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 0.9,
            delay: i * 0.18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            width: "9px",
            height: "9px",
            borderRadius: "50%",
            background: "var(--gold)",
          }}
        />
      ))}
    </div>
  );
}

export default function SummaryPage() {
  const navigate = useNavigate();
  const { session, setReflection } = useApp();

  // Stages: 'questions' | 'loading' | 'letter'
  const [stage, setStage] = useState("questions");
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");

  const [fullText, setFullText] = useState("");
  const [displayed, setDisplayed] = useState("");
  const intervalRef = useRef(null);

  const durationMin = session.startTime
    ? Math.round((Date.now() - session.startTime) / 60_000)
    : 41;

  const colorsUsed =
    session.paintColors && session.paintColors.length > 0
      ? Array.from(new Set(session.paintColors)).slice(0, 5)
      : ["#2d4a3e", "#7a3b2e", "#b07a3a"]; // fallback for preview if empty

  // Typewriter effect
  useEffect(() => {
    if (stage === "letter" && fullText) {
      setDisplayed("");
      let i = 0;
      intervalRef.current = setInterval(() => {
        i++;
        setDisplayed(fullText.slice(0, i));
        if (i >= fullText.length) clearInterval(intervalRef.current);
      }, 28);
      return () => clearInterval(intervalRef.current);
    }
  }, [stage, fullText]);

  async function handleGenerateLetter() {
    setStage("loading");
    try {
      const res = await api.reflection({
        mood: session.mood || "present",
        moodColor: session.moodColor,
        guided: session.guided,
        duration: durationMin,
        erasureCount: session.erasureCount,
        paintColors: colorsUsed,
        answers: { q1, q2 },
      });
      const text = res.reflection || res.text || FALLBACK;
      setFullText(text);
      setReflection(text);
    } catch {
      setFullText(FALLBACK);
      setReflection(FALLBACK);
    } finally {
      setStage("letter");
    }
  }

  async function handleSave() {
    await api.saveJournal({
      reflection: fullText,
      mood: session.mood,
      moodColor: session.moodColor,
      duration: durationMin,
      drawingDataURL: session.drawingDataURL,
      date: new Date().toISOString(),
    });
    navigate("/");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        paddingTop: "64px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <TopBar />

      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          padding: "48px 20px 80px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Always show the drawing preview */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h2
            style={{
              fontFamily: "IM Fell English, serif",
              fontSize: "27px",
              fontStyle: "italic",
              marginBottom: "16px",
              color: "var(--text)",
            }}
          >
            Your Canvas
          </h2>
          <div
            className="drawing-frame"
            style={{
              border: "1px solid rgba(160,120,60,0.3)",
              borderRadius: "8px",
              overflow: "hidden",
              background: "#faf2de",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              minHeight: "200px",
            }}
          >
            {session.drawingDataURL ? (
              <img
                src={session.drawingDataURL}
                alt="Your painting"
                style={{ width: "100%", display: "block" }}
              />
            ) : (
              <p
                style={{
                  fontFamily: "IM Fell English, serif",
                  fontStyle: "italic",
                  color: "var(--text-muted)",
                }}
              >
                your painting
              </p>
            )}
          </div>

          {/* Colors used */}
          <div
            style={{
              marginTop: "20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: "Cinzel, serif",
                fontSize: "13px",
                letterSpacing: "0.15em",
                color: "var(--text-muted)",
                marginBottom: "8px",
              }}
            >
              COLORS EXPLORED
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              {colorsUsed.map((c, i) => (
                <div
                  key={i}
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: c,
                    border: "1px solid var(--border)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <OrnamentalDivider />

        <div
          style={{
            marginTop: "32px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <AnimatePresence mode="wait">
            {stage === "questions" && (
              <motion.div
                key="questions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={{ width: "100%" }}
              >
                <div className="card" style={{ padding: "32px" }}>
                  <h3
                    style={{
                      fontFamily: "Cinzel, serif",
                      fontSize: "12px",
                      letterSpacing: "0.15em",
                      color: "var(--text-muted)",
                      textAlign: "center",
                      marginBottom: "24px",
                    }}
                  >
                    BEFORE WE CLOSE...
                  </h3>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "20px",
                      marginBottom: "32px",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontFamily: "IM Fell English, serif",
                          fontStyle: "italic",
                          fontSize: "21px",
                          color: "var(--text)",
                          marginBottom: "8px",
                        }}
                      >
                        How do you feel after creating this?
                      </p>
                      <input
                        value={q1}
                        onChange={(e) => setQ1(e.target.value)}
                        placeholder="It feels..."
                        style={{
                          width: "100%",
                          background: "transparent",
                          border: "none",
                          borderBottom: "1px solid var(--border-gold)",
                          padding: "8px 0",
                          outline: "none",
                          fontFamily: "IM Fell English, serif",
                          color: "var(--text)",
                          fontSize: "18px",
                        }}
                      />
                    </div>
                    <div>
                      <p
                        style={{
                          fontFamily: "IM Fell English, serif",
                          fontStyle: "italic",
                          fontSize: "21px",
                          color: "var(--text)",
                          marginBottom: "8px",
                        }}
                      >
                        What comes to mind when looking at it now?
                      </p>
                      <input
                        value={q2}
                        onChange={(e) => setQ2(e.target.value)}
                        placeholder="I notice..."
                        style={{
                          width: "100%",
                          background: "transparent",
                          border: "none",
                          borderBottom: "1px solid var(--border-gold)",
                          padding: "8px 0",
                          outline: "none",
                          fontFamily: "IM Fell English, serif",
                          color: "var(--text)",
                          fontSize: "18px",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <button
                      className="btn btn-primary"
                      disabled={!q1.trim() || !q2.trim()}
                      onClick={handleGenerateLetter}
                      style={{ padding: "12px 32px" }}
                    >
                      Receive your letter
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {stage === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ textAlign: "center", padding: "40px 0" }}
              >
                <p
                  style={{
                    fontFamily: "Cinzel, serif",
                    fontSize: "10px",
                    letterSpacing: "0.15em",
                    color: "var(--text-muted)",
                  }}
                >
                  COMPOSING YOUR LETTER
                </p>
                <LoadingDots />
              </motion.div>
            )}

            {stage === "letter" && (
              <motion.div
                key="letter"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
                style={{ padding: "32px" }}
              >
                <h3
                  style={{
                    fontFamily: "Cinzel, serif",
                    fontSize: "15px",
                    letterSpacing: "0.15em",
                    color: "var(--text-muted)",
                    textAlign: "center",
                    marginBottom: "24px",
                  }}
                >
                  A RECORD OF YOUR TIME
                </h3>

                <div style={{ marginBottom: "24px" }}>
                  <p
                    style={{
                      fontFamily: "IM Fell English, serif",
                      fontStyle: "italic",
                      fontSize: "19px",
                      lineHeight: 1.8,
                      color: "var(--text)",
                      opacity: 0.85,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "Georgia, serif",
                        fontSize: "23px",
                        lineHeight: 0,
                        verticalAlign: "-5px",
                        opacity: 0.35,
                      }}
                    >
                      "
                    </span>
                    {displayed}
                    {displayed.length >= fullText.length && (
                      <span
                        style={{
                          fontFamily: "Georgia, serif",
                          fontSize: "23px",
                          lineHeight: 0,
                          verticalAlign: "-5px",
                          opacity: 0.35,
                        }}
                      >
                        "
                      </span>
                    )}
                  </p>
                </div>

                {displayed.length >= fullText.length && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    style={{ textAlign: "center" }}
                  >
                    <button
                      className="btn"
                      onClick={handleSave}
                      style={{ padding: "10px 24px" }}
                    >
                      Close Journal
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
