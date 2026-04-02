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

**`getActiveOrSelectedProgramIncrement` is duplicated:**
This pattern (get active PI, fall back to Demo PI UUID) is now in four fetchers: `dashboard.ts`, `sortingFrame.ts`, `teamPlanning.ts`, `dependencies.ts`. It should be extracted to `lib/supabase/shared.ts` in P2. Don't add a fifth copy — reference this as a known debt item.

**Dependency column names have the `dependency_` prefix:**
The DB columns are `dependency_type`, `dependency_criticality`, `dependency_owner`, etc. These will be renamed in Phase 2. When writing queries or types, use the current names but note the P2 rename.

**ART switching works via URL searchParams, not Zustand:**
On Sorting Frame, Team Planning and Dependencies, the ART selector updates a URL searchParam (`artId`). The server component reads this and re-fetches data. The client does `router.push` with updated searchParams. This is intentional — it makes the page bookmarkable and keeps server-side fetching.

**ReactFlow requires careful handling with server components:**
`DependenciesGraph.tsx` is a client component (`'use client'`). ReactFlow cannot be server-rendered. The page server component fetches data and passes it down; the graph itself is client-only.

**The Zustand store still exists and is used by Triage and Demo Mode:**
Don't remove it. It's still needed for the Triage page (which hasn't been connected to Supabase yet) and for the Demo Mode simulation (which is P2 work). When connecting Triage, follow the same server component pattern and remove Zustand from that page only.

**Branch vs main:**
The latest commit with Dependencies Near You is on branch `claude/connect-planning-room-supabase-JMGyo`. It needs to be merged to main before Dependencies is live in production. Check Vercel deployment history if unsure what's on main.

**Corporate machine constraints:**
No admin rights. `NODE_EXTRA_CA_CERTS` and `CLAUDE_CODE_GIT_BASH_PATH` are set as permanent Windows user environment variables. Claude Code launched via `cmd /c "claude"`. Don't suggest installs that require admin rights without flagging this.

---

## 4. What Comes Next

### Immediate — merge pending PR
Branch `claude/connect-planning-room-supabase-JMGyo` contains Team Planning + Dependencies work and needs merging to main. Verify the Dependencies page looks correct on the branch URL first.

### Next task — Connect Triage to Supabase (last P1 gap)
This is the only remaining P1 item. The Triage page currently shows Zustand/seed data.

What it should do:
- Fetch features with `sprint_id IS NULL` for the active PI (these are parking lot features)
- Show them in a manageable list for bulk assignment
- MVP1: read-only view (no sprint assignment write-back yet — that's Read+Write mode)
- Server component pattern, same as all other pages
- Create `lib/supabase/triage.ts`

### After Triage — P2 options to discuss
Once all P1 gaps are closed, the sensible P2 candidates in rough priority order are:
1. **Extract shared `getActiveOrSelectedProgramIncrement`** — low effort, high value for maintainability
2. **Team Planning design consistency pass** — the visual alignment is approximate, not complete
3. **Schema Phase 2 renames** — significant but important before a real event (use Opus 4.6 for this)
4. **Planning Stage indicator** — high product value, needed for real events

---

## 5. Open Questions

**Dependencies page — needs visual review:**
The Dependencies Near You page was just built and deployed to the branch. It hasn't been reviewed in a browser yet. Open questions:
- Does the graph render correctly with 27 edges and 38 nodes?
- Do external nodes (ServiceNow, Infrastructure etc.) display distinctly?
- Does ART filtering work (WAA vs OOH)?
- Does the node click side panel work?
- Are there any React hydration errors from ReactFlow + server components?

**Team Planning design consistency:**
The visual alignment with Sorting Frame was noted as "approximate, not complete". No specific bugs were filed — it was deferred. Worth a focused look before showing to stakeholders.

**Sprint Goals — product decision needed before building:**
A Sprint Goals feature was requested for Team Planning but deferred. Before building, a decision is needed: are goals per-team (each team sets their own goal for each sprint) or per-ART/sprint (one goal for all teams in that sprint)? This determines the schema. It's in P3 backlog.

**Demo Mode guard:**
Simulation ticks in the Zustand store should not fire when Supabase has real data for the active PI. Currently there's no guard. Low risk for now (demo data is clearly labelled) but should be addressed before Phase 2 Demo Mode rework.

**Merge strategy for imports:**
The current import is destructive (delete all + rebuild). This works but means a re-import always overwrites everything. The P2 plan is to replace this with an upsert strategy using `source_key + last_synced_at`. This hasn't been started — note it as a sequencing risk before live sync is introduced.
