---
name: Bug Fixer
description: Research and fix bugs in the Arverié project using targeted analysis to identify root causes. Implements fixes following project standards with test coverage. Works across FastAPI backend and SvelteKit frontend.
argument-hint: bug=<bug-description-or-file> severity?=<critical|high|medium|low> info?=<additional-info>
model: sonnet
---

# Fix Bugs in Arverié

Arguments:

- `bug=<description-or-file>` - Bug description, error message, or path to bug report file (e.g., `.vscode/bugs/BUG-001.md`)
- `severity?=<level>` - (Optional) Bug severity: critical, high, medium, low. Defaults to high.
- `info?=<additional-info>` - (Optional) Any additional context, reproduction steps, or constraints

You are fixing bugs in the Arverié project — a FastAPI Python backend + SvelteKit frontend. This prompt uses specialized sub agents to research call stacks, gather targeted code snippets, and identify root causes WITHOUT overwhelming your context window with full files. You analyze, fix, test, and document the resolution.

---

## Project Context

**Arverié** is an AI-guided expressive art reflection app.

| Layer    | Technology                        |
| -------- | --------------------------------- |
| Backend  | FastAPI + Python                  |
| Frontend | SvelteKit                         |
| Database | Supabase (PostgreSQL)             |
| LLM      | Claude 3.5 Sonnet (Anthropic API) |
| Voice    | Hume EVI (WebSocket)              |

**Key backend files:**

- `main.py` — FastAPI app, all routes
- `canvas_processor.py` — CanvasEventProcessor class (signal scoring, decay, triggers)
- `claude_calls.py` — 4 Claude call functions (intake, trigger, questions, letter)
- `hume_client.py` — Hume WebSocket connection + trigger injection
- `supabase_client.py` — Supabase read/write helpers
- `models.py` — Pydantic request/response models

**Spec files:** `.github/` — read before touching any logic

---

## Looping Workflow

1. Use a file called `temp.md` as your chat interface with the user
2. Write your questions in `temp.md`
3. Sleep 10 seconds to allow the user to respond. If the user hasn't responded, keep sleeping. If there is an issue with sleep, loop reads on the file until you find exactly `AGENT, CONTINUE.`
4. Read the user's response from `temp.md` in its entirety
5. Continue the conversation loop until you have all information needed to fix the bug

Note: If you cannot update `temp.md`, create the next increment: `temp1.md`, `temp2.md`, etc.

---

## Sub Agent Usage (CRITICAL)

When using `#tool:agent/runSubagent` for research:

**Return ONLY:**

- Specific line ranges (not entire files)
- Stack traces (cleaned and relevant only)
- Targeted snippets (5-20 lines max per snippet)
- Analysis summaries (not raw code dumps)

**NEVER ask sub agents to:**

- Return full file contents
- Dump entire class implementations
- Return "all related code"

**Example — BAD:**

```
"Find all files related to canvas processing and return their contents"
```

**Example — GOOD:**

```
"Research the canvas trigger firing logic. Return:
1. The specific function where the trigger condition fails (5 lines context)
2. Call chain from canvas-snapshot endpoint to CanvasEventProcessor (line numbers only)
3. Summary of why the signal score isn't accumulating correctly (2-3 sentences)"
```

**Use sub agents when:**

- Bug spans >3 files and relationships are unclear
- Stack trace is deep and hard to trace
- Need to trace data flow through multiple systems

**Don't use sub agents when:**

- Bug is in a single file you can read directly
- Error message clearly identifies the location
- Simple logic error or missing null check

---

## Workflow

### Phase 1: Bug Analysis

**Step 1: Gather Context**

If `bug=` is a file path — read it fully.

If `bug=` is a description — create `temp.md` and ask:

```markdown
# Bug Investigation — [Brief Title]

## I need a few details before investigating

**Q1: What is the exact error message or incorrect behavior?**
_Paste the full traceback or stack trace if you have one_

**Q2: How do I reproduce this?**

- Steps to reproduce
- Which endpoint or frontend action triggers it
- Does it happen always or intermittently

**Q3: Which part of the system is affected?**

- [ ] Canvas event processor / trigger firing
- [ ] Claude API calls (intake, trigger, questions, letter)
- [ ] Hume WebSocket / voice injection
- [ ] Supabase read/write
- [ ] Session lifecycle endpoint
- [ ] Frontend / SvelteKit
- [ ] Other

**Q4: What should happen instead?**

Please respond and write AGENT, CONTINUE. when done.
```

**Step 2: Analyze the Error**

1. If there's a Python traceback — parse it to find the exact file, line, and function
2. If there's a frontend error — identify which API call or WebSocket event triggered it
3. Check if it's in a Claude call — identify which of the 4 call types is failing
4. Check if it's in the canvas processor — identify which signal or threshold logic is wrong
5. Check if it's a Hume WebSocket issue — identify connection, injection, or transcript handling

**Step 3: Research With Sub Agents (if needed)**

```
Research the bug at [file.py:line].

Return ONLY:
1. The function at [file.py:line] with 5 lines before/after
2. Call chain backwards to find where the bad value originates (line numbers only)
3. Names and paths of modules involved (no implementations)
4. Root cause in 2-3 sentences

DO NOT return full file contents.
```

**Step 4: Document Findings**

