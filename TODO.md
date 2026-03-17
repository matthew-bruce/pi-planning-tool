# Dispatch — TODO

> **Session rule:** Start every Claude session by reading `ARCHITECTURE.md` and `TODO.md`.
> Say: *"Read ARCHITECTURE.md and TODO.md then continue from [task]."*
> Check off items as completed. Update `ARCHITECTURE.md` after any structural change.
> **Never work on interdependent features in parallel.**
> **Always commit AND push at the end of every task.**

---

## 🔧 Current Sprint

Active work — tackle these before anything else.

- [x] Schema audit — complete. Phase 1 and Phase 2 migration tasks defined below.
- [x] **Schema Phase 1** — additive changes only (Claude Code — see prompt in P2 section)
- [ ] **Schema Phase 2** — renames and removals (Claude Code — after Phase 1 is stable)
- [x] **UI label fixes — "Planning Cycle" → "Program Increment"** — UI-only changes, no DB migration needed
  - `AdminControlCentre.tsx`: "Planning Cycles" tab → "Program Increments", "Create New Planning Cycle" → "Create New Program Increment", "Cycle Readiness & Import Health" → "PI Readiness & Import Health", "Active Cycle" → "Active Program Increment", all subtitle/description text
  - `DispatchShell.tsx` and any nav labels referencing cycles
  - `data/helpContent.ts` — all Help Centre references
  - Also rename the "PI Cycle 2026" data row in Supabase `planning_cycles` table to something sensible (e.g. delete it or rename to `FY26 Q1 (duplicate)`)
- [ ] Load gold demo dataset — import `dispatch_gold_demo_dataset.csv` via Admin, verify 211 rows clean
- [x] ART switching bug — clicking ART buttons on Sorting Frame does nothing (`SortingFrameBoard.tsx`)
- [x] Permanent "Loading…" bug — spinner never clears on Sorting Frame cycle header
- [x] Admin header — planning header hidden on `/admin` and `/help` routes (no DispatchShell header injected)
- [x] Bulk Triage — "⚠ Not yet connected to live data" warning banner added
- [x] Admin header — planning header hidden on `/admin` and `/help`
- [x] Bulk Triage — "⚠ Not yet connected to live data" banner added
- [ ] Demo Mode guard — simulation ticks should not fire when Supabase has real data for the active PI

---

## ✅ Done

- [x] Next.js 14 App Router scaffold with TypeScript strict mode
- [x] Supabase connected (server client, env vars, `lib/supabase/server.ts`)
- [x] Tailwind configured with `royalRed: '#CC0000'` design token
- [x] Provider pattern — `DataProvider` interface + `dummyProvider` + Zustand store
- [x] Seed data generator (`lib/seedData.ts`) with real RMG initiatives/teams
- [x] Demo Mode — simulation ticks every 8–15s, activity feed, localStorage persistence
- [x] `DispatchShell` — nav, header, ART selector, Demo Mode toggle, density toggle
- [x] Sorting Frame — Supabase-connected, initiative groups, team lanes, sprint columns, parking lot, drag-and-drop, ART filter, platform filter, search, compact/detailed density, empty board state
- [x] Live Tracking Dashboard — fully Supabase-connected: KPIs, ART tiles, convergence, sprint distribution, dependency overview (by type/criticality/owner), import freshness, activity feed, attention items, ART filter, refresh
- [x] Admin Control Centre — full tabbed UI:
  - Program Increments (list, create with sprint preview, activate, deactivate) — ⚠️ UI labels still say "Planning Cycle", Phase 2 rename pending
  - Platforms (CRUD)
  - ARTs (CRUD)
  - Teams (CRUD, platform assignment, cycle participation toggles)
  - Initiatives (CRUD, ART assignment, cycle scoping)
  - Import / Sync (CSV upload, column mapping, validation, history, rollback)
- [x] Cycle Readiness & Import Health panel in Admin
- [x] Sprint generation utilities (`lib/planning/sprintGeneration.ts`, `sprintNumbering.ts`, `sprintMapping.ts`)
- [x] vitest unit tests for planning utilities
- [x] Dependencies page — reactflow graph (Zustand/demo data — P1 gap remains)
- [x] Team Planning page (Zustand/demo data — P1 gap remains)
- [x] Bulk Triage page (Zustand/demo data — P1 gap remains)
- [x] Help Centre — searchable, collapsible sections, sidebar navigation, right panel
- [x] Dead code removed: `types/dashboard.ts` duplicate, `app/sorting-frame/SortingFrameBoard.tsx`, `app/dashboard/LiveDashboard.tsx`
- [x] `PROPOSITION.md`, `ARCHITECTURE.md`, `TODO.md`, `DEVELOPER_SETUP.md`, `SESSION_RULES.md` written and committed
- [x] Local dev environment established (VS Code, Git Bash, npm, Claude Code CLI, localhost:3000)
- [x] Schema Phase 1 — 24 additive changes applied (new columns, `app_settings`, `team_art_assignments`, indexes, ART short names, CRM ART, team_type)
- [x] ART switching bug fixed — removed `selectedArtId` from first `useEffect` deps in `SortingFrameBoard`
- [x] Permanent "Loading…" bug fixed — `setLoading(false)` added to early-return guard branch
- [x] Admin/Help header fix — `showPlanningHeader` flag suppresses planning header on `/admin` and `/help`
- [x] Bulk Triage "not live data" banner added
- [x] TypeScript declaration errors resolved — `npm install` restored missing `node_modules`
- [x] `.gitignore` added — was entirely absent from repo

