# Dispatch — Architecture

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode, noEmit) |
| Styling | Tailwind CSS |
| Database | Supabase (Postgres) |
| State / Demo | Zustand + localStorage |
| Drag & drop | @dnd-kit/core, @dnd-kit/sortable |
| Dependency graph | reactflow |
| Tests | vitest |
| Deploy | Vercel (auto-deploy on push to main) |

## Repo & Live URLs

- Repo: https://github.com/matthew-bruce/pi-planning-tool
- Live: https://pi-planning-tool.vercel.app

## Local Dev

See `DEVELOPER_SETUP.md`. Developer has VS Code, Git Bash, npm, Git and Claude Code CLI installed locally. `npm run dev` → `http://localhost:3000`. Use Claude Code CLI for all file-level fixes.

---

## Terminology

| Term | Meaning |
|---|---|
| **Program Increment** | The quarterly delivery period. Formal SAFe term. Never "Planning Cycle" or "Planning Increment". |
| **PI** | Acceptable abbreviation for Program Increment in tight UI spaces |
| **PI Planning** | The two-day planning event |
| **ART** | Agile Release Train |
| **Stream-aligned team** | The most common SAFe team type — aligned to a flow of business domain work |

---

## MVP1 Constraints

**MVP1 is read-only.** Dispatch observes and visualises — it does not write back to source systems.

- Drag-and-drop on the Sorting Frame is **visual and local only** — a "what if" planning aid. Changes are not persisted to Supabase and are overridden by any subsequent import or sync.
- No write operations reach ADO or Jira in MVP1.
- Import pipeline is the only write path, and it is an Admin-controlled action.
- Read + Write mode (with write-back to ADO/Jira) is a future phase, gated by an explicit Admin toggle.

---

## Organisation Model

```
ART (Agile Release Train)
│   Independent entity. Teams have no fixed ART affiliation.
│   ART membership is determined per Program Increment via team_art_assignments.
│
Platform (independent grouping of teams — no ART affiliation)
└── Teams (belong to one platform — fixed. No fixed ART.)
    └── team_pi_participation (is this team in this Program Increment?)
        └── team_art_assignments (which ART(s) is this team under in this PI?)
            └── Features (assigned to team, initiative, sprint)
                └── Stories
```

**Key rules:**
- A Platform has no ART relationship. Platform teams provide capacity wherever Features need delivering.
- A Team belongs to exactly one Platform (fixed). This does not change per PI.
- A Team's ART membership is determined per PI via `team_art_assignments` — not from the team or platform record.
- A Team can work across multiple ARTs in the same PI (via multiple `team_art_assignments` rows).
- Teams carry forward into new Program Increments by default if they were in the previous one.
- ARTs carry forward into new Program Increments by default.
- Features, Stories, Dependencies and Import Snapshots do NOT carry forward.

---

## Directory Structure

```
app/
  admin/              – Admin page + all server actions
  api/                – API routes (dashboard, sorting-frame)
  dashboard/          – Dashboard page (server component)
  sorting-frame/      – Sorting Frame page (server component)
  team-planning/      – Team Planning (client-only, Zustand — P1 gap)
  dependencies/       – Dependencies (client-only, Zustand — P1 gap)
  triage/             – Bulk triage (client-only, Zustand — P1 gap)
  help/               – Static help page
  globals.css
  layout.tsx

components/
  admin/              – AdminControlCentre (large tabbed admin UI)
  dashboard/          – LiveDashboard (Supabase-connected)
  sorting-frame/      – SortingFrameBoard (Supabase-connected)
  help/               – HelpLayout, HelpSidebar, HelpArticle, HelpAccordion
  DispatchShell.tsx   – Root layout shell (nav, sidebar, demo mode)
  FeatureCard.tsx     – Draggable feature card (visual-only drag in MVP1)
  SprintColumn.tsx    – Droppable sprint column
  ParkingLotDrawer.tsx – Droppable parking lot side panel

lib/
  admin/              – Server-side admin data access
    arts.ts
    bootstrap.ts      – Parallel data fetch for admin page
    imports.ts        – Snapshot import, rebuild, rollback
    initiatives.ts
    planningCycles.ts – ⚠️ To be renamed programIncrements.ts in Phase 2
    platforms.ts
    readiness.ts      – Cycle readiness summaries
    teams.ts
    types.ts          – Admin-layer TypeScript types
  models.ts           – Canonical domain types (Zustand/demo layer)
  seedData.ts         – Demo seed data generator
  supabase/
    dashboard.ts      – Dashboard data queries
    server.ts         – Supabase client factory (throws if env vars missing)
    sortingFrame.ts   – Sorting Frame data queries
  types/
    dashboard.ts      – DashboardData type (canonical source of truth)
  planning/
    sprintGeneration.ts   – Auto-generate sprint date ranges from PI config
    sprintMapping.ts      – Map imported sprint names to PI sprints
    sprintNumbering.ts    – Continuous sprint numbering across PIs
    __tests__/            – vitest unit tests for planning utilities
  utils.ts            – formatSprintRange

providers/
  dataProvider.ts     – DataProvider interface (integration-ready)
  dummyProvider.ts    – Seed data + simulation mutations

store/
  useDispatchStore.ts – Zustand store (demo state + UI state)

data/
  helpContent.ts      – Static Help Centre content
```

