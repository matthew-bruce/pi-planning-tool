# Dispatch — Product Proposition

## Tagline

**Dispatch — where Royal Mail sorts the next quarter of delivery.**

---

## The Problem

Large-scale PI Planning events can be both energising and daunting. Bringing together hundreds of people across platforms, teams and initiatives to align on the next quarter of delivery is a significant coordination exercise. When it works well, it creates alignment, clarity and shared ownership. When it doesn't, it can feel overwhelming, fragmented and difficult to navigate.

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

### Core Design Principles

**Build on Existing Tools**
Teams continue to create stories, manage backlogs and sequence work in Jira and Azure DevOps. Dispatch complements these systems rather than replacing them.

**Real-Time Visibility**
A live visual model of which features teams are committing to, how work is distributed across sprints, where dependencies exist, and which areas of the plan are converging.

**Collaboration Without Friction**
Dispatch does not introduce new processes. Teams continue working in the tools they already know. Dispatch provides the shared view.

**Safe by Design**
Dispatch is designed so participants can interact freely with the planning environment without fear of disrupting delivery tooling. Changes to backlog items continue to happen within Jira or Azure DevOps, ensuring those systems remain the source of truth.

*Everything is accessible, but nothing is destructive.*

---

## What Dispatch Is Not

- A backlog tool
- A replacement for Jira or Azure DevOps
- A story-level execution tracker
- A permanent system of record for delivery work

---

## Primary Users

| Role | Primary Need |
|---|---|
| Planning Facilitators | Monitor convergence, imports, dependencies and risk in real time |
| Technology & Commercial Directors | Initiative alignment, high-level risk, planning confidence |
| Platform Leads | Cross-team dependency tracking and sequencing visibility |
| Agile Delivery Teams | Understand their quarter in context of the wider plan |
| Initiative / Product Leads | Track participation and delivery readiness across contributing teams |

---

## Organisation Model

Royal Mail Group's planning structure reflected in Dispatch:

```
ART (Agile Release Train)
└── Platform
    └── Initiative
        └── Team (appears only when a feature exists for that initiative)
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
| Jira / Azure DevOps | Backlog management, sprint planning, story tracking | Importing features/stories; visualising cross-team sequencing; writing back sprint assignments |
| Mural | Collaborative planning boards and workshops | Replacing fragmented sticky-note views with structured, queryable planning data |
| Planview | Portfolio reporting, risk and dependency tracking | Exporting structured dependencies, risks and sequencing for Planview programme views |
| Microsoft PowerPoint | Roadmaps and executive presentations | Providing live visualisation that replaces static slide decks during planning events |

---

## Data Integration

**Target integrations (future):** Azure DevOps (primary) · Jira (secondary)

**Current PoC approach:** CSV snapshot imports

Teams export planning data from ADO/Jira using a structured template. Dispatch validates, imports and visualises the snapshot. Imports are stored with full history, support rollback, and can be refreshed multiple times during the planning event.

**CSV Import field set:**
`sourceSystem · art · initiative · team · platform · featureKey · featureTitle · storyKey · storyTitle · sprint · status · commitmentStatus · dependencyType · dependsOnKey · dependencyOwner · dependencyCriticality · dependencyTargetSprint · dependencyDescription`

**Dependency types supported:**
Team · Platform · Infrastructure · Environment · Operations · External · Approval · ServiceNow

*Operations dependencies are particularly important — e.g. software that cannot deliver value until physical estate, field engineering or operational rollout has completed.*

---

## Demo Dataset

The gold demo dataset contains 211 rows, 62 features, 211 stories, 29 teams, 18 initiatives across both ARTs. It includes realistic dependency scenarios:

- Cross-team CIAM dependency: Unified Login Experience → Identity Token Gateway
- App/Web to EPS: Parcel Tracking UI Refresh → Customer Tracking Event Feed
- OOH Operations dependency: OOH Service Availability Engine → OPS-PILLARBOX-RETROFIT
- ServiceNow dependency: Delivery Status Notification Engine → SNOW-CHG-1021
- External dependency: Traffic Aware Routing → EXT-TRAFFIC-001
- Infrastructure dependency: APIC Platform Migration → INF-NET-7781

---

## Current State (PoC)

Functional PoC connected to Supabase, deployed on Vercel, integrated with GitHub (auto-deploy on push to main). Admin Control Centre and Live Tracking Dashboard are fully Supabase-connected. Sorting Frame is Supabase-connected. Team Planning Room and Dependencies Near You currently use demo/seed data (P1 backlog).

---

## Future Direction

- Direct Azure DevOps integration (provider interface already built)
- Jira integration
- Advanced dependency analytics and risk heatmaps
- Scenario simulation (what-if planning)
- Readiness scoring with trend tracking
- Cross-cycle historical comparison
- Role-based access control (facilitator vs read-only stakeholder)
- Dependencies Room — richer dependency management and negotiation screen