---

## 🔴 P1 — Supabase Integration Gaps

These three pages show seed/demo data only. They need the same server component pattern as Sorting Frame.

- [ ] **Connect Team Planning to Supabase**
  - Create `lib/supabase/teamPlanning.ts` data fetcher
  - Query: teams, features, sprints for active cycle + selected ART
  - Convert `app/team-planning/page.tsx` to server component
  - Pass `initialData` to client board (same pattern as Sorting Frame)
  - Collapsible platform groups → collapsible team lanes

- [ ] **Connect Dependencies to Supabase**
  - Fetch real dependency data from `dependencies` table
  - Fetch features and teams for active cycle
  - Wire reactflow nodes/edges to live data
  - Retain ART and platform filters
  - Node click → side drawer with dependency details

- [ ] **Connect Triage to Supabase**
  - Fetch unallocated features (`sprint_id IS NULL`) for active cycle
  - Add server action for sprint assignment write-back to `features` table

- [ ] **Drag-and-drop write-back to Supabase**
  - `assignFeatureSprint` in Zustand currently only updates local state
  - Add a server action to persist sprint assignment to `features.sprint_id`
  - Optimistic UI update, rollback on error

---

## 🟠 P2 — Data Quality & Architecture

### Schema Phase 1 — Additive changes (safe, no code breakage)

Run via Claude Code using the prompt below. All changes are new columns or new tables — nothing existing is touched.

```
Read ARCHITECTURE.md, SESSION_RULES.md and TODO.md first.

Perform the following Supabase schema changes as Phase 1 of the schema audit.
These are additive only — new columns and new tables. No renames or removals.

Save a migration file to supabase/migrations/ with today's date prefix before executing.
After each DB change, update affected TypeScript types in lib/admin/types.ts, lib/models.ts and lib/types/dashboard.ts.
Commit all changes with message "schema: phase 1 additive changes from audit".

Changes:

1. dependencies: add source_feature_id uuid nullable, target_feature_id uuid nullable
2. features: add source_key text nullable
3. stories: add source_key text nullable
4. program_increments (currently planning_cycles): add current_stage integer NOT NULL DEFAULT 1
5. program_increments (currently planning_cycles): add is_archived boolean NOT NULL DEFAULT false
6. program_increments (currently planning_cycles): check for null end_date rows — if none exist, alter end_date to NOT NULL
7. program_increments (currently planning_cycles): add updated_at timestamptz NOT NULL DEFAULT now()
8. import_snapshots: add created_at timestamptz NOT NULL DEFAULT now()
9. import_snapshots: add updated_at timestamptz NOT NULL DEFAULT now()
10. arts: add updated_at timestamptz NOT NULL DEFAULT now()
11. arts: add short_name text nullable
12. arts: update existing row 'Web & App' to set short_name = 'WAA'
13. arts: update existing row 'Out Of Home' to set short_name = 'OOH'
14. arts: insert new row name = 'Customer Relationship Management', short_name = 'CRM', is_active = true
15. initiatives: add updated_at timestamptz NOT NULL DEFAULT now()
16. teams: add updated_at timestamptz NOT NULL DEFAULT now()
17. teams: add team_type text NOT NULL DEFAULT 'stream-aligned' with CHECK constraint: team_type IN ('stream-aligned', 'platform', 'enabling', 'complicated-subsystem')
18. teams: update all existing rows to set team_type = 'stream-aligned' (should already be default but be explicit)
19. features: alter source_system column to add DEFAULT 'manual'
20. stories: alter source_system column to add DEFAULT 'manual'
21. activity_events: check for null planning_cycle_id rows — if none exist, alter planning_cycle_id to NOT NULL
22. Create app_settings table: id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text NOT NULL UNIQUE, value text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
23. Create team_art_assignments table: id uuid PRIMARY KEY DEFAULT gen_random_uuid(), planning_cycle_id uuid NOT NULL REFERENCES planning_cycles(id), team_id uuid NOT NULL REFERENCES teams(id), art_id uuid NOT NULL REFERENCES arts(id), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(planning_cycle_id, team_id, art_id)
24. Add indexes (CREATE INDEX IF NOT EXISTS): features(planning_cycle_id), features(ticket_key), stories(feature_id), stories(planning_cycle_id), dependencies(planning_cycle_id), sprints(planning_cycle_id)
```

