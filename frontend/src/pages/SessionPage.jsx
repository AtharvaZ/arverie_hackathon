import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import TopBar from "../components/TopBar";
import OrnamentalDivider from "../components/OrnamentalDivider";
import { useApp } from "../context/AppContext";
import { api } from "../utils/api";

const MOODS = ["heavy", "restless", "foggy", "okay", "light", "tender"];

const PALETTE = [
  "#1a1a2e",
  "#3b4f7a",
  "#2d4a3e",
  "#4a6b4a",
  "#6b3d7a",
  "#7a3b2e",
  "#b07a3a",
  "#c8a040",
  "#8a7a6a",
  "#d4af37",
  "#c4854a",
  "#d4956a",
];

const GUIDE_THEMES = [
  {
    key: "emotion-anchored",
    label: "Emotion-anchored",
    sub: "draw from what you feel right now",
  },
  {
    key: "body-based",
    label: "Body-based",
    sub: "where does it live in your body?",
  },
  {
    key: "narrative",
    label: "Narrative",
    sub: "let an image or story guide you",
  },
];

export default function SessionPage() {
  const navigate = useNavigate();
  const { session, setSession } = useApp();

  const [assistantMode, setAssistantMode] = useState(
    session.interactionMode || null,
  );

  const [moodSelected, setMoodSelected] = useState("");
  const [moodCustom, setMoodCustom] = useState("");
  const mood = moodSelected || moodCustom.trim();

  const [colorSelected, setColorSelected] = useState(null);
  const [colorCustom, setColorCustom] = useState(null);
  const moodColor = colorCustom || colorSelected;

  const [mode, setMode] = useState(null);
  const [intakeText, setIntakeText] = useState(""); // "what's on your mind?"
  const [guideTheme, setGuideTheme] = useState(null); // guided mode only
  const [guideContext, setGuideContext] = useState(""); // guided: extra sentence

  // Stages: 'setup' | 'loading' | 'prompt-reveal' | 'bursting'
  const [stage, setStage] = useState("setup");
  const [drawingPrompt, setDrawingPrompt] = useState(null);

  const modeChosen = assistantMode === "voice" || assistantMode === "text";
  const isGuided = mode === "guided";
  const guidedReady = isGuided && !!guideTheme;
  const isReady = !!(
    modeChosen &&
    mood &&
    moodColor &&
    mode &&
    (!isGuided || guidedReady)
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  async function handleBegin() {
    if (!isReady || stage !== "setup") return;
    setStage("loading");

    try {
      // 1. Start session → get session_id
      const { session_id, session_token, user_token } = await api.startSession(
        session.userId,
      );
      api.setAuthTokens({ sessionToken: session_token, userToken: user_token });

      // 2. Build intake transcript
      const parts = [];
      if (intakeText.trim()) parts.push(intakeText.trim());
      if (isGuided && guideContext.trim()) parts.push(guideContext.trim());
      if (isGuided && guideTheme)
        parts.push(`I chose the ${guideTheme} approach.`);
      const transcript =
        parts.length > 0 ? parts.join(" ") : `I'm feeling ${mood} today.`;

      // 3. Send intake → get themes, drawing_prompt, opening_response
      const intake = await api.sendIntake(session_id, transcript, mood);

      // 4. Store in context
      setSession((s) => ({
        ...s,
        sessionId: session_id,
        mood,
        moodColor,
        interactionMode: assistantMode,
        guided: isGuided,
        guideTheme: isGuided ? guideTheme : null,
        intakeText: transcript,
        themes: intake.themes || [],
        drawingPrompt: intake.drawing_prompt || null,
        openingResponse: intake.opening_response || null,
        startTime: Date.now(),
      }));

      if (isGuided && intake.drawing_prompt) {
        setDrawingPrompt(intake.drawing_prompt);
        setStage("prompt-reveal");
      } else {
        setStage("bursting");
        setTimeout(() => navigate("/canvas"), 780);
      }
    } catch (err) {
      console.error("Session start failed:", err);
      setStage("setup");
    }
  }

  function handlePromptContinue() {
    setStage("bursting");
    setTimeout(() => navigate("/canvas"), 780);
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center w-full"
      style={{ background: "var(--bg)", paddingTop: "52px" }}
    >
      <TopBar />

      {/* Radial burst transition */}
      <AnimatePresence>
        {stage === "bursting" && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 32, opacity: 0 }}
            transition={{ duration: 0.75, ease: "easeInOut" }}
            style={{
              position: "fixed",
              inset: 0,
              margin: "auto",
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: moodColor || "var(--gold)",
              zIndex: 200,
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>

      <div className="flex-1 w-full max-w-4xl px-6 py-12 flex flex-col items-center">
        {/* Loading overlay */}
        <AnimatePresence>
          {stage === "loading" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(var(--bg-rgb, 26,22,16), 0.7)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
                gap: "16px",
              }}
            >
              <div style={{ display: "flex", gap: "10px" }}>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                    transition={{
                      duration: 0.9,
                      delay: i * 0.18,
                      repeat: Infinity,
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
              <p
                style={{
                  fontFamily: "IM Fell English, serif",
                  fontStyle: "italic",
                  color: "var(--text-secondary)",
                  fontSize: "16px",
                }}
              >
                preparing your session...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drawing prompt reveal (guided mode only) */}
        <AnimatePresence>
          {stage === "prompt-reveal" && drawingPrompt && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                position: "fixed",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--bg)",
                zIndex: 150,
                padding: "40px 24px",
              }}
            >
              <div
                className="card"
                style={{
                  maxWidth: "520px",
                  width: "100%",
                  padding: "48px 40px",
                  textAlign: "center",
                }}
              >
                <OrnamentalDivider />
                <p
                  style={{
                    fontFamily: "Cinzel, serif",
                    fontSize: "10px",
                    letterSpacing: "0.15em",
                    color: "var(--text-muted)",
                    marginTop: "24px",
                    marginBottom: "16px",
                  }}
                >
                  YOUR DRAWING PROMPT
                </p>
                <p
                  style={{
                    fontFamily: "IM Fell English, serif",
                    fontStyle: "italic",
                    fontSize: "22px",
                    lineHeight: 1.7,
                    color: "var(--text)",
                    marginBottom: "40px",
                  }}
                >
                  {drawingPrompt}
                </p>
                <OrnamentalDivider />
                <button
                  className="btn btn-primary"
                  onClick={handlePromptContinue}
                  style={{
                    marginTop: "32px",
                    padding: "14px 40px",
                    fontSize: "13px",
                  }}
                >
                  Begin painting
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="text-center mb-12 w-full max-w-md">
          <OrnamentalDivider />
          <h1
            style={{
              fontFamily: "IM Fell English, serif",
              fontStyle: "italic",
              fontSize: "28px",
              color: "var(--text)",
              margin: "24px 0",
            }}
          >
            How are you arriving today?
          </h1>
          <OrnamentalDivider />
        </div>

        {/* Interaction mode chooser (always first) */}
        <div className="w-full mb-6">
          <div className="card p-8 md:col-span-2">
            <h2
              className="text-center mb-8"
              style={{
                fontFamily: "Cinzel, serif",
                fontSize: "12px",
                letterSpacing: "0.15em",
                color: "var(--text-muted)",
              }}
            >
              HOW WOULD YOU LIKE TO TALK TO ARVERIE?
            </h2>
            <div className="flex flex-col sm:flex-row gap-6 justify-center max-w-2xl mx-auto">
              {[
                {
                  key: "voice",
                  label: "Voice AI",
                  sub: "real-time voice companion",
                },
                {
                  key: "text",
                  label: "Text Only",
                  sub: "typed chat with the same check-ins",
                },
              ].map((opt) => (
                <div
                  key={opt.key}
                  onClick={() => setAssistantMode(opt.key)}
                  style={{
                    flex: 1,
                    padding: "28px 24px",
                    borderRadius: "var(--radius-md)",
                    border: `${assistantMode === opt.key ? 2 : 1}px solid ${assistantMode === opt.key ? "var(--gold)" : "var(--border)"}`,
                    background:
                      assistantMode === opt.key
                        ? "var(--gold-wash)"
                        : "transparent",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all var(--transition)",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "Cinzel, serif",
                      fontSize: "15px",
                      color: "var(--text)",
                      marginBottom: "8px",
                    }}
                  >
                    {opt.label}
                  </p>
                  <p
                    style={{
                      fontFamily: "IM Fell English, serif",
                      fontStyle: "italic",
                      fontSize: "16px",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {opt.sub}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bento grid */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-6"
          style={{
            opacity: modeChosen ? 1 : 0.45,
            pointerEvents: modeChosen ? "auto" : "none",
            transition: "opacity 0.24s ease",
          }}
        >
          {/* Box 1: Mood */}
          <div
            className="card p-8 flex flex-col justify-between"
            style={{ minHeight: "320px" }}
          >
            <h2
              className="text-center mb-8 mt-2"
              style={{
                fontFamily: "Cinzel, serif",
                fontSize: "12px",
                letterSpacing: "0.15em",
                color: "var(--text-muted)",
              }}
            >
              GIVE THIS MOMENT A WORD
            </h2>
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {MOODS.map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMoodSelected(m);
                    setMoodCustom("");
                  }}
                  style={{
                    fontFamily: "Cinzel, serif",
                    fontSize: "11px",
                    letterSpacing: "0.06em",
                    padding: "8px 18px",
                    borderRadius: "20px",
                    border: `1px solid ${moodSelected === m ? "var(--gold)" : "var(--border-gold)"}`,
                    background:
                      moodSelected === m ? "var(--gold-wash)" : "transparent",
                    color: "var(--text)",
                    cursor: "pointer",
                    transition: "all var(--transition)",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
            <input
              value={moodCustom}
              onChange={(e) => {
                setMoodCustom(e.target.value);
                setMoodSelected("");
              }}
              placeholder="or write your own..."
              className="mt-auto mx-auto max-w-[280px]"
              style={{
                width: "100%",
                fontFamily: "IM Fell English, serif",
                fontStyle: "italic",
                fontSize: "18px",
                color: "var(--text)",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid var(--border-gold)",
                padding: "8px 4px",
                outline: "none",
                textAlign: "center",
              }}
            />
          </div>

          {/* Box 2: Color */}
          <div
            className="card p-8 flex flex-col items-center justify-between"
            style={{ minHeight: "320px" }}
          >
            <h2
              className="text-center mb-8 mt-2"
              style={{
                fontFamily: "Cinzel, serif",
                fontSize: "12px",
                letterSpacing: "0.15em",
                color: "var(--text-muted)",
              }}
            >
              A COLOR FOR THIS MOMENT
            </h2>
            <div className="flex flex-wrap gap-3 justify-center mb-6 w-full max-w-[240px]">
              {PALETTE.map((c) => (
                <motion.div
                  key={c}
                  onClick={() => {
                    setColorSelected(c);
                    setColorCustom(null);
                  }}
                  animate={
                    colorSelected === c && !colorCustom
                      ? {
                          scale: 1.15,
                          boxShadow: "0 0 0 3px rgba(200,160,40,0.7)",
                        }
                      : { scale: 1, boxShadow: "0 1px 4px rgba(0,0,0,0.22)" }
                  }
                  transition={{ duration: 0.2 }}
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: c,
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
            <div className="flex flex-col items-center h-[50px] mt-auto">
              <label
                style={{
                  fontFamily: "Cinzel, serif",
                  fontSize: "10px",
                  color: "var(--gold)",
                  letterSpacing: "0.1em",
                  cursor: "pointer",
                  opacity: 0.85,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  position: "relative",
                }}
              >
                or choose your own →
                <input
                  type="color"
                  onChange={(e) => {
                    setColorCustom(e.target.value);
                    setColorSelected(null);
                  }}
                  style={{
                    position: "absolute",
                    opacity: 0,
                    width: "100%",
                    height: "100%",
                    cursor: "pointer",
                  }}
                />
              </label>
              {colorCustom && (
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: colorCustom,
                    marginTop: "12px",
                    boxShadow: "0 0 0 3px rgba(200,160,40,0.7)",
                  }}
                />
              )}
            </div>
          </div>

          {/* Box 3: Mode */}
          <div className="card p-8 md:col-span-2">
            <h2
              className="text-center mb-8"
              style={{
                fontFamily: "Cinzel, serif",
                fontSize: "12px",
                letterSpacing: "0.15em",
                color: "var(--text-muted)",
              }}
            >
              HOW WOULD YOU LIKE TO PAINT TODAY?
            </h2>
            <div className="flex flex-col sm:flex-row gap-6 justify-center max-w-2xl mx-auto">
              {[
                {
                  key: "guided",
                  label: "Guided",
                  sub: "I'll offer gentle prompts",
                },
                { key: "free", label: "Free", sub: "just me and the canvas" },
              ].map((opt) => (
                <div
                  key={opt.key}
                  onClick={() => setMode(opt.key)}
                  style={{
                    flex: 1,
                    padding: "28px 24px",
                    borderRadius: "var(--radius-md)",
                    border: `${mode === opt.key ? 2 : 1}px solid ${mode === opt.key ? "var(--gold)" : "var(--border)"}`,
                    background:
                      mode === opt.key ? "var(--gold-wash)" : "transparent",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all var(--transition)",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "Cinzel, serif",
                      fontSize: "15px",
                      color: "var(--text)",
                      marginBottom: "8px",
                    }}
                  >
                    {opt.label}
                  </p>
                  <p
                    style={{
                      fontFamily: "IM Fell English, serif",
                      fontStyle: "italic",
                      fontSize: "16px",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {opt.sub}
                  </p>
                </div>
              ))}
            </div>

            {/* Guided: theme picker */}
            <AnimatePresence>
              {isGuided && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "hidden" }}
                >
                  <div
                    style={{
                      marginTop: "28px",
                      borderTop: "1px solid var(--border)",
                      paddingTop: "24px",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "Cinzel, serif",
                        fontSize: "11px",
                        letterSpacing: "0.12em",
                        color: "var(--text-muted)",
                        textAlign: "center",
                        marginBottom: "16px",
                      }}
                    >
                      CHOOSE A DIRECTION
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
                      {GUIDE_THEMES.map((t) => (
                        <div
                          key={t.key}
                          onClick={() => setGuideTheme(t.key)}
                          style={{
                            flex: 1,
                            padding: "20px 16px",
                            borderRadius: "var(--radius-md)",
                            border: `${guideTheme === t.key ? 2 : 1}px solid ${guideTheme === t.key ? "var(--gold)" : "var(--border)"}`,
                            background:
                              guideTheme === t.key
                                ? "var(--gold-wash)"
                                : "transparent",
                            cursor: "pointer",
                            textAlign: "center",
                            transition: "all var(--transition)",
                          }}
                        >
                          <p
                            style={{
                              fontFamily: "Cinzel, serif",
                              fontSize: "12px",
                              color: "var(--text)",
                              marginBottom: "6px",
                            }}
                          >
                            {t.label}
                          </p>
                          <p
                            style={{
                              fontFamily: "IM Fell English, serif",
                              fontStyle: "italic",
                              fontSize: "14px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {t.sub}
                          </p>
                        </div>
                      ))}
                    </div>
                    {/* Optional context sentence */}
                    <div style={{ maxWidth: "480px", margin: "20px auto 0" }}>
                      <input
                        value={guideContext}
                        onChange={(e) => setGuideContext(e.target.value)}
                        placeholder="anything specific you want to explore? (optional)"
                        style={{
                          width: "100%",
                          fontFamily: "IM Fell English, serif",
                          fontStyle: "italic",
                          fontSize: "16px",
                          color: "var(--text)",
                          background: "transparent",
                          border: "none",
                          borderBottom: "1px solid var(--border-gold)",
                          padding: "8px 4px",
                          outline: "none",
                          textAlign: "center",
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Box 4: What's on your mind? (both modes) */}
          <div className="card p-8 md:col-span-2">
            <h2
              className="text-center mb-6"
              style={{
                fontFamily: "Cinzel, serif",
                fontSize: "12px",
                letterSpacing: "0.15em",
                color: "var(--text-muted)",
              }}
            >
              WHAT'S ON YOUR MIND TODAY?{" "}
              <span style={{ opacity: 0.5 }}>(optional)</span>
            </h2>
            <textarea
              value={intakeText}
              onChange={(e) => setIntakeText(e.target.value)}
              placeholder="anything you want to bring into the session..."
              rows={3}
              style={{
                width: "100%",
                maxWidth: "520px",
                display: "block",
                margin: "0 auto",
                fontFamily: "IM Fell English, serif",
                fontStyle: "italic",
                fontSize: "17px",
                lineHeight: 1.7,
                color: "var(--text)",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid var(--border-gold)",
                padding: "8px 4px",
                outline: "none",
                resize: "none",
                textAlign: "center",
              }}
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center pb-24">
          <button
            className="btn btn-primary"
            onClick={handleBegin}
            disabled={!isReady || stage !== "setup"}
            style={{
              padding: "16px 48px",
              fontSize: "13px",
              opacity: isReady ? 1 : 0.4,
              transform: isReady ? "scale(1)" : "scale(0.98)",
              pointerEvents: isReady && stage === "setup" ? "auto" : "none",
              transition: "all 0.4s ease",
            }}
          >
            Begin painting
          </button>
          {!isReady && (
            <p
              className="mt-6"
              style={{
                fontFamily: "IM Fell English, serif",
                fontStyle: "italic",
                color: "var(--text-secondary)",
                fontSize: "16px",
              }}
            >
              {!mode
                ? !modeChosen
                  ? "Please choose Voice AI or Text Only first."
                  : "Please select a word, a color, and a mode to begin."
                : isGuided && !guideTheme
                  ? "Please choose a direction for your guided session."
                  : "Please select a word and a color to begin."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
