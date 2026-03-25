# Dispatch — Claude Code Instructions

> Read this before touching any code.

---

## What This App Is

Dispatch is a PI Planning orchestration layer for RMG Technology. It sits on top of existing BAU tooling (Jira, Azure DevOps) and surfaces team dependencies, risks, and capacity in a structured, visual way — replacing the Mural boards and manual processes currently used during PI Planning events.

It is a working tool, not a prototype. Teams are using it. Treat it accordingly.

**Live URL:** https://pi-planning-tool.vercel.app \
**Status:** Live (beyond PoC) \
**Stack:** React (Vite), [Supabase / localStorage], Vercel

---

## Golden Rules

### 1. Always write unit tests
Every new component, hook, utility function, or data access function must have a unit test. Use Vitest. Tests live in `__tests__/` adjacent to the file they test. Do not ship untested code.

### 2. CRUD is always a requirement
If a user can **create** something, they can also **edit** and **delete** it. No exceptions. If you build an add form, you also build the edit form and delete confirmation. Always.

### 3. Confirm before destructive actions
Any delete must show a confirmation prompt. No silent deletes.

### 4. Dates in UK format
All user-facing dates in `en-GB` format: `24 Mar 2026`. Never ISO strings in the UI.

### 5. No hardcoded credentials
API keys, integration tokens, and secrets go in `.env.local` only. Never in source code.

### 6. Keep components focused
Files under 300 lines where possible. If a component is doing too much, split it.

### 7. Import data is read-only
Data imported from Jira or ADO should never be mutated in this app. Dispatch adds a layer on top — it does not edit source systems.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite |
| Data | [Supabase / localStorage] |
| Integrations | Jira API, Azure DevOps API |
| Deployment | Vercel (auto-deploys from main branch) |
| Testing | Vitest |

---

## Key Features

- **Import** — pull team board data from Jira / ADO
- **Canonical data layer** — normalise imported data into a consistent structure
- **Sorting Frame** — visualise and sort work items by team, risk, dependency
- **Dashboard** — summary view of PI health, dependencies, risks
- **Dependency mapping** — surface cross-team dependencies that Jira/ADO don't show clearly

---

## What Not to Do

- Do not mutate imported Jira/ADO data
- Do not hard delete records — soft delete only
- Do not hardcode API credentials or tokens
- Do not build create without edit and delete
- Do not skip tests
- Do not display raw IDs or database internals to users

---

## Current Focus

Last session: [Date] — [What was done]
Next session: [What needs doing next]

---

*Last updated: 25 March 2026*
