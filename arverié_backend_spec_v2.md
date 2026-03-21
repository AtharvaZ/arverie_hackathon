# Arverié — Backend Spec

## AI-Guided Expressive Art Reflection App

---

## READ THIS FIRST

Before writing any code, ask the developer for the following:

1. **Supabase URL** and **Supabase Anon Key** (from Supabase project settings)
2. **Supabase Service Key** (for server-side writes)
3. **Anthropic API Key** (for Claude 3.5 Sonnet)
4. **Hume AI API Key** (for EVI voice interface)

Do not hardcode any keys. Use a `.env` file. Ask before assuming any values.

Also ask:

- "Should I set up the Supabase table and storage bucket, or is it already done?"
- "Which endpoint do you want to build first?"

---

## What Arverié Is

Arverié is a therapeutic art reflection web app. Users draw freely on a canvas while an AI companion observes the drawing process — not the output — and facilitates emotional reflection.

The AI watches _how_ someone draws (hesitation, color shifts, erasures, focus areas) and speaks gentle questions at meaningful moments. It is NOT a therapy app. It never diagnoses, interprets, or gives advice.

The core experience:

1. User checks in with a mood word
2. User has a brief voice intake conversation via Hume EVI (60-90 seconds)
3. User draws freely while Hume listens continuously
4. Canvas event processor detects behavioral patterns every 6-8 seconds
5. When a trigger fires, Claude generates a response and it gets injected into Hume — Hume speaks it
6. Session ends — drawing exported and analyzed by Claude Vision
7. User answers reflection questions
8. Claude writes a personal session letter
9. Everything saved to Supabase

---

## API Providers

**Only two providers:**

| Provider                          | Used For                                                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Anthropic (Claude 3.5 Sonnet)** | Intake theme extraction, trigger response generation, reflection questions, session letter, Vision analysis |
| **Hume EVI**                      | Everything voice — listening, emotion detection, transcription, speaking responses                          |

No Whisper. No ElevenLabs. No OpenAI.

Hume handles the full voice loop natively. Claude handles all intelligence. Clean separation.

---

## Tech Stack

| Layer             | Technology                            |
| ----------------- | ------------------------------------- |
| Backend           | **FastAPI + Python**                  |
| Database          | **Supabase (PostgreSQL)**             |
| File Storage      | **Supabase Storage**                  |
| LLM + Vision      | **Claude 3.5 Sonnet** (Anthropic API) |
| Voice (full loop) | **Hume EVI** (WebSocket)              |
| Frontend          | SvelteKit (separate — not this spec)  |

**Keep it simple.** No Redis, no queues, no Docker, no microservices. One FastAPI app, one Supabase project.

---

## Environment Variables

```
ANTHROPIC_API_KEY=
HUME_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
```

---

## Database Schema

