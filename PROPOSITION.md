# Dispatch — Product Proposition

## Tagline

**Dispatch — where Royal Mail sorts the next quarter of delivery.**

---

## The Problem

Large-scale PI Planning events can be both energising and daunting. Bringing together hundreds of people across platforms, teams and value streams to align on the next quarter of delivery is a significant coordination exercise. When it works well, it creates alignment, clarity and shared ownership. When it doesn't, it can feel overwhelming, fragmented and difficult to navigate.

Today, planning activity is distributed across a patchwork of tools. Teams work inside their delivery backlogs in tools such as Jira and Azure DevOps, while planning discussions take place across collaboration boards, spreadsheets and presentations. Each tool plays an important role, but none provide a clear, shared view of how the entire plan is evolving across platforms and teams in real time.

Specific pain points at Royal Mail Group include:

- **Scale** — events involving 300+ participants across 2 ARTs, 6 platforms and ~29 delivery teams
- **Tool fragmentation** — teams split across Jira, Azure DevOps, Planview, Mural, PowerPoint and spreadsheets
- **Hidden dependencies** — cross-team and cross-platform blockers discovered late in the event
- **Limited situational awareness** — facilitators and leadership cannot see planning progress in real time
- **Loss of planning insight** — outputs remain trapped in workshop artefacts rather than feeding delivery tooling

---

## The Solution

**What if PI Planning felt like a well-orchestrated operational event?**

Introducing **Dispatch** — a lightweight orchestration and insight layer designed specifically for large PI Planning events. Rather than replacing existing delivery tools, Dispatch connects directly to them — synchronising with team backlogs in Jira and Azure DevOps while providing a single visual environment that reveals how work, dependencies and commitments are evolving across the organisation.

During the event, teams continue working in the tools they already use to manage their backlogs and craft stories. Dispatch simply observes and orchestrates that activity, translating it into a live visual model of the plan.

**You don't need Dispatch to run PI Planning. But with it, you get insights that would otherwise be invisible.**

---

## Core Design Principles

### Build on Existing Tools
Teams continue to create stories, manage backlogs and sequence work in Jira and Azure DevOps. Dispatch complements these systems rather than replacing them. BAU tooling remains the source of truth at all times.

### Real-Time Visibility
A live visual model of which features teams are committing to, how work is distributed across sprints, where dependencies exist, and which areas of the plan are converging.

### Collaboration Without Friction
Dispatch does not introduce new processes. Teams continue working in the tools they already know. Dispatch provides the shared view. No additional overhead for teams — before, during or after the event.

### Safe by Design
Dispatch is designed so participants can interact freely with the planning environment without fear of disrupting delivery tooling. In MVP1, Dispatch is **read-only** — it observes and visualises, it never writes back to source systems without explicit opt-in.

*Everything is accessible, but nothing is destructive.*

### Facilitators Work With Teams, Not Instead of Them
Dispatch is designed to encourage collaboration, not to create new power dynamics. When write capability is eventually introduced, conflicts are surfaced to facilitators rather than resolved silently — ensuring teams remain in control of their own plans. The tool supports the social contract of PI Planning; it does not replace it.

A **social contract and code of conduct** for Dispatch usage — covering how facilitators and teams interact with the tool during the event — is a first-class part of the product guide, not an afterthought.

### Flexible by Design
Dispatch exposes capability progressively through explicit toggles rather than all-or-nothing modes. Read-only vs Read+Write, Demo Mode, Planning Stage indicators, sync visibility controls — each is a deliberate opt-in, protecting teams from unintended consequences while giving facilitators the power they need.

### Guided, Not Alarming
Importing data is the most consequential action a non-developer takes in Dispatch. The import wizard is designed to be largely automatic — it runs through validation and proceeds without interruption when everything is clean. It only pauses when it genuinely needs a human decision. Progress is communicated visibly in real time. Every screen carries the same reassurance: your Jira and Azure DevOps data is never affected.

### Continuous, Not Episodic
Dispatch is not a two-day event tool that goes dark afterwards. It keeps humming in the background, syncing with source tools continuously. Old planning cycles remain accessible and browsable without breaking. The tool becomes a persistent planning intelligence layer across the organisation's delivery lifecycle.

---

## What Dispatch Is Not

- A backlog tool
- A replacement for Jira or Azure DevOps
- A story-level execution tracker
- A tool that creates extra work for teams
- A permanent system of record for delivery work (source systems own that)
- A sprint reporting tool (it complements, not duplicates, ADO/Jira reporting)

---

## MVP1 Scope