---

## Data Flow — Two Parallel Systems

Dispatch currently has two data layers that coexist:

### 1. Supabase Layer (Production data)
Used by: Dashboard, Sorting Frame, Admin

```
Page (Server Component)
  → lib/supabase/*.ts or lib/admin/*.ts
    → Supabase (Postgres)
      → typed data returned
        → passed as initialData props to Client Components
          → Client can re-fetch via API routes on user interaction
```

### 2. Zustand / Demo Layer
Used by: Team Planning, Dependencies, Triage, demo simulation

```
DispatchShell (mounts on all pages)
  → useDispatchStore (Zustand + localStorage)
    → dummyProvider → seedData.ts
      → persisted to localStorage
        → simulation ticks every 8–15s when demoMode = true
```

> **⚠️ Known gap:** Team Planning, Dependencies and Triage show seed/demo data only. They do not read from Supabase. This is P1 backlog work.

---

## Supabase Schema

### Configuration Tables

| Table | Purpose |
|---|---|
| `program_increments` | PI definitions (name, dates, sprint count, sprint length, active flag, current stage) — ⚠️ currently named `planning_cycles`, Phase 2 rename pending |
| `sprints` | Sprint schedule per PI. Sprint numbering is **continuous across PIs** (PI1 = Sprint 1–6, PI2 = Sprint 7–13, etc.) |
| `platforms` | Platform groupings (WEB, APP, EPS, PDA, BIG, ETP). No ART affiliation — platforms are independent. |
| `arts` | Agile Release Trains. Stores `name` (full) and `short_name` (abbreviation e.g. WAA, OOH, CRM). |
| `teams` | Delivery teams. Belong to one platform (fixed). Have a `team_type` (stream-aligned / platform / enabling / complicated-subsystem). No fixed ART. |
| `team_pi_participation` | Which teams participate in which Program Increments — ⚠️ currently named `team_cycle_participation`, Phase 2 rename pending |
| `team_art_assignments` | Which ART(s) a team is operating under within a specific PI. Separate from participation — a team can be in multiple ARTs per PI. |
| `initiatives` | Epics/workstreams linked to ART + PI |
| `app_settings` | Global app configuration (demo cycle visibility, sync mode, etc.) |

### Live Planning Tables

| Table | Purpose |
|---|---|
| `features` | Live feature records for the active PI |
| `stories` | Live story records |
| `dependencies` | Live dependency records |

> **Planned additions to `features` and `stories`** (Phase 1 schema migration):
> - `source_key` — internal system ID from ADO/Jira (stable, never changes unlike ticket_key)
> - `workflow_status` — renamed from ambiguous `status` field (Phase 2)
>
> **Merge strategy fields already present:** `source_system`, `last_synced_at`, `updated_at`

### Import / Snapshot Tables

| Table | Purpose |
|---|---|
| `import_snapshots` | Import history and status (`imported` / `rolled_back`) |
| `snapshot_features` | Raw imported feature rows (immutable history) |
| `snapshot_stories` | Raw imported story rows |
| `snapshot_dependencies` | Raw imported dependency rows |
| `activity_events` | Event log per PI (powers Live Tracking Dashboard feed) |

