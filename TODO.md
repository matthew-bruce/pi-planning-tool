# Dispatch — TODO

> **Session rule:** Start every Claude session by reading `ARCHITECTURE.md`, `TODO.md` and `SESSION_RULES.md`.
> Check off items as completed. Update `ARCHITECTURE.md` after any structural change.
> **Never work on interdependent features in parallel.**
> **Always commit AND push at the end of every task.**

---

## 🔧 Current Sprint

Active work — tackle these before anything else.

- [x] Schema audit — complete. Phase 1 and Phase 2 migration tasks defined below.
- [x] **Schema Phase 1** — additive changes only — complete
- [x] **CRITICAL BUG — rebuildLiveTablesFromSnapshots fixed**
  - Root cause: CSV has one row per story with feature columns repeated — caused duplicate feature_key inserts hitting UNIQUE constraint, silently failing entire batch
  - Fix: deduplicate snapshot_features by feature_key before INSERT
  - Fix: proper error propagation added to all three INSERT calls
  - Fix: auto-creation of value streams and teams during rebuild
  - 8 unit tests added covering all resolution branches
  - Branch pending merge to main

- [ ] **Schema Phase 2** — renames and removals (Claude Code — after Phase 1 is stable)
- [x] **UI label fixes — "Planning Cycle" → "Program Increment"** — UI-only changes, no DB migration needed
- [x] Load gold demo dataset — 62 features, 211 stories, 27 dependencies, 18 value streams, 29 teams in Demo PI
- [x] ART switching bug fixed — removed selectedArtId from first useEffect deps in SortingFrameBoard
- [x] Permanent "Loading…" bug fixed — setLoading(false) added to early-return guard branch
- [x] Admin/Help header fix — showPlanningHeader flag suppresses planning header on /admin and /help
- [x] Bulk Triage "not live data" banner added
- [x] TypeScript declaration errors resolved — npm install restored missing node_modules
- [x] .gitignore added — was entirely absent from repo
- [x] Design system phase 1 — RMG branding, VS colours, dashboard colour coding, Activity Feed panel and standalone page
- [x] Stories linked to features via SQL (feature_id populated on all 211 stories)
- [x] Source systems varied on demo data (WEB=ado_sync, OOH/EPS/BIG/APP=jira_sync)
- [x] 8 parking lot features added to Demo PI
- [ ] Demo Mode guard — simulation ticks should not fire when Supabase has real data for the active PI
- [ ] UI batch 2 fixes — in progress via Claude Code

---

## ✅ Done

- [x] Next.js 14 App Router scaffold with TypeScript strict mode
- [x] Supabase connected (server client, env vars, `lib/supabase/server.ts`)
- [x] Tailwind configured with design tokens (royalRed, royalYellow, vs1-vs8, semantic tokens)
- [x] Provider pattern — `DataProvider` interface + `dummyProvider` + Zustand store
- [x] Seed data generator (`lib/seedData.ts`) with real RMG value streams/teams
- [x] Demo Mode — moved to sidebar, defaults to OFF, amber banner persists
- [x] `DispatchShell` — collapsible nav with icons, red planning header with RMG stripe, Royal Mail logo
- [x] Sorting Frame — Supabase-connected, sticky sprint header, VS colour differentiation, team full-width rows, expandable stories, story-sprint dots, feature hyperlinks, dependency badges, search with highlighting, expand/collapse all
- [x] Live Tracking Dashboard — fully Supabase-connected with colour-coded KPIs, ART convergence tiles
- [x] Activity Feed — collapsible panel, full-screen /activity page, filter popover, date/team/platform/VS/ART filters, resizable, PI date defaults
- [x] Admin Control Centre — Program Increments (with editable sprint preview), Platforms, ARTs (with drag/drop ordering), Teams, Value Streams, Import/Sync
- [x] Sprint generation utilities with DEMO/TEST sandbox fix and year-reset logic
- [x] vitest unit tests for planning utilities, highlight match, strip feature prefix
- [x] Dependencies page — reactflow graph (Zustand/demo data — P1 gap remains)
- [x] Team Planning page (Zustand/demo data — P1 gap remains)
- [x] Bulk Triage page (Zustand/demo data — P1 gap remains)
- [x] Help Centre — searchable, collapsible sections, sidebar navigation
- [x] `PROPOSITION.md`, `ARCHITECTURE.md`, `TODO.md`, `DEVELOPER_SETUP.md`, `SESSION_RULES.md` written and committed
- [x] Local dev environment established (VS Code, Git Bash, npm, Claude Code CLI, localhost:3000)
- [x] Schema Phase 1 — 24 additive changes applied
- [x] Royal Mail logo added to public/ folder and sidebar