MVP1 is **read-only**. Dispatch observes and visualises planning data. It does not write back to source systems.

**What MVP1 includes:**
- CSV import pipeline (permanent universal fallback for teams without live sync)
- Sorting Frame — visual board with drag-and-drop for local "what if" planning (visual only, not persisted)
- Live Tracking Dashboard — convergence, dependencies, import freshness, activity feed
- Team Planning Room — team-centric sprint view
- Dependencies Near You — cross-team dependency graph
- Admin Control Centre — cycle management, imports, configuration
- Demo Mode — simulated PI Planning using the gold demo dataset
- Planning Stage indicator — facilitator-set stage visible across all screens

**What MVP1 explicitly excludes:**
- Write-back to ADO/Jira (future phase)
- Live sync from ADO/Jira (future phase)
- Role-based access control (future phase)
- Any action that modifies team data in source systems

---

## Primary Users

| Role | Primary Need |
|---|---|
| Planning Facilitators | Monitor convergence, dependencies and risk in real time; advance planning stage; use "what if" drag-and-drop |
| Technology & Commercial Directors | Value Stream alignment, high-level risk, planning confidence |
| Platform Leads | Cross-team dependency tracking and sequencing visibility |
| Agile Delivery Teams | Understand their quarter in context of the wider plan — read only |
| Value Stream / Product Leads | Track participation and delivery readiness across contributing teams |

---

## Organisation Model

Royal Mail Group's planning structure reflected in Dispatch:

```
ART (Agile Release Train)
└── Platform
    └── Value Stream
        └── Team (appears only when a feature exists for that value stream)
            └── Feature
                └── Story
```

**ARTs:** Web & App · Out Of Home
**Platforms:** WEB · APP · EPS · PDA · BIG · ETP
**Sprint model:** Sprints are continuous across the year (not reset per quarter). Q1 = Sprint 1–6, Q2 = Sprint 7–13, etc.

---

## Positioning vs Existing Tools

Dispatch complements all tools already used across Royal Mail Technology:

| Tool | Current Use | Dispatch Complements By |
|---|---|---|
| Jira / Azure DevOps | Backlog management, sprint planning, story tracking | Visualising cross-team sequencing; surfacing dependencies; providing a shared planning view; eventually writing back sprint assignments (future) |
| Mural | Collaborative planning boards and workshops | Replacing fragmented sticky-note views with structured, queryable planning data |
| Planview | Portfolio reporting, risk and dependency tracking | Exporting structured dependencies, risks and sequencing for Planview programme views |
| Microsoft PowerPoint | Roadmaps and executive presentations | Providing live visualisation that replaces static slide decks during planning events |

---

## Data Integration

**Target integrations (future):** Azure DevOps (primary) · Jira (secondary)

**Current PoC approach:** CSV snapshot imports (permanent universal fallback)

CSV import is a permanent first-class feature, not a temporary workaround. Not every team will have ADO or Jira configured; not every integration will be reliable; some teams may use entirely different tools. The three data paths are complementary:

- **ADO live sync** — teams with ADO integrated
- **Jira live sync** — teams with Jira integrated  
- **CSV import** — teams without integration, teams where sync has failed, teams on other tools

Teams export planning data from ADO/Jira using a structured template. Dispatch validates, imports and visualises the snapshot. Imports are stored with full history, support rollback, and can be refreshed multiple times during the planning event.

### Data Source Rules (Merge Strategy)
When data arrives from any source — CSV import or live sync — the following rules apply:

- Incoming data with a more recent timestamp always wins
- Incoming data that is older than existing data is ignored
- BAU tooling is always the authority — Dispatch never holds data hostage
- Local visual changes (drag-and-drop in Read Only mode) are ephemeral and overridden by any subsequent sync or import
- No locks, no manual conflict resolution required — timestamp rules handle everything automatically

These rules are documented in the Help Centre and available in-situ from the Import UI.

**CSV Import field set:**
`sourceSystem · art · value stream · team · platform · featureKey · featureTitle · storyKey · storyTitle · sprint · status · commitmentStatus · dependencyType · dependsOnKey · dependencyOwner · dependencyCriticality · dependencyTargetSprint · dependencyDescription`

**Dependency types supported:**
Team · Platform · Infrastructure · Environment · Operations · External · Approval · ServiceNow

*Operations dependencies are particularly important — e.g. software that cannot deliver value until physical estate, field engineering or operational rollout has completed.*

---

## Demo Mode

Dispatch includes a first-class Demo Mode powered by the gold demo dataset — a realistic Royal Mail planning scenario with 62 features, 29 teams, 18 value streams and cross-platform dependencies.