### Key Relationships

```
program_increments → sprints (1:many)
program_increments → initiatives (1:many)
program_increments → team_pi_participation (1:many)
program_increments → team_art_assignments (1:many)
arts → initiatives (1:many)
arts → team_art_assignments (1:many)
platforms → teams (1:many)
teams → team_pi_participation (1:many)
teams → team_art_assignments (1:many)
initiatives → features (1:many, via import)
teams → features (1:many, via import)
sprints → features (1:many, nullable — null = parking lot)
features → stories (1:many)
features → dependencies (source and target, many:many via ticket_key currently)
import_snapshots → snapshot_features / snapshot_stories / snapshot_dependencies
```

### PI Naming Conventions

| Prefix | Purpose | Visible to regular users? |
|---|---|---|
| None (e.g. `FY26 Q1`) | Real Program Increments | Yes |
| `DEMO —` (e.g. `DEMO — Gold Dataset`) | Demo Mode showcase data | Admin toggle only |
| `TEST —` (e.g. `TEST — Import Trial`) | Development/testing | Admin toggle only |

---

## Import Architecture

Imports are **snapshot-based**, not upsert-based. This enables safe rollback.

```
CSV uploaded → parsed client-side
    → columns mapped → rows validated against active PI sprints
        → import_snapshots row created
            → raw rows stored in snapshot_features / snapshot_stories / snapshot_dependencies
                → rebuildLiveTablesFromSnapshots()
                    → clears live tables for PI
                    → rebuilds from all status='imported' snapshots
```

**Rollback:**
1. Mark latest `import_snapshots.status = 'rolled_back'`
2. Trigger rebuild from remaining active snapshots

> **⚠️ Known limitation:** Rebuild is destructive (delete + reinsert). Will be replaced with deterministic upsert strategy in Phase 2. See TODO.

### Data Source Authority Rules

BAU tooling (ADO/Jira) is always the source of truth. Timestamp wins:

| Situation | Rule |
|---|---|
| Row doesn't exist | Insert it |
| Row exists, incoming data is newer (`last_synced_at`) | Update it |
| Row exists, incoming data is older | Leave it alone |
| Local visual change (drag-and-drop, MVP1 read-only) | Ephemeral — overridden by any sync or import |

No `manually_edited` flag — BAU tooling is always the authority. These rules are documented in Help Centre and shown in-situ from the Import UI.

---

## Program Increment Management

When creating a new Program Increment, Dispatch:
1. Takes: PI name, start date, sprint count, sprint length (default 14 days)
2. Derives next sprint number from the highest existing sprint across all PIs
3. Auto-generates sprint records with correct date ranges
4. Shows a **preview table** for user confirmation before saving
5. Allows manual date editing in the preview
6. **Carry-forward:** copies participating teams and ARTs from the previous PI as defaults
7. Facilitator reviews and adjusts carried-forward teams/ARTs before confirming

Features, Stories, Dependencies and Import Snapshots are **never** carried forward.

---

## Demo Mode Architecture

```
User toggles Demo Mode ON
  → Zustand loads DEMO — PI data from Supabase as baseline (read-only)
    → Simulation ticks begin (Zustand in-memory only)
      → Simulated events: feature commits, dependency flags, sprint load shifts
        → Activity feed, Dashboard KPIs, Sorting Frame all update in real time
          → Nothing writes back to Supabase

User toggles Demo Mode OFF
  → Zustand reverts to real active PI
  → Amber banner disappears
```

---

## Planning Stage Architecture

The current stage is stored on `program_increments.current_stage` (integer 1–6). Set by facilitator via header control. Read by all clients. No workflow implications — purely a contextual lens.

**Stages:**
1. Business Context & Vision
2. Team Breakouts — Draft Plan
3. Draft Plan Review
4. Team Breakouts — Revised Plan
5. Final Plan Review & RoART
6. PI Planning Complete

---

## Sync Mode

| Mode | Behaviour |
|---|---|
| **Read Only** (MVP1 default) | Drag-and-drop is visual/local only. No writes to source systems. |
| **Read + Write** (future phase) | Write-back to ADO/Jira with confirmation dialogs. Admin toggle only. |

---

## Provider Pattern (Integration-Ready)

