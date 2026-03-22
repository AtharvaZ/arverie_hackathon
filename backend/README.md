# Backend Security Operations

## Required Environment Variables

Set these in `backend/.env` before starting the API:

- `ANTHROPIC_API_KEY`
- `HUME_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SESSION_TOKEN_SECRET`

The backend now fails fast at startup if any required secret is missing or placeholder-like.

## Auth Enforcement Modes

- `AUTH_ENFORCEMENT_MODE=compat`: logs token problems but allows legacy requests
- `AUTH_ENFORCEMENT_MODE=strict`: rejects invalid or missing tokens with 401/403
- `WS_AUTH_ENFORCEMENT_MODE=compat`: allows websocket without `ws_token`
- `WS_AUTH_ENFORCEMENT_MODE=strict`: requires valid signed `ws_token` and blocks replay

## Key Rotation Runbook

1. Generate new keys in providers (Anthropic, Hume, Supabase service role).
2. Set new values in deployment secrets without removing old keys yet.
3. Deploy backend with new keys and verify health checks and one end-to-end session.
4. Revoke old keys after verification window closes.
5. Rotate `SESSION_TOKEN_SECRET` last, then invalidate existing session tokens by restart/deploy.
6. If rollback is required, restore previous key set and redeploy, then re-rotate after root cause analysis.

## Local Secret Scan

Use one of the following before commit:

- `gitleaks detect --source . --no-git --redact`
- `detect-secrets scan --all-files`

Lightweight grep sanity check:

- `rg --hidden --glob '!node_modules/**' --glob '!backend/.env' '(ANTHROPIC_API_KEY|SUPABASE_SERVICE_KEY|HUME_API_KEY)\\s*=\\s*.+'`

# Backend Security Operations\n\n## Required Environment Variables\n\nSet these in backend/.env before starting the API:\n\n- ANTHROPIC*API_KEY\n- HUME_API_KEY\n- SUPABASE_URL\n- SUPABASE_SERVICE_KEY\n- SESSION_TOKEN_SECRET\n\nThe backend now fails fast at startup if any required secret is missing or placeholder-like.\n\n## Auth Enforcement Modes\n\n- AUTH_ENFORCEMENT_MODE=compat: logs token problems but allows legacy requests\n- AUTH_ENFORCEMENT_MODE=strict: rejects invalid or missing tokens with 401/403\n- WS_AUTH_ENFORCEMENT_MODE=compat: allows websocket without ws_token\n- WS_AUTH_ENFORCEMENT_MODE=strict: requires valid signed ws_token and blocks replay\n\n## Key Rotation Runbook\n\n1. Generate new keys in providers (Anthropic, Hume, Supabase service role).\n2. Set new values in deployment secrets without removing old keys yet.\n3. Deploy backend with new keys and verify health checks and one end-to-end session.\n4. Revoke old keys after verification window closes.\n5. Rotate SESSION_TOKEN_SECRET last, then invalidate existing session tokens by restart/deploy.\n6. If rollback is required, restore previous key set and redeploy, then re-rotate after root cause analysis.\n\n## Local Secret Scan\n\nUse one of the following before commit:\n\n- gitleaks detect --source . --no-git --redact\n- detect-secrets scan --all-files\n\nLightweight grep sanity check:\n\n- rg --hidden --glob '!node_modules/\**' --glob '!backend/.env' '(ANTHROPIC*API_KEY|SUPABASE_SERVICE_KEY|HUME_API_KEY)\\s*=\\s\*.+"'}}]}