### Schema Phase 2 — Renames and removals (requires simultaneous code changes)

Run via Claude Code on a dedicated feature branch AFTER Phase 1 is stable and deployed.

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

**UI label updates:**
- ~~All "Planning Cycle" text → "Program Increment"~~ ✅ Done
- ~~All "Cycle" references in nav, headers, Admin → "Program Increment" or "PI"~~ ✅ Done

**Code renames:**
- `lib/admin/planningCycles.ts` → `lib/admin/programIncrements.ts`
- All TypeScript types: `PlanningCycle` → `ProgramIncrement`
- All function names: `getActiveOrSelectedPlanningCycle` → `getActiveOrSelectedProgramIncrement`

### Other P2 items

- [ ] **Extract shared `getActiveOrSelectedProgramIncrement`**
  - Duplicated in `lib/supabase/dashboard.ts` and `lib/supabase/sortingFrame.ts`
  - Move to `lib/supabase/shared.ts`
  - Do this as part of Phase 2 rename

- [ ] **Type snapshot row mapping properly in `rebuildLiveTablesFromSnapshots`**
  - Replace `Record<string, unknown>` with declared snapshot row types
  - See `lib/admin/imports.ts`

- [ ] **Remove dead null guards in `lib/admin/*.ts`**
  - `getSupabaseServerClient` throws on missing env vars — it never returns null
  - Guards like `if (!supabase) return []` are misleading dead code

- [ ] **Program Increment carry-forward on creation**
  - When creating a new PI, automatically copy participating teams and ARTs from the previous PI
  - Facilitator reviews and adjusts before confirming — same pattern as sprint preview
  - Features, Stories, Dependencies, Import Snapshots are never carried forward
  - Add carry-forward step to Admin PI creation flow

- [ ] **Demo Mode — full rework**

  **Toggle placement:**
  - Move Demo Mode toggle out of the planning header entirely
  - Place in bottom of left nav sidebar alongside the Admin cog — both are "meta" controls, not planning tools
  - Regular users must be able to access it (not hidden in Admin)
  - Sit alongside a "Reset to start" button and a speed control (see below)

  **Data foundation:**
  - When Demo Mode is switched ON, automatically load the `DEMO —` planning cycle from Supabase as the data foundation
  - This gives the simulation 62 real features, 29 real teams, 18 real initiatives and realistic dependencies to work with
  - The Gold demo dataset is not just for development testing — it IS the showcase dataset for Demo Mode
  - When Demo Mode is switched OFF, revert to the real active planning cycle

  **Simulation behaviour:**
  - Simulation ticks run on top of the Supabase data, in Zustand memory only
  - Simulated changes must never write back to Supabase — DB is read-only during demo
  - Realistic activity: features being committed, stories added, dependencies flagged, sprint load shifting, dashboard KPIs updating in real time
  - Activity feed comes alive with team progress notifications
  - Dashboard convergence, risk and import freshness panels all respond to simulation ticks
  - Changes must be queued and applied one at a time even at high speed — no simultaneous bulk updates

  **Playback speed:**
  - Three fixed speed settings: 1x (real-time, default), 5x (accelerated), 20x (fast-forward)
  - Use a fixed multiplier rather than a freeform slider — simpler to build, simpler to understand
  - Speed control sits in the nav alongside the Demo Mode toggle

  **End state:**
  - Simulation must have a defined end state — it does not run forever
  - Model the simulation as a two-day PI Planning event with finite activity
  - When the end state is reached: convergence is high, parking lot is minimal, most features committed
  - Show a clear "PI Planning complete" indicator when simulation finishes
  - End state must cap total stories and dependencies created — no runaway data growth

  **Reset:**
  - "Reset to start" button returns Zustand state to gold dataset baseline without page reload
  - Fast and seamless — simulation can be restarted immediately
  - Label clearly as "Reset to start" not just "Reset" so intent is unambiguous

  **Guard rails:**
  - Simulation ticks must never fire when the active cycle is a real (non-DEMO) cycle
  - If a real cycle is active and Demo Mode is toggled ON, automatically switch to the DEMO cycle first
  - Make this explicit in UI: "Demo Mode uses the Dispatch demo dataset. Your real planning data is unaffected"

  **About Demo Mode panel:**
  - On first activation, show a dismissible banner (not hidden behind a small icon):
    "You're now in Demo Mode. Dispatch is showing simulated planning activity using a demonstration dataset. No changes are being made to your real planning data."
  - "Got it, don't show again" dismisses and sets a localStorage flag
  - A persistent (i) info button remains visible in the nav for users who want to revisit the explanation
  - This is a trust feature as much as a UX one — users must never feel uncertain about whether real data is at risk

- [ ] **Demo Mode — persistent amber banner**
  - Thin full-width banner pinned above the entire shell while Demo Mode is active
  - Amber/yellow background, small text — same visual language as a staging environment warning
  - Example copy: "Demo Mode active — simulated data only. Your real planning data is unaffected."
  - Disappears instantly when Demo Mode is toggled off
  - No dismiss button — it is a permanent signal, not a notification to clear
  - The first-activation modal handles the full explanation; the banner is the ongoing reminder

