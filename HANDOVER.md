# Dispatch — Session Handover

> Read this cold. It tells you everything you need to be immediately useful.
> After reading this, read ARCHITECTURE.md, TODO.md and SESSION_RULES.md.

---

## 1. What We're Building

**Dispatch** is a PI Planning orchestration and observability tool for Royal Mail Group. It sits on top of existing delivery tooling (Jira, Azure DevOps) and gives facilitators and leadership a single live view of how a PI Planning event is unfolding across hundreds of participants.

The core proposition: during a two-day PI Planning event, Dispatch shows what all 29 teams are committing to, where the dependencies are, which features are still unallocated, and whether planning is converging on schedule — without any team having to do anything extra.

**MVP1 is read-only.** Dispatch observes and visualises. It never writes back to source systems. The only write path is the Admin-controlled CSV import pipeline.

**The app is live** at `pi-planning-tool.vercel.app`. Repo: `github.com/matthew-bruce/pi-planning-tool`.

**The gold demo dataset** is loaded in Supabase under a `DEMO —` prefixed PI (UUID: `cc4d9336-8c6d-448a-80ed-9a4474e2a8a0`): 62 features, 211 stories, 27 dependencies, 18 value streams, 29 teams across 2 ARTs (WAA and OOH).

### What's built and working

| Surface | Status |
|---|---|
| Sorting Frame | ✅ Supabase-connected, VS colours, sticky header, expandable stories, search |
| Live Tracking Dashboard | ✅ Supabase-connected, colour-coded KPIs, ART convergence |
| Team Planning Room | ✅ Supabase-connected, stories-first, Parking Lot column, ART switching |
| Dependencies Near You | ✅ Supabase-connected, reactflow graph, 27 deps, 11 external nodes |
| Activity Feed | ✅ Supabase-connected, collapsible panel + full-screen page |
| Admin Control Centre | ✅ PI management, import pipeline, ART/team/VS management |
| Bulk Triage | ⚠️ Still on Zustand/seed data — P1 gap |

---

## 2. Decisions We've Locked In

**Don't re-litigate these unless the user raises them explicitly.**

**Terminology is strict and non-negotiable:**
- "Value Stream" — never "Initiative" (DB table is still `initiatives` until Phase 2 rename, but all UI/code/conversation uses "Value Stream")
- "Program Increment" — never "Planning Cycle" (DB table is still `planning_cycles` until Phase 2)
- "PI Planning" for the two-day event
- "Parking Lot" for features with `sprint_id = null` — used consistently on Sorting Frame and Team Planning

**Server component pattern is fixed:**
All Supabase-connected pages follow this pattern: fetch in `page.tsx` (server component) → pass `initialData` to client component → client can re-fetch via API route on ART switch. Do not deviate from this. Sorting Frame is the canonical reference.

**Stories are never orphaned:**
Stories always belong to a Feature. If orphan stories exist it's a data quality issue, not something to design UI around. `stories.team_id` and `stories.sprint_id` are inherited from the parent feature during import rebuild.

**Parking Lot in Team Planning = features with `sprint_id = null` per team:**
Teams can park features deliberately (not committed, capacity issue, moving to another team). This is an active working area during the event, not an error state. 8 such features exist in the demo PI.

**External dependency targets are valid nodes:**
11 of the 27 demo dependencies point to external entities (ServiceNow, Infrastructure, External, Approval etc.) that have no row in `features`. These render as distinct "external" nodes in the dependency graph. Never skip them.

**`team_art_assignments` is the source of truth for ART membership per PI:**
Teams have no fixed ART. Their ART is determined per PI via `team_art_assignments`. This table was empty for the demo PI — it was seeded in this session (29 rows). Any new PI will need this populated too (either via import or Admin).

**CSV import is a permanent first-class feature, not scaffolding:**
Three data paths are complementary: ADO sync (future), Jira sync (future), CSV import (now). CSV will always be needed for teams without live sync.

**No `manually_edited` flag — timestamp wins:**
BAU tooling is always authority. Incoming data with a more recent `last_synced_at` wins. Local drag-and-drop changes are ephemeral and overridden by any sync or import.

**Phase 2 renames are a separate task:**
The DB tables `planning_cycles`, `team_cycle_participation`, and `initiatives` will be renamed in Phase 2. Do not mix Phase 2 renames with feature work. Use "Program Increment", "Value Stream" in all UI/code regardless.

---

## 3. Critical Context a Fresh Claude Would Miss

