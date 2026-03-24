# Dispatch — Session Rules

> This file is read at the start of every Claude session working on Dispatch.
> It defines how Claude should behave throughout every conversation and coding session.

---

## Starting Every Session

1. Read `ARCHITECTURE.md` — current structure, data flow, known debt
2. Read `TODO.md` — prioritised backlog, current sprint
3. Read `PROPOSITION.md` — what we're building and why
4. Read `DESIGN_SYSTEM.md` — before touching any UI component
5. Confirm: *"Read ARCHITECTURE.md, TODO.md, PROPOSITION.md and DESIGN_SYSTEM.md. Ready to continue from [task]."*

---

## Continuous Documentation Behaviour

Claude must actively maintain documentation throughout every session — not just at the end.

**During any conversation, continuously scan for:**

- Product decisions being made → update `PROPOSITION.md`
- Architectural changes or new patterns → update `ARCHITECTURE.md`
- New tasks, bugs or features identified → update `TODO.md`
- Features added or changed → flag in Help Backlog table in `TODO.md`
- Anything important discussed in chat that isn't captured in a file → flag it and add it

**The rule:** if it matters, it goes in a file. Product decisions must never live only in conversation history.

**After every meaningful change:**
- Update the relevant `.md` file immediately
- Commit and push at the end of every task (`git add . && git commit -m "..." && git push`)

---

## Coding Rules

- Always read `ARCHITECTURE.md` and `TODO.md` before writing any code
- Never work on interdependent features in parallel
- Never use arbitrary Tailwind hex values — extend `tailwind.config.ts` with named tokens
- Always protect against TypeScript errors that will break the Vercel build
- Use Claude Code CLI for all file-level fixes — not Claude Chat
- Test locally with `npm run dev` before pushing to main
- Commit AND push at the end of every task
- **Any new pure function (data transformation, utility, business logic) gets a unit test written at the same time — not retroactively**
- Check every new component at 390px width before considering it done — not a full mobile redesign, just confirm it doesn't break

---

## Tool Usage

| Task | Tool |
|---|---|
| File-level bug fixes, code changes | **Claude Code CLI** (Git Bash inside repo) |
| Architecture decisions, product thinking, schema review | **Claude Chat** |
| Reviewing proposed changes | **Claude Chat** or VS Code diff |
| Deploying | Push to `main` → Vercel auto-deploys |

---

## Model Selection Guide

Use the right model for the task — don't default to one model for everything.

| Task | Recommended model | Reason |
|---|---|---|
| Product thinking, architecture, documentation | **Claude Sonnet 4.6** (current) | Fast, strong reasoning, handles long context |
| Complex multi-file refactors in Claude Code | **Claude Opus 4.6** | Stronger reasoning across large codebases |
| Foundational architecture or schema decisions | **Claude Opus 4.6** | More thorough analysis worth the extra time |
| Quick contained bug fixes | **Claude Sonnet 4.6** or Haiku 4.5 | Faster and cheaper for simple tasks |
| Very long context (ingesting entire codebase) | **Gemini 1.5 Pro** | Larger context window |
| Generating varied synthetic/seed data | **GPT-4o** | Sometimes produces more natural domain-specific data |

**Claude should proactively suggest a model switch when:**
- A task involves reasoning across many files simultaneously → suggest Opus
- A task is simple and contained → note that Haiku would be faster/cheaper
- A task requires a capability that a different model handles better → name it

---

## Developer Context

- **No admin rights on machine** — do not assume standard install paths or attempt new installs without flagging
- **Local dev:** VS Code + Git Bash + npm + Claude Code CLI installed; `npm run dev` → `localhost:3000`
- **Corporate machine** — VS Code/npm/Git Bash installed via specific process to work around corporate security
- **Supabase keys** must be in `.env.local` locally (never committed to git)
- **Vercel** has the same keys as environment variables — check both if connection issues arise

---

## Priority Order

When deciding what to work on, follow this order:

1. 🔧 **Current Sprint** items (top of `TODO.md`)
2. 🔴 **P1** — Supabase integration gaps and critical bugs
3. 🟠 **P2** — Data quality and architecture
4. 🔵 **P3** — Features and UX
5. 🟢 **P4** — Future / post-PoC

Never start P3 work while P1 items remain incomplete unless explicitly instructed.

---

## Testing Rules

- Unit tests live in `__tests__/` folders alongside the code they test
- Use **vitest** for all unit and integration tests — already configured
- Any new pure function gets a test written at the same time it is written
- Test file naming: `functionName.test.ts`
- Run tests before pushing: `npm run test`
- For component/E2E testing use **Playwright** when introduced
- Do not write tests retroactively for existing code unless specifically tasked — focus on new code

---

## Mobile / Responsive Rules

- Large screen (1280px+) is the primary target — this is a planning room tool
- Every new component must be checked at 390px — confirm it doesn't break catastrophically
- Sorting Frame: read-only summary on mobile, no board
- Dashboard: design to work well on mobile — KPIs stack, feed scrolls
- Dependencies graph: list view fallback on mobile
- Admin: desktop only — add a "best experienced on desktop" notice on small screens
- Help: works on all sizes
- Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) consistently — no hardcoded widths

---

## Help Centre Update Rule

Whenever a feature is added, modified or clarified — update the Help Backlog table in `TODO.md`. The Help Centre content in `data/helpContent.ts` must be refreshed after every significant feature change.

Topics that always need Help Centre coverage:
- Any new Admin feature
- Any change to import/sync behaviour
- Any new merge rule or data authority rule
- Any new planning concept (stage indicator, demo mode changes, etc.)
- Metric definitions and thresholds (convergence, freshness, etc.)
