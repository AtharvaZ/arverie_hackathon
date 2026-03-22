# Arverie

Arverie is a contemplative canvas where voice, motion, and color become one reflective conversation.

It is built to feel calm for users and predictable for engineers:

- Fast local setup
- Clear frontend/backend separation
- Strict backend env validation so failures happen early, not in production

## What Makes It Different

Most journaling apps start with text.
Arverie starts with gesture: speak, draw, pause, reflect.

Users can:

- Start a guided session
- Draw on a live canvas while interacting with voice AI
- End with personalized reflection outputs saved to Supabase

## Tech Stack

### Frontend

- React 18 + Vite 5
- tldraw for canvas interactions
- framer-motion + gsap for motion
- Location: frontend

### Backend

- FastAPI + Uvicorn
- Anthropic integration
- Hume integration
- Supabase (database + storage)
- Location: backend

## Project Structure

```text
arverie/
├── backend/
│   ├── main.py
│   ├── models.py
│   ├── canvas_processor.py
│   ├── claude_calls.py
│   ├── hume_client.py
│   ├── supabase_client.py
│   ├── requirements.txt
│   └── tests/
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── hooks/
│       └── utils/
├── tasks/
├── AGENT.md
└── arverié_backend_spec_v2.md
```

## Environment Variables

The backend enforces required secrets at startup.
If any required key is missing or placeholder-like, backend startup fails immediately.

Create this file:

- backend/.env

Required variables:

```env
ANTHROPIC_API_KEY=your_real_key
HUME_API_KEY=your_real_key
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=your_real_service_role_key
SESSION_TOKEN_SECRET=generate_a_long_random_secret
```

Optional backend variables:

```env
AUTH_ENFORCEMENT_MODE=strict
WS_AUTH_ENFORCEMENT_MODE=strict
ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
```

Optional frontend variable:

- frontend/.env

```env
VITE_API_URL=http://localhost:8000
```

Notes:

- If VITE_API_URL is not set, frontend already defaults to http://localhost:8000.
- Generate SESSION_TOKEN_SECRET with a strong random value, for example:
  - openssl rand -hex 32

## Local Setup (Critical)

Follow these steps exactly.

### 1) Prerequisites

- Node.js 18+ (recommended 20+)
- npm 9+
- Python 3.10+

### 2) Install frontend dependencies

```bash
cd frontend
npm install
```

### 3) Create and install backend environment

```bash
cd ../backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 4) Add backend env file

Create backend/.env and add all required keys listed above.

### 5) Start backend API (Terminal 1)

Run from backend directory:

```bash
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Backend URLs:

- API base: http://localhost:8000
- Interactive docs: http://localhost:8000/docs

### 6) Start frontend app (Terminal 2)

Run from frontend directory:

```bash
cd ../frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

Frontend URL:

- http://127.0.0.1:5173

## Build Commands

Frontend production build:

```bash
cd frontend
npm run build
npm run preview
```

## Operational Safety Checks

Before demoing:

- Confirm backend is running at port 8000
- Confirm frontend is running at 127.0.0.1:5173
- Confirm backend/.env has real values (not placeholders)
- Confirm Supabase URL and service key belong to the intended project

If setup fails:

- Re-run pip install -r requirements.txt in backend virtualenv
- Re-check backend/.env variable names for typos
- Verify no other process is using ports 8000 or 5173
