# Lessons

## 2026-03-20 — Always follow CLAUDE.md workflow before touching any code

**What happened:** User asked for changes to tests and the system prompt. I went straight to reading files and implementing without:
1. Creating `tasks/todo.md` with a plan first
2. Checking in with the user before starting
3. Spawning the correct agent (senior-backend-agent for backend files)
4. Creating the `tasks/` folder at all

**Rule:** Before ANY implementation task, no matter how simple:
1. Create `tasks/` if it doesn't exist
2. Write `tasks/todo.md` with a checklist plan
3. Check in with the user — confirm the plan before writing a single line of code
4. Spawn the agent matching the task type from the Agent Routing table in CLAUDE.md
5. Mark items complete as you go
6. Add review + lessons at the end

**Why it matters:** CLAUDE.md is the source of truth for this project's workflow. Skipping it creates drift and makes the user have to re-correct the same mistakes.