- [ ] **Demo Mode — Reset Demo**
  - Single button labelled "Reset Demo" in the nav alongside the toggle and speed control
  - Soft reset only: returns Zustand state to gold dataset baseline without page reload
  - Info popup on hover/click: "This returns the demo to its starting state. No data is deleted."
  - Fast and seamless — demo can be restarted immediately

- [ ] **Demo Mode — PI Planning stage simulation** *(build after basic Demo Mode rework)*

  Model the simulation around the actual SAFe PI Planning two-day agenda. Each stage has a pre-computed Zustand snapshot and a characteristic dashboard/board signature. Stage-skipping snaps to that snapshot then resumes simulation from there.

  **Design principle: realistic bad states are as important as good ones.**
  Showing a board with unresolved conflicts and overloaded sprints at Day 1 end is more useful for facilitators than a clean board — this is what it actually looks like.

  | Stage | Timing | Board signature | Dashboard signature |
  |---|---|---|---|
  | 1. Business context & vision | Day 1 ~09:00 | All features in parking lot, nothing committed | Convergence 0%, sprint load flat, no dependencies |
  | 2. Team breakouts — draft plan | Day 1 ~11:00–17:00 | Features moving rapidly into sprints, load building unevenly | Convergence 40–50%, sprint imbalance visible, first dependencies flagged |
  | 3. Draft plan review | Day 1 ~17:00 | Feature movements as teams negotiate, some sprint resequencing | Convergence 50–60%, dependency conflicts at peak — intentional |
  | 4. Team breakouts — revised plan | Day 2 ~09:00 | Cross-team movements, parking lot shrinking, load balancing | Convergence 70–80%, conflicts reducing, sprint distribution improving |
  | 5. Final plan review & RoART | Day 2 ~13:00 | Mostly stable, minor last adjustments, risks formally logged | Convergence 85–95%, parking lot near empty, some risks escalated |
  | 6. PI Planning complete | Day 2 ~16:00 | Static committed board | Convergence 90%+, clean summary state, activity feed quiet |

  - Stage-skip control in Demo Mode panel: jump to any stage with one click
  - Each stage skip shows a contextual note explaining what this moment in planning looks like
  - Powerful for facilitator training — "this is what normal looks like at end of Day 1"
  - Activity feed per stage has characteristic volume: high during breakouts, quiet during reviews
  - End state: "PI Planning complete — FY26 Q1 plan committed" banner shown

- [ ] **Planning Stage indicator — live app** *(facilitator feature, zero team overhead)*

  A stage indicator visible in the **planning header across all pages** at all times during a real PI Planning event. Every person on every screen sees the same contextual anchor simultaneously.

  **Core principle: adds zero work for teams. Facilitator sets it. Everyone else sees it passively.**

  **The control:**
  - Facilitator-facing stepper or stage pill directly in the planning header — no navigation to Admin required
  - Advances or reverses freely with no consequence — this is a contextual lens, not a workflow gate
  - Moving it back is as valid as moving it forward — a facilitator may want to revisit a stage
  - Stored as a single field on the active planning cycle in Supabase — reads everywhere, writes from one control

  **Contextual health feedback:**
  - When a stage is selected, the app compares current board state against expected state for that stage
  - If the data is behind: "Convergence is 40% — typically 85–95% at this stage. Teams may need more time in breakouts before moving to final review."
  - If the data is ahead: "Sprint load is well-balanced for this stage. Dependencies are being resolved."
  - Uses the same expected-state thresholds defined in the Demo Mode simulation model
  - Feedback appears on the Dashboard and as a subtle indicator in the header — not as a blocking alert

  **Stage definitions (shared with Demo Mode simulation):**
  | # | Stage | Timing |
  |---|---|---|
  | 1 | Business Context & Vision | Day 1 morning |
  | 2 | Team Breakouts — Draft Plan | Day 1 afternoon |
  | 3 | Draft Plan Review | Day 1 end |
  | 4 | Team Breakouts — Revised Plan | Day 2 morning |
  | 5 | Final Plan Review & RoART | Day 2 afternoon |
  | 6 | PI Planning Complete | Day 2 end |

  **Do NOT build:** stage-gating, stage permissions, or any workflow requiring team confirmation — that is process overhead this tool must never create