---

## 🔴 P1 — Supabase Integration Gaps

- [ ] **Connect Team Planning to Supabase**
  - Create `lib/supabase/teamPlanning.ts` data fetcher
  - Query: teams, features, stories, sprints for active PI + selected ART
  - Convert `app/team-planning/page.tsx` to server component
  - Pass `initialData` to client board (same pattern as Sorting Frame)
  - Team-centric view: stories are the primary unit, features provide context

- [ ] **Connect Dependencies to Supabase**
  - Fetch real dependency data from `dependencies` table
  - Fetch features and teams for active PI
  - Wire reactflow nodes/edges to live data
  - Retain ART and platform filters
  - Node click → side drawer with dependency details
  - Gold dataset has 27 real dependencies — will look impressive

- [ ] **Connect Triage to Supabase**
  - Fetch unallocated features (`sprint_id IS NULL`) for active PI
  - Add server action for sprint assignment write-back to `features` table

---

## 🟠 P2 — Data Quality & Architecture

### Schema Phase 2 — Renames and removals (requires simultaneous code changes)

Run via Claude Code on a dedicated feature branch AFTER Phase 1 is stable and deployed.
Use **Opus 4.6** for this task — significant multi-file reasoning required.

**Table renames:**
- `planning_cycles` → `program_increments`
- `team_cycle_participation` → `team_pi_participation`

**Column renames (all tables):**
- All `planning_cycle_id` columns → `program_increment_id`
- `features.status` → `features.workflow_status`
- `stories.status` → `stories.workflow_status`
- `dependencies.dependency_type` → `dependencies.type`
- `dependencies.dependency_owner` → `dependencies.owner`
- `dependencies.dependency_criticality` → `dependencies.criticality`
- `dependencies.dependency_target_sprint` → `dependencies.target_sprint_name`
- `dependencies.dependency_description` → `dependencies.description`
- Same renames on `snapshot_dependencies`
- `snapshot_features.feature_key` → `snapshot_features.ticket_key`
- `snapshot_stories.story_key` → `snapshot_stories.ticket_key`

**Removals (verify unused first):**
- `stories.commitment_status` — derive from parent feature instead

**Value Stream rename (previously "Initiative"):**
- All UI labels: "Initiative" → "Value Stream", "Initiatives" → "Value Streams"
- `lib/admin/initiatives.ts` → `lib/admin/valueStreams.ts`
- All TypeScript types: `Initiative` → `ValueStream`
- All function names: `getInitiatives` → `getValueStreams` etc
- DB table `initiatives` → `value_streams`
- DB column `initiative_id` → `value_stream_id`

**UI label updates:**
- All "Planning Cycle" text → "Program Increment"
- All "Cycle" references → "Program Increment" or "PI"

**Code renames — full codebase sweep:**
- `lib/admin/planningCycles.ts` → `lib/admin/programIncrements.ts`
- All TypeScript types: `PlanningCycle` → `ProgramIncrement`
- All function/variable names containing `cycle` or `planningCycle` → `increment` / `programIncrement`
- All code comments, JSDoc, console.log strings — full sweep
- Use grep across entire codebase: search for `[Cc]ycle`, `[Pp]lanning[Cc]ycle`
- Run `tsc --noEmit` after all renames to confirm zero TypeScript errors

### Other P2 items

- [ ] **Extract shared `getActiveOrSelectedProgramIncrement`**
  - Duplicated in `lib/supabase/dashboard.ts` and `lib/supabase/sortingFrame.ts`
  - Move to `lib/supabase/shared.ts`

- [ ] **Program Increment carry-forward on creation**
  - When creating a new PI, automatically copy participating teams and ARTs from previous PI
  - Facilitator reviews and adjusts before confirming

