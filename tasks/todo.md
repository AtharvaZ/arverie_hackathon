# Arverié Task Board

## Session: 2026-03-20

---

### Task: Intake opening_response never injected into Hume — Arverié silent after intake

**Root cause:**

- `/session/intake` stores themes/transcript but does NOT store `opening_response` in `session_intake_data`
- Even if it did, the Hume WS (`/hume/session`) is connected by the frontend AFTER intake completes
- So at intake time there is no `active_hume_sessions[session_id]` to inject into
- Nobody ever injects `opening_response` into Hume — Arverié stays silent

**Fix plan:**

- [x] In `/session/intake`: also store `opening_response` in `session_intake_data`
- [x] In `/hume/session` WebSocket handler: after creating HumeClient, check for a pending `opening_response` and schedule its injection once the connection is live
- [x] Add fallback: if Hume WS already exists at intake time, inject immediately too

---

### Task: Tests + system prompt update (completed 2026-03-20)

- [x] Read test_hume.py, hume_client.py, claude_calls.py, main.py
- [x] Rewrite test_hume.py with 4 test flows (raw WS, intake, canvas trigger, emotional conversation)
- [x] Update HUME_SYSTEM_PROMPT: concrete 3-step emotional presence, new USER-INITIATED CONVERSATION section

**Review:** Workflow not followed at start — no plan written before implementation, no agent spawned. See lessons.md.

---

## Session: 2026-03-21 (atharva/backend-frontend-integration)

### MASTER PLAN: Frontend ↔ Backend Integration

#### Gap Analysis

| Area        | Current                          | Needed                                                    |
| ----------- | -------------------------------- | --------------------------------------------------------- |
| api.js      | Wrong endpoints (/api/chat etc.) | All 5 REST endpoints + WS                                 |
| AppContext  | mood/color/guided only           | + sessionId, userId, themes, dialogueHistory, sessionData |
| SessionPage | Local state only                 | Call /session/start, /session/intake, store themes        |
| CanvasPage  | Behavioral tracking only         | Snapshot polling, Hume WS, session end call               |
| SummaryPage | Calls wrong api.reflection       | Use /session/end questions + /session/complete letter     |
| userId      | Hardcoded name                   | UUID in localStorage                                      |

---

#### TASK 1 — Foundation: api.js + AppContext + userId

- [ ] Rewrite `utils/api.js` with all correct backend endpoints
  - `startSession(userId)` → POST /session/start
  - `sendIntake(sessionId, transcript, mood)` → POST /session/intake
  - `sendSnapshot(sessionId, snapshot, dialogueHistory, themes)` → POST /session/canvas-snapshot
  - `endSession(sessionId, imageBase64, canvasSummary, dialogueHistory)` → POST /session/end
  - `completeSession(sessionId, userId, body)` → POST /session/complete
  - `getSessions(userId)` → GET /sessions/{userId}
- [ ] Update `context/AppContext.jsx`:
  - Add: sessionId, userId, themes, drawingPrompt, openingResponse, dialogueHistory, sessionData
  - Generate `userId` once from localStorage (UUID v4, persist forever)
  - Keep existing: mood, moodColor, guided, paintColors, erasureCount

#### TASK 2 — SessionPage: intake text + guided flow + session start

- [ ] Add optional textarea "what's on your mind today?" (both modes, skippable)
- [ ] For guided mode: theme picker (emotion-anchored, body-based, narrative) + optional context sentence
- [ ] On "Begin painting":
  - Call `startSession(userId)` → store sessionId
  - Call `sendIntake(sessionId, intakeText || mood, mood)` → store themes, drawingPrompt, openingResponse
  - For guided: show `drawingPrompt` card before navigate
  - Navigate to /canvas
- [ ] Show loading state during API calls

#### TASK 3 — Canvas metrics computation

- [ ] Create `hooks/useSnapshotMetrics.js`:
  - Every call computes 7-second window snapshot from behaviorData ref:
    - `strokes_per_second`: strokes in last 7s / 7
    - `quadrant_distribution`: map stroke midpoints to quadrant → % per quadrant (top-left, top-right, bottom-left, bottom-right)
    - `colors_used_this_window`: unique colors from last 7s
    - `erase_events`: erase events from last 7s → [{timestamp (seconds from start), x, y, radius}]
    - `last_stroke_timestamp`: (last stroke ms - sessionStart ms) / 1000
    - `elapsed_seconds`: (Date.now() - sessionStart ms) / 1000