- [ ] **Planning Stage — contextual app behaviour** *(future phase, build after stage indicator is live)*

  Once the stage indicator exists as a data signal, each surface of the app can use it as a contextual lens. Same data, smarter rendering. No new pipelines required.

  **Sorting Frame:**
  - Stage 1: "Planning canvas ready" message — empty board is intentional, not a failure state
  - Stage 2: Sprint load capacity indicators more prominent — overloaded sprint columns get a warning badge
  - Stage 3: Features with unresolved dependencies highlighted with stronger visual treatment (amber border, dependency badge prominent) — message: "These need dependency conversations before Day 2"
  - Stage 4: Committed/clean features de-emphasised; draft/unresolved features brought forward — board shows what still needs attention, not what's done
  - Stage 5: Presentation mode option — filters/controls hidden, card size increased, readable on large screen in a room
  - Stage 6: Board shows summary/committed state with "PI Planning complete" treatment

  **Dashboard:**
  - Convergence gauge shows stage-appropriate target markers — current value contextualised against where it should be at this stage
  - Attention items reweighted by stage severity — stale import data is medium at Stage 2, high at Stage 5; dependency conflict is expected at Stage 3, alarming at Stage 6
  - Sprint distribution: imbalanced load is informational at Stage 2, a risk flag at Stage 5
  - Activity feed highlights different event types by stage — feature commitments during breakouts, unresolved dependencies during reviews

  **Dependencies Near You:**
  - Stage 2: all dependencies informational — teams are just discovering them
  - Stage 3–4: unresolved high-criticality dependencies elevated — "needs resolution before Day 2 ends"
  - Stage 5: default filter shows only unresolved dependencies — resolved ones collapsed
  - Stage 6: remaining unresolved high-criticality dependencies automatically surfaced as programme risks

  **Team Planning Room:**
  - Stage 2: capacity indicators more prominent alongside sprint columns
  - Stage 5: visual "this plan should be finalising" signal — not a hard block, just context

  **Admin:**
  - Stage has no bearing on Admin configuration — neutral regardless of event stage
  - Exception: warn if someone modifies team participation or cycle config mid-event: "A PI Planning event is in progress (Stage 3). Changes here may affect live planning data."

---

## 🔵 P3 — Features & UX

- [ ] **Activity feed — real-time event type filter**
  - Filter bar directly above the feed with toggleable event category chips — no Admin required
  - Per-user, per-session (localStorage) — one person's filter preference does not affect others
  - Default: All. Toggle individual categories off to reduce noise. One-tap back to All.
  - Filter is client-side only — no Supabase round-trip needed
  - **Event category taxonomy** (filter chips map to these, not raw DB event type strings):
    - **Feature activity** — feature committed, moved to sprint, moved to parking lot
    - **Dependency events** — dependency flagged, resolved, conflict identified
    - **Import activity** — team snapshot imported, snapshot refreshed, import warning
    - **Risks & attention** — risk escalated, attention item raised/resolved
    - **Planning progress** — stage advanced, convergence milestone reached
    - **System** — cycle activated, team added to cycle
  - ⚠️ **Sequencing dependency:** the rich event stream that makes this filter useful requires drag-and-drop write-back to Supabase to land first (currently P1). Build the filter after write-back is complete — don't build it against the current thin import-only event stream.

- [ ] **Activity feed — event type review**
  - Review all event types currently written to `activity_events` in Supabase
  - Audit what events are missing that should be captured (feature moves, dependency flags, commitment changes etc)
  - Define the full target event taxonomy before building the feed filter or the Demo Mode simulation
  - Agree naming conventions for `event_type` strings in the DB — human-readable categories, not raw system strings
  - Output: a confirmed event type list that feed filter chips, Demo Mode simulation and write-back actions all reference consistently
  - **Do this before building the feed filter or extending the Demo Mode activity simulation**

- [ ] **Inline metric explanations — tooltips across the app**
  - Any metric, status or insight that isn't self-explanatory must have an inline `ⓘ` icon
  - Hover (desktop) / tap (mobile) reveals a small popover — 1–2 sentences max
  - Must explain: what the metric measures, what a good/bad value looks like, what action it implies
  - Do NOT link to the Help Centre — explanation must be inline without leaving the screen
  - Apply consistently across: Dashboard KPIs, Sorting Frame badges, dependency indicators, Admin readiness panel, attention items
  - Priority metrics to cover first:
    - **Convergence** — % of features moved from Draft → Committed. 0% at Day 1 start is normal. Below 60% at Day 1 end is a warning. Below 80% at Day 2 close is a risk. Above 90% is a healthy PI Planning outcome.
    - **Import freshness** — how recently each team's data was synced. Stale = >60 mins since last import.
    - **High criticality dependencies** — dependencies flagged as High criticality that are unresolved
    - **Teams with fresh data** — count of participating teams whose last import is within the freshness threshold
    - **Attention items** — auto-generated signals requiring facilitator awareness (not necessarily action)
    - **Commitment status** (Draft / Planned / Committed) — what each status means in the planning lifecycle
    - **Dependency types** (Team / Platform / Infrastructure / Environment / Operations / External / Approval / ServiceNow)

- [ ] **Feature card dependency indicators**
  - Show Requires / Blocks / Conflict counts visually on card
  - Colour-coded badges matching dependency type
  - `FeatureCard.tsx` already has `dependencyCounts` — just needs badge rendering