- [ ] **Sprint numbering — sandbox DEMO/TEST and year-reset**
  - DEMO — and TEST — cycles always start from Sprint 1 ✅ (in progress)
  - Sprint numbering resets to Sprint 1 at start of each financial year (Apr 1 for RMG)
  - Show starting sprint number in preview — allow override

- [ ] **Demo Mode — full rework**
  - Toggle in sidebar (done), defaults to OFF (done), amber banner (done)
  - Load DEMO — PI from Supabase as data foundation when activated
  - Simulation ticks: feature commits, dependency flags, sprint load shifts
  - Speed controls: 1x / 5x / 20x
  - Reset Demo button
  - End state: PI Planning complete banner
  - Guard: simulation never fires against real (non-DEMO) PI

- [ ] **Import & sync: deterministic merge strategy**
  - Replace delete-all-rebuild with upsert using source_key + last_synced_at
  - No manually_edited flag — BAU tooling always authority
  - Document merge rules in Help Centre and in-situ from Import UI

---

## 🔵 P3 — Features & UX

- [ ] **Activity feed — event type review**
  - Audit all event types currently in activity_events
  - Define full target event taxonomy before building more feed features
  - Agree naming conventions for event_type strings

- [ ] **Activity feed — real-time event type filter**
  - Already has Type filter — extend when richer event stream exists
  - Sequencing dependency: write-back must land first

- [ ] **Inline metric explanations — tooltips**
  - ⓘ icon on any non-obvious metric
  - Hover/tap → 1-2 sentence popover, inline
  - Priority: Convergence, Import freshness, High criticality deps

- [ ] **Feature card dependency indicators**
  - Dependency badge with criticality colour now on cards ✅
  - Ensure source dependency data is fully wired from sortingFrame.ts

- [ ] **Sorting Frame — persist expand/collapse state to localStorage**
  - Remember open/closed state of VS sections, team rows, feature story expansions
  - Keyed by PI + entity ID
  - Reset view button to clear saved state

- [ ] **Sorting Frame — feature/story ranking within sprint (future phase)**
  - In Read+Write mode: drag/drop within sprint to rank features by priority
  - Store as features.sprint_rank (nullable integer)
  - Stories: stories.feature_rank
  - Visible as subtle #1 #2 #3 indicator on card

- [ ] **Program Increment management — inline edit, delete/archive**
  - Edit icon per row transforms to editable state
  - Delete checks for linked data — warns with counts
  - Archive option (is_archived = true) as safer alternative

- [ ] **Import UI improvements**
  - Remove source system free text field (done ✅)
  - Add optional Notes field using import_snapshots.notes
  - Import Wizard — guided multi-step flow (see Captured Ideas)

- [ ] **Sync mode toggle — Read Only / Read + Write (Admin)**
  - Explicit Admin toggle
  - Read Only: no writes from planning UI
  - Read + Write: every write requires confirmation dialog

- [ ] **Admin area — static password protection (MVP)**
  - Static password via env var ADMIN_PASSWORD
  - Session flag in localStorage
  - ⚠️ UI-only protection — replace with Supabase Auth before real data

- [ ] **Demo/test cycle visibility toggle (Admin)**
  - Toggle in Admin: "Show demo and test cycles"
  - OFF default: DEMO — and TEST — hidden from cycle pickers
  - Stored in app_settings table

- [ ] **Planning Stage indicator — live app**
  - Facilitator control in planning header
  - 6 stages, freely changeable, no workflow gates
  - Contextual health feedback on Dashboard
  - Stored on program_increments.current_stage

- [ ] **Planning Stage — contextual app behaviour (future phase)**
  - Sorting Frame, Dashboard, Dependencies all adapt per stage
  - Same expected-state thresholds as Demo Mode simulation

---

## 🟢 P4 — Future / Post-PoC

- [ ] Azure DevOps provider (`providers/adoProvider.ts`)
- [ ] Jira provider (`providers/jiraProvider.ts`)
- [ ] Role-based access (facilitator vs read-only stakeholder)
- [ ] Cross-cycle historical comparison
- [ ] Advanced risk heatmaps
- [ ] Readiness scoring
- [ ] Scenario simulation (what-if with dependency impact)
- [ ] Dependencies Room — richer dependency management
- [ ] Confidence voting (teams vote 1–5 at end of PI Planning)
- [ ] **Post-PI Planning: quarter-long visibility**
  - Continue syncing throughout the quarter after the event
  - Show feature workflow status (To Do / In Progress / Done / Blocked)
  - Flag features that slipped from planned sprint
  - "Changes since PI Planning" log
  - Lightweight — not a sprint reporting tool

