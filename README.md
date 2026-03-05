# Dispatch (PoC) – Royal Mail Group PI Planning

Dispatch is a **stubbed orchestration + observability layer** for PI Planning. It does **not** replace Jira/Azure DevOps. This PoC focuses on planning visibility, dependency mapping, and demo simulation with dummy data.

## Tech Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Drag-and-drop: `@dnd-kit/core`, `@dnd-kit/sortable`
- Dependency graph: `reactflow`
- State: Zustand + localStorage persistence

## Routes
- `/sorting-frame` – ART → Initiative groups → Team lanes, sprint columns, parking lot drawer
- `/team-planning` – platform-first then teams (collapsible)
- `/dependencies` – dependency graph with ART/initiative/platform filtering and side details
- `/dashboard` – KPIs, ART tiles, sprint distribution, activity feed
- `/triage` – full-screen bulk triage for unallocated features
- `/help` – static guide and FAQ

## Run locally
1. Install dependencies
   ```bash
   npm install
   ```
2. Start dev server
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` (redirects to `/sorting-frame`).

## Demo Mode behavior
- Header has a Demo Mode toggle.
- **ON**: simulation runs every ~8–15 seconds and randomly performs one event:
  - move feature to sprint / parking lot
  - add dependency
  - change story count
- Every simulation event is appended to the `activityFeed` and displayed in Dashboard.
- **OFF**: simulation stops. Existing data remains in localStorage.

## Provider architecture (integration-ready)
- Provider interface: `providers/dataProvider.ts`
- Current implementation: `providers/dummyProvider.ts`
- Seed/domain bootstrap: `lib/seedData.ts`, `lib/models.ts`
- App state consumes provider output via Zustand: `store/useDispatchStore.ts`

### Adding Jira/Azure DevOps providers later
1. Create `providers/jiraProvider.ts` or `providers/adoProvider.ts` implementing `DataProvider`.
2. Provide initial data mapping into canonical domain model (`Art`, `Initiative`, `Team`, `Sprint`, `Feature`, `Dependency`).
3. Switch provider selection in `store/useDispatchStore.ts` (or add runtime provider selector).
4. Keep UI unchanged; screens already depend on canonical store/provider state.