**The import pipeline has a specific rebuild sequence — order matters:**
```
rebuildLiveTablesFromSnapshots()
  1. resolveValueStreamsAndTeams()    ← auto-creates missing VS/teams
  2. resolveFeatureSprints()          ← backfills features.sprint_id
  3. resolveStoryRelationships()      ← backfills stories.feature_id, team_id, sprint_id
```
Step 3 must run after step 2 because stories inherit `team_id` from the parent feature, which must have `team_id` populated first. This was a critical bug that was fixed this session — don't change the order.

**The demo PI data has been manually backfilled:**
Several fields were null in the demo data before this session and were fixed via SQL:
- `stories.team_id` — backfilled from parent feature
- `stories.sprint_id` — backfilled by matching `snapshot_stories.sprint_name` → `sprints.name`
- `dependencies.source_feature_id` / `target_feature_id` — backfilled by matching `ticket_key` against `features`
- `team_art_assignments` — inserted 29 rows derived from `features.art_id`

These are now correct in the DB. The import pipeline fixes mean future imports won't have the same problem.

**Dependency column names have the `dependency_` prefix:**
The DB columns are `dependency_type`, `dependency_criticality`, `dependency_owner`, etc. These will be renamed in Phase 2. When writing queries or types, use the current names but note the P2 rename.

**ART switching works via URL searchParams, not Zustand:**
On Sorting Frame, Team Planning and Dependencies, the ART selector updates a URL searchParam (`artId`). The server component reads this and re-fetches data. The client does `router.push` with updated searchParams. This is intentional — it makes the page bookmarkable and keeps server-side fetching.

**ReactFlow requires careful handling with server components:**
`DependenciesGraph.tsx` is a client component (`'use client'`). ReactFlow cannot be server-rendered. The page server component fetches data and passes it down; the graph itself is client-only.

**The Zustand store still exists and is used by Triage and Demo Mode:**
Don't remove it. It's still needed for the Triage page (which hasn't been connected to Supabase yet) and for the Demo Mode simulation (which is P2 work). When connecting Triage, follow the same server component pattern and remove Zustand from that page only.

**Corporate machine constraints:**
No admin rights. `NODE_EXTRA_CA_CERTS` and `CLAUDE_CODE_GIT_BASH_PATH` are set as permanent Windows user environment variables. Claude Code launched via `cmd /c "claude"`. Don't suggest installs that require admin rights without flagging this.

---

## 4. What Comes Next

### Immediate — no pending branches
All feature work is on main. One clean branch, no pending PRs.

### Next task — Connect Triage to Supabase (only remaining P1 gap)
The Triage page currently shows Zustand/seed data.
- Fetch features with `sprint_id IS NULL` for active PI
- Read-only view in MVP1 — no write-back
- Server component pattern, same as all other pages
- Create `lib/supabase/triage.ts`

### After Triage — P2 candidates in priority order
1. Reality reconciliation pass — full audit of ARCHITECTURE.md and TODO.md 
   against actual codebase before Dashboard Phase 1 build
2. Dashboard Phase 1 — layout shell, three zones (Headline/Signals/Pulse), 
   ConceptualTile wrapper, dashboardThresholds.ts, dashboardActions.ts
   (full spec in DASHBOARD_SPEC.md)
3. Extract shared `getActiveOrSelectedProgramIncrement` — DONE (in shared.ts)
4. Schema Phase 2 renames — significant, use Opus 4.6
5. ART header loading inconsistency — investigate why ARTs load inconsistently 
   across pages (Sorting Frame is reliable, others are not)

---

## 5. Open Questions

### Open questions / known issues

**ART header inconsistency:**
ART pills load reliably on Sorting Frame but inconsistently on other pages — 
sometimes showing CRM, sometimes missing ARTs. Root cause not yet diagnosed. 
Likely in how ARTs are fetched per page vs the shared header component.

**Activity Feed date filter:**
Events after the PI end_date are invisible in the feed because the default date 
filter uses PI start/end dates. The demo PI ended 24 March 2026. Stage change 
events from April 2026 don't appear. Fix: default upper bound to `now()` when 
current date exceeds PI end_date. P3 item.

**Team Planning design consistency:**
Visual alignment with Sorting Frame is functional but not pixel-perfect. 
Deferred — functional first, polish later.

**Demo Mode guard:**
Simulation ticks should not fire when Supabase has real data for the active PI. 
Low risk now (demo data clearly labelled) but needed before Phase 2 Demo Mode rework.
