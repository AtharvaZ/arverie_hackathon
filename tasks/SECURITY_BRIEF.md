# Security Remediation Brief

## Goal

Harden Arverie backend and frontend against abuse, account/session takeover, prompt abuse, and key compromise.

## Scope

- Backend FastAPI routes and websocket flow (`backend/main.py`, `backend/hume_client.py`, `backend/claude_calls.py`, `backend/supabase_client.py`, `backend/models.py`)
- Frontend API + transcript textbox and Hume websocket (`frontend/src/pages/CanvasPage.jsx`, `frontend/src/utils/api.js`, `frontend/src/hooks/useHumeVoice.js`, `frontend/src/context/AppContext.jsx`)

## Highest-Risk Issues

1. **Secrets exposure in repo/workspace env file**
   - `backend/.env` contains live Anthropic/Hume/Supabase keys.
   - Immediate risk: key theft, API abuse, data breach.

2. **No authentication/authorization on session APIs**
   - Endpoints accept client-provided `user_id` and `session_id` without identity checks.
   - A user can read or mutate another user's sessions by guessing IDs.

3. **WebSocket session hijack risk**
   - `/hume/session` accepts `session_id` query param without auth proof.
   - Potential eavesdropping, message injection, and cost abuse on another session.

4. **No rate limiting / abuse throttling for expensive AI endpoints**
   - Unlimited calls to `/session/intake`, `/session/message`, `/session/canvas-snapshot`, `/session/end` and websocket audio stream.
   - Direct cost-exhaustion and denial-of-wallet risk.

5. **Unbounded payload sizes**
   - Large base64 uploads and message payloads accepted without strict size caps.
   - Memory/CPU exhaustion risk.

## Additional Risks

- Prompt injection and safety bypass attempts through transcript textbox messages.
- In-memory session maps without TTL/cleanup for abandoned sessions.
- Lack of structured security logging/monitoring for abuse and anomaly detection.

## Required Plan Output

Create:

- `MASTER_PLAN.md` with phases, dependencies, and success criteria.
- Task breakdown files for:
  1. AuthN/AuthZ and session ownership enforcement
  2. WebSocket tokenization and session binding
  3. API and websocket rate limiting + quotas
  4. Payload validation and max-size guards
  5. Secret management + key rotation + git hygiene
  6. Prompt/input hardening for `/session/message`
  7. Security tests (unit/integration) for IDOR, rate-limit, and websocket auth

## Constraints

- Keep current product behavior intact (canvas flow, triggers, Hume voice behavior).
- Minimize breaking API changes; if needed, include migration path.
- Prioritize fixes by risk reduction and implementation complexity.
