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

## Session: 2026-03-21 (pri/frontend-2d)

### Task: Convert arverié_landing_desk.html → React + clean up dead pages

**Implementation order:**

- [ ] Add missing CSS vars (--walnut, --wall, --paper, etc.) to global CSS
- [ ] Create `frontend/src/pages/DeskSection.jsx` — full desk scene from HTML
- [ ] Edit `LandingPage.jsx` — add DeskSection after hero, fix scroll, name modal
- [ ] Edit `App.jsx` — remove /dashboard route, DashboardPage import
- [ ] Delete `DashboardPage.jsx`, `Navbar.jsx`, `AnimatedLogo.jsx`

**Routes after cleanup:**

- `/`            → LandingPage (hero + DeskSection)
- `/session`     → SessionPage
- `/canvas`      → CanvasPage
- `/summary`     → SummaryPage
- `/journal`     → JournalPage
- `/journal/:id` → JournalPage

**Review:**

- [ ] Hero animates correctly
- [ ] Desk scene renders with all CSS elements
- [ ] Wheel-lock scroll animation works
- [ ] Name modal gates desk navigation
- [ ] /session and /journal links work from desk
- [ ] No dead imports or routes