---

## 💡 Captured Ideas — Not Yet Prioritised

- [ ] **Pre-PI Feature seeding from ART/Product owner**
  - Features land in parking lot before event
  - Teams sequence during breakouts
  - Live sync handles this automatically in mature SAFe orgs

- [ ] **Sync scope filtering — prevent full backlog sync**
  - Must never pull entire team backlog
  - Teams tag Features as "PI Planning candidate" in ADO/Jira
  - Admin configures scope filter per PI before sync enabled
  - **Prerequisite for live ADO/Jira sync going live**

- [ ] **Import Wizard — guided import flow**
  - Multi-step: Upload → Reading file → Validation steps → Confirm → Importing → Done
  - Auto-advance when clean, pause only on human decisions
  - Logical validation order: File → PI/Sprints → ARTs → Initiatives → Platforms → Teams → Features → Stories → Dependencies
  - Every screen carries reassurance: "Your Jira/ADO data is never affected"
  - Transactional — no orphaned entities on failure

---

## 📱 Mobile & PWA Sprint (dedicated future sprint)

> Do not start this until the app is working well on large screens.

**Philosophy: adaptive design, not responsive squishing.**

### PWA Foundation (low effort, high value — do first)
- [ ] Add `next-pwa` package
- [ ] Add web manifest with RMG branding
- [ ] Configure service worker for shell caching
- [ ] Test on iOS Safari and Android Chrome

### Mobile-specific views

| Surface | Mobile treatment |
|---|---|
| **Dashboard** | Stacked KPI cards — already close to working |
| **Activity Feed** | Full screen — best mobile surface, killer use case |
| **Sorting Frame** | Read-only drill-down: VS list → team list → feature list. No board. |
| **Dependencies** | List view instead of reactflow graph |
| **Team Planning** | Single sprint view with swipe |
| **Admin** | Desktop only |

---

## 🧪 Testing Backlog

> **Rule:** New pure functions get tests at the time they are written.
> Run `npm run test` before every push.

| Area | Status | Notes |
|---|---|---|
| Sprint generation utilities | ✅ Done | `lib/planning/__tests__/` |
| Import rebuild — value stream/team resolution | ✅ Done | 8 unit tests |
| Search highlight match | ✅ Done | `lib/__tests__/highlightMatch.test.ts` |
| Strip feature prefix | ✅ Done | `lib/__tests__/stripFeaturePrefix.test.ts` |
| Merge strategy logic | ⬜ Not yet | Write when upsert strategy is built |
| Sorting Frame data fetcher | ⬜ Not yet | Integration test |
| Import pipeline | ⬜ Not yet | Known CSV → expected live table output |
| Dashboard data queries | ⬜ Not yet | |
| E2E: Sorting Frame loads with data | ⬜ Not yet | Playwright — before first real event |
| E2E: ART switching works | ⬜ Not yet | Playwright |
| E2E: Import flow completes | ⬜ Not yet | Playwright |

---

## 📝 Help Backlog (update as features change)

| Topic | Status | Notes |
|---|---|---|
| What is Dispatch | ✅ Done | |
| Who is it for | ✅ Done | |
| Program Increments | ✅ Done | (was Planning Cycles) |
| Features & Stories | ✅ Done | |
| Dependencies | ✅ Done | Includes all 8 types |
| Sorting Frame | ⬜ Needs update | Sticky header, VS colours, story expansion |
| Team Planning Room | ⬜ Not yet | Update when P1 complete |
| Dependencies Near You | ⬜ Not yet | Update when P1 complete |
| Live Tracking Dashboard | ⬜ Needs update | Colour-coded KPIs |
| Admin Control Centre | ⬜ Needs update | ART ordering, Value Streams tab |
| Data Import | ✅ Done | Merge rules, in-situ guidance |
| Import Rollback | ✅ Done | |
| Demo Mode | ⬜ Needs update | New sidebar location, defaults |
| Activity Feed | ⬜ Not yet | New feature — needs article |
| Value Streams | ⬜ Not yet | Renamed from Initiatives |
| FAQ | ✅ Done | |