- [ ] **Cycle switcher in header**
  - Allow switching between planning cycles from main nav
  - Currently only selectable in Admin
  - Default: active cycle; fallback: most recent by start_date
  - Must respect demo/test cycle visibility setting (see below)

- [ ] **Demo/test cycle visibility toggle (Admin)**
  - Add a toggle in Admin Control Centre: "Show demo and test cycles in cycle picker"
  - When OFF (default): cycles prefixed `DEMO —` or `TEST —` are hidden from all cycle selectors in the main app
  - When ON: all cycles visible — intended for facilitators and admins only
  - Stored as a boolean in Supabase `app_settings` table or as a session-scoped localStorage preference
  - Naming convention: `DEMO —` for demo datasets, `TEST —` for scratch/import testing
  - Prevents regular users accidentally selecting or activating a demo cycle during a real planning event

- [ ] **Import: position as permanent universal fallback**
  - CSV import is a permanent, first-class feature — not scaffolding to be removed when integrations land
  - Rationale: not every team will have ADO or Jira configured; not every integration will be reliable; some teams may use entirely different tools
  - The three data paths are complementary, not sequential:
    - ADO live sync — teams with ADO integrated
    - Jira live sync — teams with Jira integrated
    - CSV import — teams without integration, teams where sync has failed, teams on other tools
  - Import UX should be polished and reliable — it is the universal fallback that makes Dispatch work regardless of team tooling
  - Keep "Data Import" labelling in Admin — neutral and permanent, not framed as temporary
  - Import events in the activity feed remain meaningful — a team refreshing their CSV snapshot during a planning event is a real signal worth showing

- [ ] **Import & sync: deterministic merge strategy**

  **Core principle: BAU tooling (ADO/Jira) is always the source of truth. Dispatch never holds data hostage from the system that owns it.**

  **Schema additions required (additive, non-breaking):**
  ```sql
  -- Add to features, stories, dependencies tables
  source_system     text        -- 'csv_import', 'ado_sync', 'jira_sync'
  source_key        text        -- ticket key / ID in the source system
  last_synced_at    timestamptz -- when this row was last written from its source
  ```
  - No `manually_edited` flag — this was considered and rejected as it inverts the product philosophy
  - Timestamp-based rules handle all conflict scenarios cleanly

  **MVP1 — Read Only merge rules:**
  | Situation | Rule |
  |---|---|
  | Row doesn't exist | Insert it |
  | Row exists, incoming data is newer | Update it |
  | Row exists, incoming data is older | Leave it alone |
  | Facilitator has rearranged board locally (visual only) | Incoming sync/import always overrides — local state is ephemeral |

  **Future Phase — Read + Write, write-back OFF:**
  - Incoming sync/import always wins if timestamp is newer than last Dispatch edit
  - Dispatch edits are shown until next sync overrides them
  - Optional: notify facilitator "this feature was updated in ADO since you moved it"
  - Teams retain BAU tooling as primary interface and source of truth

  **Future Phase — Read + Write, write-back ON:**
  - Last write wins regardless of source, using `last_synced_at` timestamp
  - Genuine conflicts (both changed between sync cycles) surfaced to facilitator with both values — human decides
  - Resolution is written to both Dispatch and source system
  - Trust and code of conduct in the room handles most cases — technical conflict resolution is the edge case

  **Merge rules must be documented in the Help Centre and available in-situ from the Import UI**
  - Users should never have to wonder which data "won" or why
  - Elevated priority given import is a permanent first-class feature

- [ ] **Expand design tokens**
  - Add semantic tokens to `tailwind.config.ts`
  - Candidates: `surface`, `border`, `textPrimary`, `textMuted`, `success`, `warning`

- [ ] **`isArchived` flag on `planning_cycles`**
  - Currently only `is_active` exists
  - Add `is_archived` so old cycles can be hidden from pickers without deletion
  - Requires DB migration + Admin UI toggle

- [ ] **Sorting Frame visual hierarchy**
  - Initiative sections as distinct bordered containers
  - Sticky team label column on swimlanes
  - Sprint header row pinned and aligned to grid
  - Empty sprint cells show "Drop feature here" affordance
  - Parking Lot always visible even when empty

- [ ] **Sync mode toggle — Read Only / Read + Write (Admin)**
  - Explicit toggle in Admin Control Centre: "Sync Mode: Read Only / Read + Write"
  - **Read Only (MVP1 default):** drag-and-drop disabled on Sorting Frame; no write operations reach Supabase from planning UI; import pipeline still works as a controlled admin action
  - **Read + Write (future phase, opt-in):** drag-and-drop enabled; every write action requires confirmation dialog showing both systems affected; write-back syncs change to ADO/Jira via provider interface
  - Toggle is Admin-only and protected — cannot be accidentally enabled by regular users
  - Even in Read + Write mode, facilitator scope is limited: move features/stories between sprints, change commitment status, move to/from parking lot — never create, edit text, or delete
  - Write-back confirmation: "This will move Feature DISP-104 from Sprint 2 to Sprint 3 in Dispatch and in Azure DevOps. Continue?"
  - The app should clearly signal the current mode in the planning header so all users know whether the board is live or read-only

