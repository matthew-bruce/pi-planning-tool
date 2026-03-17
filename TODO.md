# Dispatch — TODO

> **Session rule:** Start every Claude session by reading `ARCHITECTURE.md` and `TODO.md`.
> Say: *"Read ARCHITECTURE.md and TODO.md then continue from [task]."*
> Check off items as completed. Update `ARCHITECTURE.md` after any structural change.
> **Never work on interdependent features in parallel.**
> **Always commit AND push at the end of every task.**

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
  - Planning Cycles (list, create with sprint preview, activate, deactivate)
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
- [x] `PROPOSITION.md`, `ARCHITECTURE.md`, `TODO.md` written and committed

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

- [ ] **Extract shared `getActiveOrSelectedPlanningCycle`**
  - Duplicated in `lib/supabase/dashboard.ts` and `lib/supabase/sortingFrame.ts`
  - Move to `lib/supabase/shared.ts`

- [ ] **Type snapshot row mapping properly in `rebuildLiveTablesFromSnapshots`**
  - Replace `Record<string, unknown>` with declared snapshot row types
  - See `lib/admin/imports.ts`

- [ ] **Remove dead null guards in `lib/admin/*.ts`**
  - `getSupabaseServerClient` throws on missing env vars — it never returns null
  - Guards like `if (!supabase) return []` are misleading dead code

- [ ] **Load gold demo dataset into Supabase**
  - Import `dispatch_gold_demo_dataset.csv` via Admin import flow
  - Verify all 211 rows, 62 features, 29 teams import cleanly
  - Confirm dependency scenarios render in graph

- [ ] **Demo Mode isolation**
  - Simulation should not run when Supabase has real data for the active cycle
  - Add `hasRealData` check before enabling simulation ticks

---

## 🔵 P3 — Features & UX

- [ ] **Feature card dependency indicators**
  - Show Requires / Blocks / Conflict counts visually on card
  - Colour-coded badges matching dependency type
  - `FeatureCard.tsx` already has `dependencyCounts` — just needs badge rendering

- [ ] **Cycle switcher in header**
  - Allow switching between planning cycles from main nav
  - Currently only selectable in Admin
  - Default: active cycle; fallback: most recent by start_date

- [ ] **Import: deterministic merge strategy**
  - Replace delete-all-rebuild in `rebuildLiveTablesFromSnapshots` with an upsert
  - Preserve manual edits to live tables on re-import

- [ ] **Expand design tokens**
  - Add semantic tokens to `tailwind.config.ts`
  - Candidates: `surface`, `border`, `textPrimary`, `textMuted`, `success`, `warning`

- [ ] **`isArchived` flag on `planning_cycles`**
  - Currently only `is_active` exists
  - Add `is_archived` so old cycles can be hidden from pickers without deletion
  - Requires DB migration + Admin UI toggle

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

- [ ] Dependencies Room — richer dependency management and negotiation screen (seen in early mockups, not yet built)

- [ ] Confidence voting (teams vote 1–5 at end of PI Planning; ART aggregate shown on dashboard)

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
