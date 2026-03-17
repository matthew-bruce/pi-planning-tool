export type HelpArticleSection = {
  id: string;
  title: string;
  content: string;
  bullets?: string[];
  tip?: string;
  warning?: string;
  defaultOpen?: boolean;
};

export type HelpTopic = {
  id: string;
  title: string;
  summary: string;
  tags?: string[];
  callout?: string;
  sections: HelpArticleSection[];
};

export type HelpSection = {
  id: string;
  title: string;
  topics: HelpTopic[];
};

export const helpSections: HelpSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    topics: [
      {
        id: "what-is-dispatch",
        title: "What is Dispatch?",
        summary:
          "Dispatch is a PI Planning orchestration and observability layer designed to help Royal Mail Group visualise planning progress, dependencies, sequencing and risk across multiple teams, platforms and ARTs.",
        tags: ["overview", "pi planning", "orchestration"],
        callout:
          "Dispatch does not replace Jira or Azure DevOps. Teams continue working in their existing tooling while Dispatch provides a shared operational view of the plan.",
        sections: [
          {
            id: "purpose",
            title: "Purpose",
            defaultOpen: true,
            content:
              "Dispatch exists to make large-scale PI Planning easier to understand and easier to run. It gives facilitators, platform leads, directors and teams a shared visual model of the planning event as it evolves.",
            bullets: [
              "See features sequenced across the quarter",
              "Surface dependencies early",
              "Track planning convergence",
              "Support cross-team coordination",
            ],
          },
          {
            id: "why-it-exists",
            title: "Why it exists",
            content:
              "Traditional PI Planning often spans several tools at once: backlog tools, boards, spreadsheets and presentations. Each is useful, but none provide a single clear view of the planning event itself.",
            tip:
              "Think of Dispatch as mission control for PI Planning: a layer that helps everyone understand what is happening across the room.",
          },
        ],
      },
      {
        id: "who-is-dispatch-for",
        title: "Who is Dispatch for?",
        summary:
          "Dispatch supports the full planning audience, from facilitators and directors to teams and initiative leads.",
        tags: ["roles", "stakeholders"],
        sections: [
          {
            id: "stakeholders",
            title: "Primary users",
            defaultOpen: true,
            content:
              "Dispatch is designed to support multiple roles during PI Planning.",
            bullets: [
              "Planning Facilitators — monitor progress, imports, dependencies and planning convergence",
              "Technology & Commercial Directors — see initiative alignment and high-level risk",
              "Platform Leads — track dependencies and sequencing across their area",
              "Agile Delivery Teams — understand how their work fits into the wider plan",
              "Initiative / Product Leads — monitor participation and delivery readiness",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "planning-concepts",
    title: "Planning Concepts",
    topics: [
      {
        id: "planning-cycles",
        title: "Program Increments",
        summary:
          "Program Increments represent a PI / quarter in Dispatch. Each PI owns its sprint cadence, initiatives, imports and live planning state.",
        tags: ["program increment", "PI", "quarter", "sprints"],
        sections: [
          {
            id: "cycle-definition",
            title: "How Program Increments work",
            defaultOpen: true,
            content:
              "A Program Increment defines the planning horizon. It includes a start date, sprint count, sprint cadence and generated sprint schedule.",
            bullets: [
              "A Program Increment is created in the Admin Control Centre",
              "The sprint schedule is generated automatically from the PI start date and sprint count",
              "Sprint numbering continues across the year rather than resetting each quarter",
            ],
            tip:
              "Dispatch previews the generated sprint dates before the Program Increment is saved, so the cadence can be confirmed before use.",
          },
          {
            id: "cycle-selection",
            title: "Active PI behaviour",
            content:
              "If only one Program Increment exists, Dispatch will use it automatically. If multiple exist, the app defaults to the current active PI or the most recent one by date. Users can switch to previous Program Increments for reference.",
          },
        ],
      },
      {
        id: "features-and-stories",
        title: "Features and Stories",
        summary:
          "Dispatch visualises work primarily at Feature level, with Stories providing supporting execution detail.",
        tags: ["feature", "story", "work hierarchy"],
        sections: [
          {
            id: "hierarchy",
            title: "Work hierarchy",
            defaultOpen: true,
            content:
              "Dispatch aligns to a simple hierarchy used in planning: Strategic Epic → Feature → Story.",
            bullets: [
              "Strategic Epic: high-level business or technology outcome",
              "Feature: major capability or deliverable planned in the PI",
              "Story: detailed team-level delivery item created in backlog tooling",
            ],
          },
          {
            id: "why-feature-level",
            title: "Why Dispatch focuses on Features",
            content:
              "Dispatch is designed to support planning and orchestration, not replace backlog tools. Features are the right level to visualise cross-team planning, while Stories remain in Azure DevOps or Jira for delivery execution.",
            warning:
              "Teams should continue to create and manage stories in their existing backlog tooling. Dispatch reflects that activity rather than replacing it.",
          },
        ],
      },
      {
        id: "dependencies",
        title: "Dependencies",
        summary:
          "Dependencies represent the relationships and blockers between work items, teams, platforms and external constraints.",
        tags: ["dependencies", "risk", "blocking"],
        sections: [
          {
            id: "dependency-types",
            title: "Dependency types",
            defaultOpen: true,
            content:
              "Dispatch supports multiple dependency categories so the planning room can see more than software-to-software blockers.",
            bullets: [
              "Team",
              "Platform",
              "Infrastructure",
              "Environment",
              "Operations",
              "External",
              "Approval",
              "ServiceNow",
            ],
            tip:
              "Operations dependencies are particularly important where physical estate, field engineering or operational rollout must happen before software value can be realised.",
          },
          {
            id: "dependency-metadata",
            title: "Dependency details",
            content:
              "Dependencies can include an owner, criticality, target sprint and plain-language description. This makes them far more useful during live planning discussions.",
            bullets: [
              "Owner — who is responsible",
              "Criticality — Low / Medium / High",
              "Target sprint — when the dependency must be resolved",
              "Description — what the dependency actually means",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "screens",
    title: "Screens",
    topics: [
      {
        id: "sorting-frame",
        title: "Sorting Frame",
        summary:
          "The Sorting Frame is the main planning board used during PI Planning. It organises work across sprints, initiatives and team lanes.",
        tags: ["sorting frame", "board", "planning"],
        sections: [
          {
            id: "what-it-shows",
            title: "What it shows",
            defaultOpen: true,
            content:
              "The Sorting Frame organises the current Program Increment into sprint columns and initiative groups. Teams appear beneath initiatives only when they have work in that initiative.",
            bullets: [
              "Sprint columns across the top",
              "Initiative groups as the main row structure",
              "Team lanes within initiatives",
              "Feature cards placed in the correct sprint",
            ],
          },
          {
            id: "why-it-matters",
            title: "Why it matters",
            content:
              "This is the main shared view of the plan. It helps everyone in the room understand sequencing, ownership and pressure points at a glance.",
            tip:
              "Use the Sorting Frame for big-room conversations about which work fits where, which initiatives are under-supported, and where dependencies create risk.",
          },
        ],
      },
      {
        id: "team-planning-room",
        title: "Team Planning Room",
        summary:
          "The Team Planning Room flips the view from initiative-first to team-first, helping teams understand their own quarter.",
        tags: ["team planning", "team view"],
        sections: [
          {
            id: "team-view-purpose",
            title: "Purpose",
            defaultOpen: true,
            content:
              "Where the Sorting Frame shows the whole programme, Team Planning Room helps one team focus on what they are expected to deliver across the Program Increment.",
            bullets: [
              "Features grouped by team",
              "Sequencing across sprints",
              "Cross-initiative participation made visible",
              "Supports detailed team discussion",
            ],
          },
        ],
      },
      {
        id: "dependencies-near-you",
        title: "Dependencies Near You",
        summary:
          "Dependencies Near You displays the network of cross-team and cross-platform dependencies as a graph.",
        tags: ["dependency graph", "reactflow", "risk"],
        sections: [
          {
            id: "graph-purpose",
            title: "How to use it",
            defaultOpen: true,
            content:
              "This screen helps identify clusters of dependencies, high-risk chains and items that may block multiple teams or initiatives.",
            bullets: [
              "Nodes represent work items or planning entities",
              "Edges represent dependencies",
              "Criticality and type can be surfaced visually",
            ],
            tip:
              "Use this view when the room needs to understand how a specific dependency or team impacts the wider plan.",
          },
        ],
      },
      {
        id: "live-tracking-dashboard",
        title: "Live Tracking Dashboard",
        summary:
          "The Live Tracking Dashboard is the operational view of planning progress, imports, dependencies and convergence during the PI event.",
        tags: ["dashboard", "mission control", "observability"],
        sections: [
          {
            id: "dashboard-metrics",
            title: "What it shows",
            defaultOpen: true,
            content:
              "The dashboard is intended to be displayed on a large screen during planning. It provides real-time visibility of the planning session itself.",
            bullets: [
              "Feature and story counts",
              "ART-level status tiles",
              "Plan convergence",
              "Sprint distribution",
              "Dependency criticality and type mix",
              "Import freshness",
              "Activity feed",
              "Attention items",
            ],
            warning:
              "The dashboard is only as useful as the quality and freshness of the imported or synced data. Check import health regularly.",
          },
        ],
      },
      {
        id: "admin-control-centre",
        title: "Admin Control Centre",
        summary:
          "The Admin Control Centre is where Dispatch is configured and operated.",
        tags: ["admin", "settings", "configuration"],
        sections: [
          {
            id: "admin-purpose",
            title: "What can be managed here",
            defaultOpen: true,
            content:
              "The Admin area is the operational backbone of Dispatch. It is used to set up the planning environment and manage imports safely.",
            bullets: [
              "Program Increments",
              "Platforms",
              "ARTs",
              "Teams",
              "Initiatives",
              "Import / Sync",
            ],
          },
          {
            id: "cycle-readiness",
            title: "PI Readiness & Import Health",
            content:
              "The Admin area also includes readiness and import health signals, helping facilitators see whether the current Program Increment is configured properly and whether the imported data can be trusted.",
          },
        ],
      },
    ],
  },
  {
    id: "features",
    title: "Features",
    topics: [
      {
        id: "parking-lot",
        title: "Parking Lot",
        summary:
          "The Parking Lot contains features that have not yet been assigned to a sprint.",
        tags: ["parking lot", "triage", "unallocated"],
        sections: [
          {
            id: "parking-lot-usage",
            title: "When to use it",
            defaultOpen: true,
            content:
              "The Parking Lot is useful during the early stages of planning or whenever work needs to be held outside the active sprint layout until sequencing decisions have been made.",
            bullets: [
              "Keep incomplete work visible but out of the board",
              "Avoid cluttering the main frame with unscheduled items",
              "Support triage and prioritisation conversations",
            ],
          },
        ],
      },
      {
        id: "data-import",
        title: "Data Import",
        summary:
          "Dispatch supports snapshot-based import of planning data from Azure DevOps, Jira or structured CSV exports.",
        tags: ["csv", "import", "snapshot"],
        sections: [
          {
            id: "import-flow",
            title: "How imports work",
            defaultOpen: true,
            content:
              "Imports are treated as snapshots. A file can contain one or more teams, initiatives or ARTs. Dispatch validates the file, stores the raw import and rebuilds the live planning state from the active snapshots.",
            bullets: [
              "Upload CSV",
              "Preview rows",
              "Map columns",
              "Review validation warnings",
              "Import snapshot",
            ],
            tip:
              "Use the import preview and mapping step to catch formatting issues before they affect the live planning views.",
          },
          {
            id: "mismatch-handling",
            title: "Sprint mismatch handling",
            content:
              "Dispatch uses the Program Increment sprint cadence as the canonical sprint structure. If imported sprint names or dates do not match the PI, the user is warned before import proceeds.",
            warning:
              "Dispatch should not silently rewrite the Program Increment sprint cadence based on imported data. Mismatches must be reviewed and confirmed.",
          },
        ],
      },
      {
        id: "import-rollback",
        title: "Import Rollback",
        summary:
          "If a snapshot import goes wrong, Dispatch can roll back the latest import and rebuild the live state from the remaining active snapshots.",
        tags: ["rollback", "safety", "imports"],
        sections: [
          {
            id: "why-rollback-exists",
            title: "Why rollback matters",
            defaultOpen: true,
            content:
              "Planning data can be messy, especially during a live event. Rollback provides a safety net so an invalid import does not pollute the board.",
            bullets: [
              "Rollback applies to the latest imported file",
              "Imports are preserved as snapshot history",
              "Live state is rebuilt from active snapshots",
            ],
          },
        ],
      },
      {
        id: "demo-mode",
        title: "Demo Mode",
        summary:
          "Demo Mode simulates planning activity and is useful for showing Dispatch without live source data.",
        tags: ["demo", "simulation"],
        sections: [
          {
            id: "demo-mode-purpose",
            title: "What Demo Mode does",
            defaultOpen: true,
            content:
              "When enabled, Demo Mode simulates planning movements and activity events so the UI feels active during demonstrations and testing.",
            bullets: [
              "Generates planning activity periodically",
              "Populates the activity feed",
              "Helps demonstrate the dashboard and board behaviour",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "faq",
    title: "FAQ",
    topics: [
      {
        id: "faq-general",
        title: "Frequently Asked Questions",
        summary:
          "Answers to common questions about how Dispatch fits into PI Planning and how it should be used.",
        tags: ["faq"],
        sections: [
          {
            id: "faq-tooling",
            title: "Does Dispatch replace Jira or Azure DevOps?",
            defaultOpen: true,
            content:
              "No. Dispatch complements existing tooling. Teams continue to use Azure DevOps or Jira for backlog and story management while Dispatch provides orchestration, visibility and insight.",
          },
          {
            id: "faq-real-time",
            title: "Is Dispatch real-time?",
            content:
              "Dispatch is designed to support real-time or near-real-time orchestration. In the PoC, this may be driven by demo data, CSV snapshots, or limited live integration.",
          },
          {
            id: "faq-dependencies",
            title: "What kinds of dependencies can Dispatch show?",
            content:
              "Dispatch can show software, platform, infrastructure, environment, operations, approval and external dependencies. This makes it more useful than tools that only capture technical blockers.",
          },
        ],
      },
    ],
  },
  {
    id: "roadmap",
    title: "Roadmap",
    topics: [
      {
        id: "future-roadmap",
        title: "Future Roadmap",
        summary:
          "Dispatch is currently a PoC. Several enhancements are planned or envisaged for future phases.",
        tags: ["roadmap", "future"],
        sections: [
          {
            id: "future-areas",
            title: "Planned or potential future enhancements",
            defaultOpen: true,
            content:
              "Dispatch is intended to evolve from a planning visibility PoC into a richer orchestration product over time.",
            bullets: [
              "Direct Azure DevOps integration",
              "Jira integration",
              "Advanced dependency analytics",
              "Readiness scoring",
              "Scenario simulation",
              "Cross-cycle insight and historical comparison",
              "Richer role-based administration",
            ],
          },
        ],
      },
    ],
  },
];