- [ ] **Admin area — static password protection (MVP)**
  - Prompt for a password when navigating to `/admin`
  - Static password hardcoded in env var (`ADMIN_PASSWORD=Admin` for now)
  - Store a session flag in localStorage on success so re-entry isn't needed per session
  - ⚠️ **IMPORTANT — security caveat:** this is UI-only protection and provides no real security
  - Anyone with source code or network access can trivially bypass it
  - Suitable only for keeping casual users out of Admin during the PoC phase
  - **Must be replaced with proper Supabase Auth before any real Royal Mail data is stored or the app is shared beyond the immediate dev team**
  - Full authentication (Supabase Auth, role-based access) is tracked separately in P4

---

## 🟢 P4 — Future / Post-PoC

- [ ] Azure DevOps provider (`providers/adoProvider.ts`)
  - Read: Features, Stories, Sprints, Dependencies from ADO REST API
  - Map to canonical Dispatch model
  - Authenticate via PAT (local dev) or managed identity (Azure-hosted)

- [ ] Jira provider (`providers/jiraProvider.ts`)
  - On-prem Jira — requires internal network access
  - Lower priority than ADO; most teams migrating to ADO

- [ ] Role-based access (facilitator vs read-only stakeholder)

- [ ] Cross-cycle historical comparison

- [ ] Advanced risk heatmaps

- [ ] Readiness scoring (feature completeness before PI Planning)

- [ ] Scenario simulation (what-if planning: drag feature, see dependency impact)

- [ ] Dependencies Room — richer dependency management and negotiation screen

- [ ] Confidence voting (teams vote 1–5 at end of PI Planning; ART aggregate shown on dashboard)

- [ ] **Post-PI Planning: quarter-long visibility**
  - Once ADO/Jira sync is live, continue syncing throughout the quarter — not just during the two-day event
  - Dispatch becomes a living reference artefact showing plan vs reality as the quarter unfolds
  - Pull `workflow_status` (To Do / In Progress / Done / Blocked) from ADO/Jira and display on feature cards
  - Show features progressing from Planned → In Progress → Done across sprints
  - Surface dependencies that have been resolved as work completes
  - Flag features that have slipped — planned for Sprint 2, now showing in Sprint 4 in ADO
  - End-of-cycle view: how did the quarter go vs what was planned at PI Planning?
  - Transforms Dispatch from a two-day event tool into a quarter-long planning intelligence layer
  - Senior stakeholders get ongoing visibility, not just a post-event snapshot
  - Requires `workflow_status` field named correctly in schema (distinct from `commitment_status`) — flag in schema audit

---

## 📝 Help Backlog (update as features change)

| Topic | Status | Notes |
|---|---|---|
| What is Dispatch | ✅ Done | `data/helpContent.ts` |
| Who is it for | ✅ Done | |
| Planning Cycles | ✅ Done | |
| Features & Stories | ✅ Done | |
| Dependencies | ✅ Done | Includes all 8 types |
| Sorting Frame | ✅ Done | |
| Team Planning Room | ✅ Done | |
| Dependencies Near You | ✅ Done | |
| Live Tracking Dashboard | ✅ Done | |
| Admin Control Centre | ✅ Done | |
| Parking Lot | ✅ Done | |
| Data Import | ✅ Done | Includes mismatch handling |
| Import Rollback | ✅ Done | |
| Demo Mode | ✅ Done | |
| FAQ | ✅ Done | |
| Future Roadmap | ✅ Done | |
| Drag-and-drop write-back | ⬜ Not yet | Add when P1 complete |
| Cycle switcher | ⬜ Not yet | Add when built |
| Dependencies Near You (live data) | ⬜ Not yet | Update when P1 complete |
| Team Planning Room (live data) | ⬜ Not yet | Update when P1 complete |

> **Rule:** Whenever a feature is added, modified, or planned for roadmap — update this table. Help content must be refreshed after significant feature changes.

---

## 🧪 Testing Backlog

> **Rule:** New pure functions get tests at the time they are written. Not retroactively.
> Run `npm run test` before every push.

| Area | Status | Notes |
|---|---|---|
| Sprint generation utilities | ✅ Done | `lib/planning/__tests__/` |
| Merge strategy logic | ⬜ Not yet | Write when upsert strategy is built |
| Snapshot rebuild | ⬜ Not yet | Write when deterministic rebuild lands |
| Sorting Frame data fetcher | ⬜ Not yet | Integration test against known DB state |
| Import pipeline | ⬜ Not yet | Known CSV → expected live table output |
| Dashboard data queries | ⬜ Not yet | |
| E2E: Sorting Frame loads with data | ⬜ Not yet | Playwright — before first real PI Planning event |
| E2E: ART switching works | ⬜ Not yet | Playwright |
| E2E: Import flow completes | ⬜ Not yet | Playwright |

---

