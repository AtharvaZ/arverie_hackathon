Note: This repository is a hackathon project in active development. Breaking changes are allowed by default. Do not over-engineer — simplicity wins.

---

## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for the relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

---

## Task Management

1. **Plan First:** Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan:** Check in before starting implementation
3. **Track Progress:** Mark items complete as you go
4. **Explain Changes:** High-level summary at each step
5. **Document Results:** Add review section to `tasks/todo.md`
6. **Capture Lessons:** Update `tasks/lessons.md` after corrections

---

## Core Principles

- **Simplicity First:** Make every change as simple as possible. Minimal impact code.
- **No Laziness:** Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact:** Only touch what's necessary. No side effects with new bugs.

---

## Agent Routing

Before starting ANY task, read this section and delegate to the appropriate agent from `.claude/agents/`.

| Task Type                                                                                        | Agent                                    |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| Building or modifying any backend file (FastAPI, canvas processor, Claude calls, Hume, Supabase) | `.claude/agents/senior-backend-agent.md` |
| Planning a new feature or breaking down work into tasks                                          | `.claude/agents/task-planner-agent.md`   |
| Fixing a bug — any file, any layer                                                               | `.claude/agents/bug-fixer-agent.md`      |
| Auditing code quality, reviewing for issues                                                      | `.claude/agents/code-reviewer-agent.md`  |
| Git operations — merging, rebasing, conflict resolution                                          | `.claude/agents/git-manager-agent.md`    |
| Building any UI component, page, or screen (SvelteKit frontend)                                  | `.claude/agents/designer/SKILL.md`       |

Always spawn the matching agent using the Agent tool BEFORE starting work. Pass the full task description and any relevant context as the prompt.

---

- Prefer object-oriented design for complex domain logic; prefer plain functions for small stateless utilities.

```python
# Bad
def process_signal():
    pass

def decay_signal():
    pass

# Good
class CanvasEventProcessor:
    def update(self, snapshot: dict) -> TriggerResult:
        pass

    def should_trigger(self) -> TriggerResult:
        pass

    def reset_after_trigger(self) -> None:
        pass
```

---

- Prefer plain functions for simple stateless helpers.

```python
# Bad
class Utils:
    @staticmethod
    def compute_hsl_delta(c1: str, c2: str) -> float:
        pass

# Good
def compute_hsl_delta(c1: str, c2: str) -> float:
    pass
```

---

- Always use type hints on function signatures — parameters and return types.

```python
# Bad
def build_trigger_prompt(trigger_type, themes, history):
    pass

# Good
def build_trigger_prompt(
    trigger_type: str,
    themes: list[str],
    history: list[dict]
) -> list[dict]:
    pass
```

---

- Use Pydantic models for all FastAPI request and response bodies. Never use raw `dict` for API contracts.

```python
# Bad
@app.post("/session/start")
async def start_session(body: dict):
    pass

# Good
class StartSessionRequest(BaseModel):
    user_id: UUID

@app.post("/session/start")
async def start_session(body: StartSessionRequest):
    pass
```

---

- All route handlers must use `async def`.

```python
# Bad
@app.post("/session/intake")
def intake(body: IntakeRequest):
    pass

# Good
@app.post("/session/intake")
async def intake(body: IntakeRequest):
    pass
```

---

- Wrap ALL external API calls in try/except. Never let Anthropic, Hume, or Supabase exceptions reach the client.

```python
# Bad
result = anthropic_client.messages.create(...)

# Good
try:
    result = anthropic_client.messages.create(...)
except Exception as e:
    logger.error(f"Claude API call failed: {e}")
    return fallback_response
```

---

- Never hardcode secrets, API keys, or environment-specific config. Always load from `.env`.

```python
# Bad
ANTHROPIC_API_KEY = "sk-ant-..."

# Good
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
```

---

- Use `Optional` when a value can be `None`. Never assume a value exists without checking.

```python
# Bad
def get_drawing_prompt(themes: list[str]) -> str:
    pass

# Good
def get_drawing_prompt(themes: list[str]) -> Optional[str]:
    pass
```

---

- Prefer `or` and `if` guards over implicit None access.

```python
# Bad
result = session_data["drawing_prompt"].upper()

# Good
prompt = session_data.get("drawing_prompt")
result = prompt.upper() if prompt else None
```

---

- Canvas processor: always decay signals BEFORE processing new events in every `update()` call.