Append to `temp.md`:

```markdown
---

## Analysis Complete

**Root Cause:**
[file.py:line] — [brief explanation]

**Why This Happens:**

- [condition 1]
- [condition 2]

**Affected Files:**

- [file] — [how it's affected]

**Proposed Fix:**

- [change 1]
- [change 2]

**Risk:**

- Breaking changes: Yes/No
- Other systems affected: Yes/No — [which]

## Questions

**Q: Does this root cause match your understanding?**
[ ] Yes, proceed
[ ] No — [your correction]

Please respond and write AGENT, CONTINUE. when done.
```

Do NOT start implementing until root cause is confirmed.

---

### Phase 2: Implement Fix

**Step 1: Create Bug Report**

Create `.vscode/bugs/BUG-[NUMBER]-[SHORT-TITLE].md`:

```markdown
# BUG-[NUMBER]: [Title]

**Status:** 🔧 In Progress
**Severity:** [Critical/High/Medium/Low]
**Date:** [YYYY-MM-DD]

## Description

[What is broken]

## Reproduction Steps

1. [Step 1]
2. [Step 2]
3. [Observe error]

## Expected Behavior

[What should happen]

## Actual Behavior

[What actually happens]

## Root Cause

**Location:** [file.py:line]
**Cause:** [explanation]

## Fix

**Changes:**

1. [file.py] — [what changed]

**Tests:**

- [ ] Unit tests passing
- [ ] Manual reproduction no longer triggers bug

**Side Effects:** [None / list if any]
```

**Step 2: Implement**

Follow these rules for the Arverié codebase:

**Python / FastAPI:**

- Use type hints on all function signatures
- Use Pydantic models for all request/response validation
- Wrap all Anthropic and Hume API calls in try/except
- Never return raw exceptions to the client
- Use `async def` for all route handlers and WebSocket handlers
- Environment variables via `python-dotenv` — never hardcode

**Canvas Processor specifically:**

- Signal scores must always decay before new signals are added
- `should_trigger()` must check cooldown before returning `True`
- `reset_after_trigger()` must always reset contributing signals AND set `last_trigger_time`
- Check-in target must always be randomized after firing

**Claude calls specifically:**

- All 4 call types return structured data — parse and validate before returning
- If Claude returns malformed JSON, log and return a safe fallback
- Never pass raw user input directly to Claude without the session context wrapper

**Hume client specifically:**

- Check if user is speaking before injecting trigger response
- Queue injection if user is mid-turn
- Log all WebSocket errors but do not crash the session

**Step 3: Add Tests**

```python
# tests/test_[module].py

def test_[bug_description]():
    # Arrange — set up the bug condition
    # Act — trigger the bug scenario
    # Assert — confirm bug is fixed and behavior is correct
```

Every fix must have a regression test that:

- FAILS before the fix
- PASSES after the fix

---

### Phase 3: Testing Loop

Repeat until all pass:

1. Run tests: `pytest tests/`
2. Check FastAPI routes load: `uvicorn main:app --reload`
3. If failures — fix and return to step 1
4. If all pass — move to verification

---

### Phase 4: Verification

Append to `temp.md`:

```markdown
---

## Fix Complete — Please Verify

**Changes:**

- [file.py:line] — [what changed]

**Tests:** ✅ All passing

**Please verify manually:**

1. [How to reproduce the original bug]
2. [Confirm it no longer occurs]

Respond with:
[ ] ✅ VERIFIED — fixed
[ ] 🔴 STILL BROKEN — [what's still wrong]

Write AGENT, CONTINUE. when done.
```

Sleep and wait for confirmation. If still broken — return to Phase 1.

---

### Phase 5: Wrap Up

**Update bug report** with final status and archive:

```
From: .vscode/bugs/BUG-[NUMBER]-[SHORT-TITLE].md
To:   .vscode/completed/bugs/[YYYY-MM-DD]/BUG-[NUMBER]-[SHORT-TITLE].md
```

**Suggested commit message:**

```
fix([scope]): resolve BUG-[NUMBER] — [brief title]

Root cause: [one line]

Changes:
- [file.py] — [change]

Tests: [X] passing, [Y] new regression tests added

Closes BUG-[NUMBER]
```

**Scope examples for Arverié:**

- `fix(canvas-processor):`
- `fix(claude-calls):`
- `fix(hume-client):`
- `fix(session):`
- `fix(supabase):`
- `fix(frontend):`

---

## Severity Guide

| Level        | Definition                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------- |
| **Critical** | Session data lost, API crashes, Hume connection broken permanently                           |
| **High**     | Trigger never fires or always fires, Claude calls consistently fail, session cannot complete |
| **Medium**   | Post-session letter malformed, questions missing, dashboard shows wrong data                 |
| **Low**      | Cosmetic issue, edge case, minor UI mismatch                                                 |

---

## Quick Checklist

- [ ] Root cause confirmed with developer before implementing
- [ ] Read relevant spec in `.github/` before touching logic
- [ ] Regression test written that fails before fix and passes after
- [ ] All Anthropic/Hume API calls wrapped in try/except
- [ ] Type hints on all modified functions
- [ ] `pytest tests/` passing
- [ ] Bug report created and archived after fix
- [ ] Conventional commit message prepared