## 💡 Captured Ideas — Not Yet Prioritised

These emerged during product thinking sessions and are worth revisiting. Not yet assigned to a priority tier.

- [ ] **Pre-PI Feature seeding from ART/Product owner**
  - ART owners and Directors own Features and Epics — not Stories
  - Stories are created by Teams during PI Planning breakouts in their BAU tooling
  - A future import/sync path that allows an ART owner to load Features into Dispatch before the event begins
  - Features land in the parking lot — Teams then sequence them into sprints during breakouts
  - Stories created during the event sync back via ADO/Jira integration
  - In a mature SAFe organisation, Features already exist in ADO/Jira pre-event — live sync would handle this automatically with no CSV needed
  - CSV import remains the fallback for orgs where Features aren't yet in ADO/Jira before the event

- [ ] **Sync scope filtering — prevent full backlog sync**
  - Live ADO/Jira sync must never pull an entire team backlog — could contain years of items, thousands of rows, poor hygiene
  - Teams and Product Managers must be able to tag or label Features as "in scope for PI Planning" in their BAU tooling before the event
  - Dispatch sync only pulls items matching the scope filter — everything else is ignored
  - Standard SAFe mechanism: a PI Planning label, tag, iteration path, fix version, or custom field in ADO/Jira
  - Exact filter mechanism will differ by source system:
    - ADO: iteration path, tag, or custom field (e.g. `PI Planning Candidate = true`)
    - Jira: label (e.g. `pi-planning-fy26-q1`), fix version, or custom field
  - Admin should allow the facilitator to configure the scope filter per Program Increment before sync is enabled
  - CSV import is naturally scoped — teams only include what they choose to export — but guidance should encourage the same discipline
  - Without this, sync is not safe to enable at scale — this is a prerequisite for live ADO/Jira integration going live

- [ ] **Import Wizard — guided import flow**

  Replace the current single-screen import with a multi-step wizard that guides users through validation and resolution before committing. Transforms the scariest action in the app into the most reassuring one.

  **Flow:**
  1. **Upload** — drop zone, reassurance copy that source data is never affected
  2. **Reading your file** — animated parse, summary of what was found (rows, features, stories, dependencies, issues count)
  3. **Validation steps — logical order matching the data hierarchy:**
     Each step ticks off visibly as it passes. Issues pause the flow for resolution before proceeding.
     - ✅/⚠️ File structure — required columns present and readable
     - ✅/⚠️ Program Increment & Sprints — sprint names match the active PI. Unmatched → parking lot or skip.
     - ✅/⚠️ ARTs — all ART names recognised. Unknown → create or assign to existing.
     - ✅/⚠️ Initiatives — matched or offered for creation, linked to correct ART.
     - ✅/⚠️ Platforms — matched against existing platforms.
     - ✅/⚠️ Teams — two sub-checks: (a) team doesn't exist → offer to create and add to PI, (b) team exists but not on this PI → offer to activate. Never conflate these two cases.
     - ✅/⚠️ Features — by this point all containers are resolved.
     - ✅/⚠️ Stories — features resolved first, stories linked to them.
     - ✅/⚠️ Dependencies — features imported first, dependency keys resolved.
  4. **Confirm summary** — full list of everything that will happen (creates, activations, imports, parking lot moves). Nothing has been written yet at this point.
  5. **Importing** — animated progress with live counts per entity type
  6. **Done** — full success summary including things that went smoothly, not just issues resolved

  **Emotional arc:** confidence builds through accumulating green ticks. By the time the user sees the first issue, they've already seen multiple things succeed. The wizard never feels like a wall of errors.

  **Key principles:**
  - **Auto-advance when clean** — the wizard proceeds automatically through every step that has no issues. No "Next" button required. The user watches it work.
  - **Pause only on human decisions** — the wizard stops and waits only when it needs the user to make a choice: an unknown entity, a mismatch, an ambiguous mapping. Everything else flows through without interruption.
  - **Communicate success visibly** — every step that passes cleanly should tick off in real time. The user sees progress accumulating. Green ticks are as important as warnings.
  - **No destructive action without explicit user confirmation** — the wizard never writes anything without the user's knowledge. The confirm summary screen is the final gate before any DB writes.
  - **Meaningful distinction between "team doesn't exist" vs "team exists but not on this PI"** — these are different problems requiring different responses. Never conflate them.
  - **Wizard teaches the data model implicitly** — users understand Dispatch better after their first import.
  - **Resolution choices remembered per PI** — don't ask the same question twice within the same import session.
  - **Import must be transactional** — if it fails mid-way, newly created entities are not left orphaned.
  - **Every screen carries reassurance:** "Your Jira/ADO data is never affected."
  - **A clean import requires zero clicks beyond the initial upload and final confirm.** The wizard is not a form — it is a guided, largely automatic process that only surfaces when it genuinely needs help.

  **Technical note:** requires the import pipeline to be fully transactional before wizard resolution steps (create team + activate + import) can be made atomic.