#### TASK 4 — CanvasPage: snapshot polling + AIPanel messages

- [ ] Use `useSnapshotMetrics` to compute metrics every 7s
- [ ] Call `sendSnapshot()` with metrics + dialogueHistory + themes
- [ ] When triggered=true: append to dialogueHistory, display in AIPanel
- [ ] Clear interval on unmount

#### TASK 5 — CanvasPage: Hume WebSocket voice

- [ ] Create `hooks/useHumeVoice.js`:
  - Connect to `ws://localhost:8000/hume/session?session_id=...`
  - getUserMedia({ audio: true }) for microphone
  - AudioContext + ScriptProcessorNode: capture PCM → linear16 (Int16Array) → base64 → send as `{type: "audio_input", data: "..."}`
  - Receive `audio_output`: base64 → AudioBuffer → Web Audio API playback
  - Receive `user_message`: append to dialogue history
  - Expose: { isConnected, isSpeaking, connect, disconnect }
- [ ] Connect on mount when sessionId is available
- [ ] Add mic indicator in toolbar (small dot)

#### TASK 6 — CanvasPage: session end

- [ ] On "Finish Session":
  - Stop Hume WS, stop snapshot polling
  - Get canvas as base64 (canvasRef.current.getDataURL())
  - Build canvas_summary from behaviorData
  - Call `endSession()` → store drawing_url, vision_description, reflection_questions in context
  - Navigate to /summary
- [ ] Show loading state while API call runs

#### TASK 7 — SummaryPage: questions + letter

- [ ] Show AI-generated reflection_questions from context (3-5 dynamic inputs)
- [ ] On "Receive your letter": call `completeSession()` with all answers + mood_checkout + duration + full_session_data
- [ ] Display letter with existing typewriter effect
- [ ] "Close Journal" → navigate to /

#### TASK 8 — Testing end-to-end

- [ ] Backend starts clean: `uvicorn main:app --reload --port 8000`
- [ ] Frontend: `npm run dev`
- [ ] Session start → session_id in context
- [ ] Intake → themes returned and stored
- [ ] Snapshot polling fires every 7s
- [ ] Trigger fires after behavioral signals
- [ ] Hume WS audio routes correctly
- [ ] Session end → questions returned
- [ ] Session complete → letter + Supabase row
- [ ] Fix all bugs found

#### Implementation order: 1 → 2 → 3 → 4 → 6 → 7 → 5 (Hume last) → 8

---

## Session: 2026-03-21 (pri/frontend-2d)

### Task: Convert arverié_landing_desk.html → React + clean up dead pages

**Implementation order:**

- [ ] Add missing CSS vars (--walnut, --wall, --paper, etc.) to global CSS
- [ ] Create `frontend/src/pages/DeskSection.jsx` — full desk scene from HTML
- [ ] Edit `LandingPage.jsx` — add DeskSection after hero, fix scroll, name modal
- [ ] Edit `App.jsx` — remove /dashboard route, DashboardPage import
- [ ] Delete `DashboardPage.jsx`, `Navbar.jsx`, `AnimatedLogo.jsx`

**Routes after cleanup:**

- `/` → LandingPage (hero + DeskSection)
- `/session` → SessionPage
- `/canvas` → CanvasPage
- `/summary` → SummaryPage
- `/journal` → JournalPage
- `/journal/:id` → JournalPage

**Review:**

- [ ] Hero animates correctly
- [ ] Desk scene renders with all CSS elements
- [ ] Wheel-lock scroll animation works
- [ ] Name modal gates desk navigation
- [ ] /session and /journal links work from desk
- [ ] No dead imports or routes

---

## Session: 2026-03-22 (bugfix/hume-ws-1006)

### Task: Frontend canvas Hume voice closes with 1006 and Hume payload parse errors

**Plan:**

- [x] Trace frontend `useHumeVoice` connect/disconnect lifecycle for closed `AudioContext` node creation
- [x] Trace backend `HumeClient` proxying path for malformed/early `audio_input` forwarding to Hume
- [x] Add backend guardrails: validate client `audio_input`, build canonical forwarded payload, and gate first audio until Hume session ack
- [x] Add frontend cancellation guard: avoid creating media/source/processor nodes after disconnect/unmount
- [x] Add regression test coverage for backend forwarded payload shape and malformed `audio_input` handling
- [x] Run targeted tests and capture verification steps