Demo Mode simulates a complete two-day PI Planning event with:
- Realistic activity: features being committed, stories added, dependencies flagged, sprint load shifting
- Live dashboard updating with convergence, risk and freshness signals
- Activity feed coming alive with team progress
- Speed controls (1x / 5x / 20x) for demonstrations
- Stage-skip to any point in the PI Planning agenda
- Reset to starting state at any time

**The gold demo dataset is the showcase dataset for Demo Mode — not a development testing tool.**

A persistent amber banner across the top of the app signals when Demo Mode is active. Simulated changes never write to Supabase. Real planning data is always unaffected.

---

## Planning Stage Indicator

During a live PI Planning event, the facilitator sets the current planning stage via a control in the planning header. All users see the current stage as ambient context across every screen.

**Stages:**
1. Business Context & Vision
2. Team Breakouts — Draft Plan
3. Draft Plan Review
4. Team Breakouts — Revised Plan
5. Final Plan Review & RoART
6. PI Planning Complete

The stage indicator has no workflow implications — it is a contextual lens, not a gate. Moving it backwards is as valid as forwards. The app compares current board state against expected state for the selected stage and surfaces contextual guidance: *"Convergence is 40% — typically 85–95% at this stage."*

Each screen adapts subtly to the current stage — the Sorting Frame, Dashboard and Dependencies views each emphasise different signals depending on where the event is.

---

## Post-PI Planning: Quarter-Long Visibility

Dispatch does not die as an artefact after the event. With live sync enabled, it continues tracking delivery progress across the quarter:

- Feature workflow status (To Do / In Progress / Done / Blocked) pulled from ADO/Jira
- Dependencies that have been resolved as work completes
- Features that have slipped from their planned sprint
- A "Changes since PI Planning" log — what was planned vs what actually happened

This is deliberately lightweight — it is not a sprint reporting tool and does not duplicate ADO/Jira reporting. It is a high-level planning intelligence layer that shows whether the quarter is tracking to what was committed at PI Planning.

**The hidden gem of Dispatch:** understanding planning progress over 2 days extends naturally to understanding delivery progress over a quarter — without any additional effort from teams.

---

## Demo Dataset

The gold demo dataset contains 211 rows, 62 features, 211 stories, 29 teams, 18 value streams across both ARTs. It includes realistic dependency scenarios:

- Cross-team CIAM dependency: Unified Login Experience → Identity Token Gateway
- App/Web to EPS: Parcel Tracking UI Refresh → Customer Tracking Event Feed
- OOH Operations dependency: OOH Service Availability Engine → OPS-PILLARBOX-RETROFIT
- ServiceNow dependency: Delivery Status Notification Engine → SNOW-CHG-1021
- External dependency: Traffic Aware Routing → EXT-TRAFFIC-001
- Infrastructure dependency: APIC Platform Migration → INF-NET-7781

The gold dataset is loaded under a `DEMO —` prefixed planning cycle. Demo and test cycles (`DEMO —`, `TEST —`) are hidden from regular users by default and only visible when an Admin toggle is enabled.

---

## Current State (PoC)

Functional PoC connected to Supabase, deployed on Vercel, integrated with GitHub (auto-deploy on push to main). Local dev environment established (VS Code, Git Bash, npm, Claude Code CLI, localhost:3000).

Admin Control Centre and Live Tracking Dashboard are fully Supabase-connected. Sorting Frame is Supabase-connected. Team Planning Room and Dependencies Near You currently use demo/seed data (P1 backlog).

---

## Future Direction

**Phase 2 — Live Sync & Write Capability**
- Direct Azure DevOps integration (provider interface already built)
- Jira integration
- Read + Write mode with explicit Admin toggle
- Write-back to ADO/Jira with confirmation dialogs
- Facilitator scope limited to: move features/stories between sprints, change commitment status — never create, edit text, or delete

**Phase 3 — Intelligence & Analytics**
- Advanced dependency analytics and risk heatmaps
- Scenario simulation (what-if planning with dependency impact)
- Readiness scoring with trend tracking
- Cross-cycle historical comparison
- Planning Stage contextual app behaviour (Sorting Frame, Dashboard, Dependencies adapting per stage)

**Phase 4 — Scale & Governance**
- Role-based access control (facilitator vs read-only stakeholder)
- Proper authentication (Supabase Auth)
- Confidence voting (teams vote 1–5 at close of PI Planning)
- Dependencies Room — richer dependency management and negotiation screen