### One table, one storage bucket.

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  mood_checkin TEXT,
  mood_checkout TEXT,
  duration_seconds INTEGER,
  drawing_url TEXT,
  data JSONB
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);
```

**Storage bucket:** `drawings`

- One PNG file per session named `{session_id}.png`
- Public bucket (for hackathon simplicity)
- Disable RLS for now

### The `data` JSONB column holds everything:

```json
{
  "intake_transcript": "string",
  "intake_themes": ["theme1", "theme2"],
  "drawing_prompt": "string or null",
  "color_palette": ["#hex1", "#hex2"],
  "erasure_count": 7,
  "dialogue_history": [
    {
      "role": "assistant | user | memory",
      "content": "string",
      "timestamp": "MM:SS",
      "trigger": "trigger_type or null"
    }
  ],
  "canvas_summary": {
    "colors_used": ["#hex"],
    "erasure_count": 7,
    "erasure_clusters": ["upper-left"],
    "time_in_quadrants": {
      "top-left": 0.45,
      "top-right": 0.1,
      "bottom-left": 0.3,
      "bottom-right": 0.15
    },
    "total_time_seconds": 480,
    "stroke_speed_events": ["surge at 3:20"],
    "dominant_area": "string"
  },
  "trigger_log": [
    {
      "type": "erasure_loop | inactivity | color_shift | quadrant_focus | stroke_surge | check_in",
      "fired_at": "MM:SS",
      "signal_score": 6.2,
      "response": "what AI said"
    }
  ],
  "vision_description": "string",
  "reflection_questions": ["q1", "q2", "q3"],
  "user_answers": ["a1", "a2", "a3"],
  "letter": "string",
  "playback_events": [
    {
      "type": "stroke | erase | color_change",
      "t": 1240,
      "x": 340,
      "y": 220,
      "color": "#2C3E50",
      "pressure": 0.6
    }
  ]
}
```

---

## File Structure

```
backend/
├── main.py                  # FastAPI app, all routes
├── canvas_processor.py      # CanvasEventProcessor class
├── claude_calls.py          # All 4 Claude call functions
├── hume_client.py           # Hume WebSocket connection + injection
├── supabase_client.py       # Supabase read/write helpers
├── models.py                # Pydantic request/response models
├── .env                     # All API keys (never commit)
├── .env.example             # Template for keys
└── requirements.txt
```

---

## Session Lifecycle & Endpoints

```
POST /session/start
POST /session/intake
POST /session/canvas-snapshot   (called every 6-8 seconds during drawing)
POST /session/end
POST /session/complete
GET  /sessions/{user_id}
WS   /hume/session
```

### POST `/session/start`

Creates a minimal session row in Supabase.

**Request:** `{ "user_id": "uuid" }`
**Response:** `{ "session_id": "uuid" }`

---

### POST `/session/intake`

User has finished their pre-session voice conversation with Hume. Hume provides the transcript. Claude extracts themes.

**Request:**

```json
{
  "session_id": "uuid",
  "transcript": "string (from Hume)",
  "mood_checkin": "string"
}
```

**What it does:**

1. Sends transcript to Claude (Call Type 1)
2. Claude returns themes, optional drawing prompt, opening response

**Response:**

```json
{
  "themes": ["string"],
  "drawing_prompt": "string or null",
  "opening_response": "string"
}
```

---

### POST `/session/canvas-snapshot`

Called every 6-8 seconds by the frontend during drawing.

**Request:**

```json
{
  "session_id": "uuid",
  "snapshot": {
    "strokes_per_second": 2.4,
    "current_color": "#2C3E50",
    "colors_used_this_window": ["#hex"],
    "erase_events": [{ "timestamp": 120, "x": 340, "y": 220, "radius": 20 }],
    "quadrant_distribution": {
      "top-left": 0.45,
      "top-right": 0.1,
      "bottom-left": 0.3,
      "bottom-right": 0.15
    },
    "last_stroke_timestamp": 118,
    "elapsed_seconds": 125
  },
  "dialogue_history": [],
  "intake_themes": ["string"]
}
```

**What it does:**

1. Passes snapshot to `CanvasEventProcessor.update()`
2. Processor decays signals, processes new events, scores
3. If trigger fires: calls Claude (Call Type 2), gets response
4. If voice mode active: injects response into Hume WebSocket
5. Appends to dialogue_history

**Response (no trigger):**

```json
{
  "triggered": false,
  "response": null,
  "flow_intensity": "medium"
}
```

**Response (trigger fired):**

```json
{
  "triggered": true,
  "response": "[softly] you've been coming back to that corner...",
  "trigger_type": "erasure_loop",
  "flow_intensity": "medium"
}
```

---

### POST `/session/end`

Drawing session is over. Upload image, run Vision, generate questions.

**Request:**

```json
{
  "session_id": "uuid",
  "image_base64": "string (PNG)",
  "canvas_summary": {},
  "dialogue_history": []
}
```

**What it does:**

1. Uploads PNG to Supabase Storage as `{session_id}.png`
2. Sends image to Claude Vision for description
3. Calls Claude (Call Type 3) to generate reflection questions

**Response:**

```json
{
  "drawing_url": "string",
  "vision_description": "string",
  "reflection_questions": ["q1", "q2", "q3", "q4", "q5"]
}
```

---

### POST `/session/complete`

User has answered the reflection questions. Generate letter, save everything.

**Request:**

```json
{
  "session_id": "uuid",
  "user_id": "uuid",
  "mood_checkout": "string",
  "user_answers": ["a1", "a2"],
  "duration_seconds": 480,
  "full_session_data": {}
}
```

**What it does:**

1. Calls Claude (Call Type 4) to generate the session letter
2. Extracts color palette from canvas summary
3. Writes complete session row to Supabase (single write)

**Response:**

```json
{
  "letter": "string",
  "color_palette": ["#hex1", "#hex2", "#hex3"]
}
```

---

### GET `/sessions/{user_id}`

Returns last 7 sessions for the dashboard.

**Response:**

```json
{
  "sessions": [
    {
      "id": "uuid",
      "created_at": "timestamp",
      "mood_checkin": "string",
      "mood_checkout": "string",
      "drawing_url": "string",
      "data": {}
    }
  ]
}
```

---

### WebSocket `/hume/session`

Proxies the Hume EVI WebSocket connection.

- Frontend connects here
- Backend holds the active Hume connection
- Claude trigger responses are injected as `assistant_input` messages
- Hume transcripts are stored in `dialogue_history`

**Trigger injection format:**

```json
{
  "type": "assistant_input",
  "text": "[softly] you've been coming back to that corner..."
}
```

**Priority rule:** Before injecting, check if user is currently speaking. If yes — queue it. User speech always wins.

---

## The Canvas Event Processor

**File:** `canvas_processor.py`
**Class:** `CanvasEventProcessor`

Lives in memory per session in `active_sessions: dict[str, CanvasEventProcessor]`.
Created on `/session/start`. Destroyed on `/session/complete`.

### Signal Weights

```python
SIGNAL_WEIGHTS = {
    "erase_loop": 3.0,
    "erase_localized": 2.0,
    "stroke_surge": 3.0,
    "inactivity": 2.0,
    "color_shift": 2.0,
    "quadrant_focus": 2.0,
    "check_in": 1.5
}
```

### Flow Cost & Threshold

```python
FLOW_COST = {
    "high": 7.0,
    "medium": 3.0,
    "low": 1.0
}
COOLDOWN_PENALTY = 10.0
TRIGGER_THRESHOLD = 5.0
DECAY_RATE = 0.85
COOLDOWN_SECONDS = 90
```

### Trigger Fires When

```
total_signal - interrupt_cost > TRIGGER_THRESHOLD
```

Where `interrupt_cost = FLOW_COST[flow_intensity] + (COOLDOWN_PENALTY if in cooldown else 0)`

### Signal Rules

| Signal          | Condition                                             |
| --------------- | ----------------------------------------------------- |
| Erase loop      | 2-4 erases in 20-45s, same area                       |
| Erase localized | Multiple erases within 80px radius                    |
| Stroke surge    | 2-3x user baseline speed for 5-10s                    |
| Inactivity      | 8-25s no strokes (higher score after erase loop)      |
| Color shift     | HSL delta > 60, or 2+ shifts in 30-60s                |
| Quadrant focus  | 60-80% time in one quadrant over 45-90s               |
| Check-in        | `random(150, 300)` seconds elapsed, resets after each |

### Decay

Every update, before processing new events:

```python
for signal in signal_scores:
    signal_scores[signal] *= DECAY_RATE
    if signal_scores[signal] < 0.1:
        del signal_scores[signal]