```
providers/dataProvider.ts    – DataProvider interface
providers/dummyProvider.ts   – Current implementation (seed + simulation)

Future:
providers/adoProvider.ts     – Azure DevOps
providers/jiraProvider.ts    – Jira
```

---

## Design Tokens

```ts
colors: { royalRed: '#CC0000' }
```

Never use arbitrary hex values. Always extend `tailwind.config.ts`.

---

## Canonical Domain Types

```ts
ART         { id, name, shortName }
Platform    { id, name }                          // No ART affiliation
Team        { id, name, platformId, teamType }    // No fixed ART
Initiative  { id, artId, programIncrementId, name }
Sprint      { id, number, name, startDate, endDate }
Feature     { id, ticketKey, sourceKey, title, initiativeId, teamId, sprintId,
              storyCount, dependencyCounts, commitmentStatus, workflowStatus,
              sourceUrl, sourceSystem, lastSyncedAt }
Dependency  { id, sourceFeatureId, targetFeatureId,  // resolved UUIDs
              sourceTicketKey, targetTicketKey,        // raw import keys
              type, owner, criticality, targetSprintName, description }
```

---

## Phase 2 Rename Tasks (do not mix with Phase 1 additive changes)

| Current name | Rename to | Scope |
|---|---|---|
| `planning_cycles` table | `program_increments` | DB + all TypeScript |
| `team_cycle_participation` table | `team_pi_participation` | DB + all TypeScript |
| `planning_cycle_id` columns (all tables) | `program_increment_id` | DB + all TypeScript |
| `status` column on `features`, `stories` | `workflow_status` | DB + all TypeScript |
| `dependency_type/owner/criticality/target_sprint/description` | `type/owner/criticality/target_sprint_name/description` | DB + all TypeScript |
| `feature_key` in `snapshot_features` | `ticket_key` | DB |
| `story_key` in `snapshot_stories` | `ticket_key` | DB |
| All UI labels "Planning Cycle" | "Program Increment" | TypeScript/TSX |
| `lib/admin/planningCycles.ts` | `lib/admin/programIncrements.ts` | TypeScript |

---

## Standing Documentation Rules

> 1. Read `ARCHITECTURE.md`, `TODO.md`, `SESSION_RULES.md` at the start of every session
> 2. Update `ARCHITECTURE.md` after any structural change
> 3. Update `TODO.md` after any task completed or identified
> 4. Update `PROPOSITION.md` when product direction changes
> 5. Flag Help Centre updates in Help Backlog table in `TODO.md`
> 6. Continuously scan for documentation gaps — if it matters, it goes in a file
> 7. Never let product decisions live only in conversation history
> 8. Call out incorrect SAFe terminology immediately — the correct term is **Program Increment**

---

## Known Technical Debt

| Issue | Severity | Location |
|---|---|---|
| Team Planning not Supabase-connected | 🔴 P1 | `app/team-planning/` |
| Dependencies page not Supabase-connected | 🔴 P1 | `app/dependencies/` |
| Triage page not Supabase-connected | 🔴 P1 | `app/triage/` |
| ART switching bug on Sorting Frame | 🔴 P1 | `components/sorting-frame/SortingFrameBoard.tsx` |
| Permanent "Loading…" on Sorting Frame | 🔴 P1 | `components/sorting-frame/SortingFrameBoard.tsx` |
| `planning_cycles` table needs renaming to `program_increments` | 🟠 P2 | DB + all TypeScript |
| `planning_cycle_id` columns need renaming to `program_increment_id` | 🟠 P2 | DB + all TypeScript |
| `status` column ambiguous — needs renaming to `workflow_status` | 🟠 P2 | `features`, `stories` |
| `dependency_*` column prefix redundant | 🟠 P2 | `dependencies`, `snapshot_dependencies` |
| `getActiveOrSelectedPlanningCycle` duplicated | 🟠 P2 | `lib/supabase/dashboard.ts` + `sortingFrame.ts` |
| Snapshot rebuild is destructive (no merge strategy) | 🟠 P2 | `lib/admin/imports.ts` |
| Supabase null guards are dead code | 🟡 P3 | `lib/admin/*.ts` |
| Two `Art` types (models.ts vs admin/types.ts) | 🟡 P3 | `lib/models.ts` |
