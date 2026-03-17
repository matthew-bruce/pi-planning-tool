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
  DispatchShell.tsx   – Root layout shell (nav, header, demo mode)
  FeatureCard.tsx     – Draggable feature card
  SprintColumn.tsx    – Droppable sprint column
  ParkingLotDrawer.tsx – Droppable parking lot side panel

lib/
  admin/              – Server-side admin data access
    arts.ts
    bootstrap.ts      – Parallel data fetch for admin page
    imports.ts        – Snapshot import, rebuild, rollback
    initiatives.ts
    planningCycles.ts
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
    sprintGeneration.ts   – Auto-generate sprint date ranges from cycle config
    sprintMapping.ts      – Map imported sprint names to cycle sprints
    sprintNumbering.ts    – Continuous sprint numbering across cycles
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
| `planning_cycles` | PI cycle definitions (name, dates, sprint count, sprint length) |
| `sprints` | Sprint schedule per cycle. Sprint numbering is **continuous across cycles** (Q1 = 1–6, Q2 = 7–13, etc.) |
| `platforms` | Platform groupings (WEB, APP, EPS, PDA, BIG, ETP) |
| `arts` | Agile Release Trains (Web & App, Out Of Home) |
| `teams` | Delivery teams — linked to platform, NOT to initiatives |
| `initiatives` | Epics/workstreams linked to ART + cycle |
| `team_cycle_participation` | Which teams participate in which cycles |

### Live Planning Tables (rebuilt from snapshots on import)

| Table | Purpose |
|---|---|
| `features` | Live feature records for the active cycle |
| `stories` | Live story records |
| `dependencies` | Live dependency records |

### Import / Snapshot Tables

| Table | Purpose |
|---|---|
| `import_snapshots` | Import history and status (`imported` / `rolled_back`) |
| `snapshot_features` | Raw imported feature rows (immutable history) |
| `snapshot_stories` | Raw imported story rows |
| `snapshot_dependencies` | Raw imported dependency rows |
| `activity_events` | Event log per cycle (powers Live Tracking Dashboard feed) |

### Key Relationships

```
planning_cycles → sprints (1:many)
arts → initiatives (1:many)
planning_cycles → initiatives (1:many)
platforms → teams (1:many)
teams → team_cycle_participation (1:many)
planning_cycles → team_cycle_participation (1:many)
initiatives → features (1:many, via import)
teams → features (1:many, via import)
sprints → features (1:many, nullable — null = parking lot)
features → stories (1:many)
features → dependencies (source and target, many:many)
import_snapshots → snapshot_features / snapshot_stories / snapshot_dependencies
```

---

## Import Architecture

Imports are **snapshot-based**, not upsert-based. This enables safe rollback.

```
CSV uploaded → parsed client-side
    → columns mapped → rows validated against active cycle sprints
        → import_snapshots row created
            → raw rows stored in snapshot_features / snapshot_stories / snapshot_dependencies
                → rebuildLiveTablesFromSnapshots()
                    → clears live tables for cycle
                    → rebuilds from all status='imported' snapshots
```

**Rollback:**
1. Mark latest `import_snapshots.status = 'rolled_back'`
2. Trigger rebuild from remaining active snapshots

> **⚠️ Known limitation:** Rebuild is destructive (delete + reinsert). Manual edits to live tables are lost on re-import. A deterministic merge/upsert strategy is a future TODO.

### Sprint Mismatch Handling

Dispatch uses the Planning Cycle cadence as the canonical sprint structure. If imported sprint names do not match the active cycle, the user is warned before import proceeds. Dispatch does not silently rewrite the cycle cadence from imported data.

---

## Planning Cycle Management

When creating a new Planning Cycle, Dispatch:
1. Takes: cycle name, start date, sprint count, sprint length (default 14 days)
2. Derives next sprint number from the highest existing sprint across all cycles
3. Auto-generates sprint records with correct date ranges
4. Shows a **preview table** for user confirmation before saving
5. Allows manual date editing in the preview

---

## Provider Pattern (Integration-Ready)

```
providers/dataProvider.ts    – DataProvider interface
providers/dummyProvider.ts   – Current implementation (seed + simulation)

Future:
providers/adoProvider.ts     – Azure DevOps
providers/jiraProvider.ts    – Jira
```

To switch providers: change `const provider = dummyProvider` in `store/useDispatchStore.ts`.

The UI never talks directly to source systems — it depends only on the DataProvider interface. This ensures Supabase data and future ADO/Jira sync can be introduced without changing UI code.

---

## Design Tokens

```ts
// tailwind.config.ts
colors: {
  royalRed: '#CC0000',
}
```

**Rule:** Never use arbitrary hex values in Tailwind classes. Always extend `tailwind.config.ts` with named tokens.

---

## Canonical Domain Types

The core planning model used across the app:

```ts
ART         { id, name }
Initiative  { id, artId, name }
Team        { id, platform, name }  // NOT linked to initiatives
Sprint      { id, number, name, startDate, endDate }
Feature     { id, ticketKey, title, initiativeId, teamId, sprintId,
              storyCount, dependencyCounts, commitmentStatus, sourceUrl }
Dependency  { id, sourceFeatureId, targetFeatureId, type }
```

Teams appear under initiatives **only** when they have ≥1 feature assigned to that initiative. This is not a permanent relationship.

---

## Known Technical Debt

| Issue | Severity | Location |
|---|---|---|
| Team Planning not Supabase-connected | 🔴 P1 | `app/team-planning/` |
| Dependencies page not Supabase-connected | 🔴 P1 | `app/dependencies/` |
| Triage page not Supabase-connected | 🔴 P1 | `app/triage/` |
| Drag-and-drop doesn't write back to Supabase | 🔴 P1 | `store/useDispatchStore.ts` |
| `getActiveOrSelectedPlanningCycle` duplicated | 🟠 P2 | `lib/supabase/dashboard.ts` + `sortingFrame.ts` |
| Snapshot rebuild is destructive (no merge strategy) | 🟠 P2 | `lib/admin/imports.ts` |
| Supabase null guards are dead code | 🟡 P3 | `lib/admin/*.ts` |
| Two `Art` types (models.ts vs admin/types.ts) | 🟡 P3 | `lib/models.ts` |