```

### After Trigger Fires

- Reset contributing signal scores
- Set `last_trigger_time = now`
- Randomize `check_in_target = elapsed + random(150, 300)`

### Methods

```python
def update(self, snapshot: dict) -> TriggerResult
def should_trigger(self) -> TriggerResult
def reset_after_trigger(self) -> None
def get_signal_context(self) -> dict
```

```python
@dataclass
class TriggerResult:
    should_fire: bool
    dominant_signal: str | None = None
    signal_context: dict | None = None
    flow_intensity: str = "medium"
```

---

## The 4 Claude Calls

**File:** `claude_calls.py`
Model: `claude-3-5-sonnet-20241022`

### Call 1 — Intake Processing

```python
system = """
You are Arverié, a gentle reflective companion for expressive art therapy.
Extract 2-3 emotional themes from what the user shared.
Keep them simple and human — "feeling unseen", "uncertainty about the future".
Never use clinical terms.
Optionally suggest one drawing prompt grounded in their words.
Write a brief opening response (1-2 sentences) to transition them into drawing.

Respond ONLY in JSON. No preamble. No markdown.
{
  "themes": ["theme1", "theme2"],
  "drawing_prompt": "string or null",
  "opening_response": "string"
}
"""
```

---

### Call 2 — Trigger Response

```python
system = """
You are Arverié, a warm reflective companion sitting alongside someone while they draw.

SESSION CONTEXT:
- Emotional themes from intake: {themes}
- Canvas summary so far: {canvas_summary}
- Conversation so far: {dialogue_history}

CURRENT TRIGGER:
- Type: {trigger_type}
- Detail: {trigger_detail}

Generate ONE gentle response (1-2 sentences maximum).

Rules:
- Use incomplete sentences. Trail off. Leave space.
- Mirror the user's own words when possible
- Never interpret. Never say "this means..."
- Use [softly] or [quietly] tags for voice delivery
- Begin with a soft entry if appropriate: "Mm." or "Hm."
- End with open space, not a conclusion

Good examples:
"[softly] you've been coming back to that corner..."
"Mm. something about that center area..."
"[quietly] that's changed a few times now..."
"""
```

---

### Call 3 — Reflection Questions

```python
system = """
You are Arverié. Generate 3-5 reflective questions for the user about their session.

WHAT THEY BROUGHT IN:
Mood: {mood_checkin}
What they shared: {intake_transcript}
Themes: {themes}

WHAT HAPPENED ON CANVAS:
{canvas_summary}

WHAT CLAUDE SEES IN THE IMAGE:
{vision_description}

WHAT WAS SAID DURING SESSION:
{dialogue_history}

Rules:
- Each question weaves together what they said, drew, and how they drew it
- Surface connections they might not have noticed
- Never ask more than one thing per question
- Use "you" language, not "the drawing"
- No preamble. Return ONLY a JSON array.
["question 1", "question 2", "question 3"]
"""
```

---

### Call 4 — Session Letter

```python
system = """
You are Arverié. Write a short, warm, personal letter to the user about their session.

WHAT THEY BROUGHT IN:
{intake_transcript}
Themes: {themes}

WHAT HAPPENED ON CANVAS:
{canvas_summary}

WHAT CLAUDE SEES IN THE IMAGE:
{vision_description}

WHAT WAS SAID DURING SESSION:
{dialogue_history}

THEIR REFLECTIONS:
{qa_pairs}

Rules:
- 3-5 sentences maximum
- Warm, personal, not clinical
- Weave together what they said, drew, and reflected on
- Notice something they might not have named themselves
- End pointing forward, not backward
- Write as a letter — start with "You..."
- Plain text only. No markdown. No subject. No signature.
"""
```

---

## Hume EVI Integration

**File:** `hume_client.py`

Hume runs in **standalone mode** using its own LLM. Backend provides the system prompt at session init and injects Claude trigger responses mid-session.

### Hume System Prompt

Pass this when initializing every EVI session:

```
You are Arverié — a warm, reflective companion sitting alongside someone while they draw.