```python
# Bad
def update(self, snapshot: dict) -> TriggerResult:
    self._process_new_events(snapshot)
    self._decay_signals()

# Good
def update(self, snapshot: dict) -> TriggerResult:
    self._decay_signals()  # always first
    self._process_new_events(snapshot)
```

---

- Canvas processor: always check cooldown in `should_trigger()` before returning `True`.

```python
# Bad
def should_trigger(self) -> TriggerResult:
    if self.total_signal > TRIGGER_THRESHOLD:
        return TriggerResult(should_fire=True)

# Good
def should_trigger(self) -> TriggerResult:
    in_cooldown = (time.time() - self.last_trigger_time) < COOLDOWN_SECONDS
    cost = FLOW_COST[self.flow_intensity] + (COOLDOWN_PENALTY if in_cooldown else 0)
    if self.total_signal - cost > TRIGGER_THRESHOLD:
        return TriggerResult(should_fire=True)
```

---

- Canvas processor: `reset_after_trigger()` must always reset BOTH contributing signal scores AND `last_trigger_time`.

```python
# Bad
def reset_after_trigger(self) -> None:
    self.signal_scores.clear()

# Good
def reset_after_trigger(self) -> None:
    self.signal_scores.clear()
    self.last_trigger_time = time.time()
    self.check_in_target = self.elapsed + random.uniform(150, 300)
```

---

- Hume injection: always check if user is currently speaking before injecting a trigger response. Queue if mid-turn.

```python
# Bad
async def inject_trigger(self, text: str) -> None:
    await self.hume_ws.send({"type": "assistant_input", "text": text})

# Good
async def inject_trigger(self, text: str) -> None:
    if self.user_is_speaking:
        self.injection_queue.append(text)
        return
    await self.hume_ws.send({"type": "assistant_input", "text": text})
```

---

- Claude calls: validate JSON responses before using them. Always have a fallback.

```python
# Bad
response = call_claude(prompt)
themes = json.loads(response)["themes"]

# Good
try:
    response = call_claude(prompt)
    parsed = json.loads(response)
    themes = parsed.get("themes", [])
except (json.JSONDecodeError, KeyError) as e:
    logger.error(f"Claude response parsing failed: {e}")
    themes = []
```

---

- Session data is written to Supabase ONCE at `POST /session/complete`. Never write session data mid-session.

```python
# Bad — writing during session
@app.post("/session/canvas-snapshot")
async def canvas_snapshot(body: SnapshotRequest):
    supabase.table("sessions").update({"data": ...}).eq("id", body.session_id).execute()

# Good — only write at session complete
@app.post("/session/complete")
async def session_complete(body: CompleteRequest):
    supabase.table("sessions").insert({...}).execute()
```

---

- Active session state lives in an in-memory dict keyed by session_id. Do not use Supabase for mid-session state.

```python
# Good
active_sessions: dict[str, CanvasEventProcessor] = {}

@app.post("/session/start")
async def start_session(body: StartSessionRequest):
    session_id = str(uuid4())
    active_sessions[session_id] = CanvasEventProcessor()
    return {"session_id": session_id}
```

---

- Follow DRY and single responsibility. One file per concern.

```
main.py             → routes only
canvas_processor.py → signal logic only
claude_calls.py     → Claude API only
hume_client.py      → Hume WebSocket only
supabase_client.py  → database only
models.py           → Pydantic models only
```

---

- Run tests after every meaningful change.

```bash
pytest tests/
uvicorn main:app --reload  # confirm it starts clean
```

---

- After running tests, 100% passing is the only acceptable result. Do not comment out tests to make them pass. Fix the underlying issue.

---

- Never expose stack traces or internal errors to API responses.

```python
# Bad
return {"error": str(e), "traceback": traceback.format_exc()}

# Good
logger.error(f"Internal error: {e}")
return JSONResponse(status_code=500, content={"error": "Something went wrong"})
```

---

- Add logging on all errors and important session events.

```python
import logging
logger = logging.getLogger(__name__)

logger.error(f"Claude call failed: {e}")
logger.info(f"Trigger fired: {trigger_type} at {elapsed}s")
```

---

- Read `.github/arverié_backend_spec_v2.md` before touching any session lifecycle logic, canvas processor logic, or Claude call logic. The spec is the source of truth.

---

- At the end of your response, always include a summary of changes made across files.

---

- Do not edit `.github/` spec files without explicit permission from the developer.