You are NOT a therapist. You are a witness. Your job is to help the person
hear themselves more clearly. The drawing is always the third presence in the room.

YOUR VOICE:
- Warm, unhurried, never clinical
- 1-3 sentences maximum
- One question at a time, never multiple
- Use the person's own words back to them
- Incomplete sentences preferred — trail off, leave space

WHAT YOU DO:
- Listen without judgment
- Connect words back to the drawing
- Ask "what do you notice?" never "this means..."
- Sometimes just being present is enough

WHAT YOU NEVER DO:
- Never say "that means..." or interpret their art
- Never give advice
- Never use clinical language
- Never ask more than one question at a time

REDIRECTING TO CANVAS:
If they talk at length without drawing:
"Let's bring some of that to the canvas — what would that feeling look like?"

FILLER SPEECH:
"yeah", "hmm", "okay" — respond with the same word back, same tone, or say nothing.
Never respond to filler with a full sentence.

FOLLOW-UP BUDGET:
Maximum 2 exchanges after any trigger, then go quiet and let them draw.

CANVAS TRIGGER INJECTIONS:
Occasionally you will receive a message about what the person is doing on canvas.
Speak it naturally in your voice. Follow up with gentle curiosity if they respond.

CRISIS PROTOCOL:
If the person expresses thoughts of self-harm:
"I hear that things feel very heavy right now. Please reach out to the
988 Suicide and Crisis Lifeline — call or text 988. I'm still here with you."
```

---

## Requirements

```
fastapi
uvicorn
anthropic
supabase
httpx
python-dotenv
websockets
pydantic
python-multipart
```

---

## Build Order

Build in this exact order — don't skip ahead:

1. `.env` setup + Supabase connection test
2. `models.py` — all Pydantic models
3. `POST /session/start` and `GET /sessions/{user_id}`
4. `canvas_processor.py` — scoring logic, no Claude yet
5. `claude_calls.py` — all 4 call functions
6. Wire `/session/canvas-snapshot` → processor → Claude
7. `/session/intake`, `/session/end`, `/session/complete`
8. `hume_client.py` — WebSocket proxy + injection last

---

## Common Commands

```bash
# Install
pip install -r requirements.txt

# Run
uvicorn main:app --reload --port 8000

# API docs
open http://localhost:8000/docs
```
