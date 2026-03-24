# Dispatch — Design System

> This file is read at the start of every Claude session that touches UI.
> Never create one-off styled elements. Always use or extend components/ui/.
> Never use arbitrary Tailwind hex values. Always use named design tokens.

---

## Core Principles

1. **Consistency over creativity** — every page should look like it belongs to the same app
2. **Tokens over values** — never hardcode `#EE2722`, always use `royalRed`
3. **Components over repetition** — if you style something twice, it belongs in components/ui/
4. **Data speaks, design supports** — colour communicates state, not decoration

---

## Design Tokens

All tokens defined in `tailwind.config.ts`:

### Brand
```
royalRed:     '#EE2722'   — primary brand, planning header, active states
royalYellow:  '#FDDD1C'   — Demo Mode banner, warning accent
```

### Semantic Status
```
success:  '#16a34a'   — healthy, committed, on track
warning:  '#d97706'   — attention needed, planned
danger:   '#dc2626'   — at risk, blocked, high criticality
neutral:  '#6b7280'   — inactive, draft, no data
```

### Surface
```
surface:       '#ffffff'   — cards, panels
surfaceSubtle: '#f9fafb'   — page backgrounds, board areas
border:        '#e5e7eb'   — dividers, card borders
```

### Text
```
textPrimary:  '#111827'   — headings, primary content
textMuted:    '#6b7280'   — labels, secondary content
```

### Value Stream Palette (warm RMG brand tones)
```
vs1: '#fce7e7'  text: '#991b1b'   — red family
vs2: '#fef9c3'  text: '#854d0e'   — yellow family
vs3: '#ffedd5'  text: '#9a3412'   — orange
vs4: '#fce7f3'  text: '#831843'   — pink
vs5: '#fef3c7'  text: '#92400e'   — amber
vs6: '#f0fdf4'  text: '#14532d'   — mint
vs7: '#f0f9ff'  text: '#0c4a6e'   — sky
vs8: '#f5f3ff'  text: '#4c1d95'   — lavender
```

---

## Shared Components (components/ui/)

All shared UI primitives live here. Import from here — never recreate locally.

### PageHeader
Used on every planning page (Sorting Frame, Team Planning, Dependencies, Dashboard).
```tsx
<PageHeader 
  title="Sorting Frame"
  subtitle="Demo PI · 31/12/2025 – 24/03/2026"
  actions={<>filters and controls</>}
/>
```
- Title: text-2xl font-weight 500
- Subtitle: text-sm text-muted
- Actions: right-aligned in the same row as the title

### SectionHeader (Value Stream)
Full-width coloured header for VS sections on the board.
- Background: assigned vs colour
- Text: matching darker vs text colour
- Shows: VS name (left), Teams/Features/Dependencies/Conflicts (right)
- Chevron expand/collapse icon on left of name

### SwimLaneRow (Team row)
Full-width team sub-header that spans all sprint columns.
- White background, left border in VS colour (3px)
- Shows: chevron + team name + platform abbreviation (muted) + feature count (right)
- Clicking expands/collapses the sprint rows below

### FeatureCard
Used identically on Sorting Frame AND Team Planning Room.
**Never create a separate card component for another page.**

Compact mode:
- Ticket key (royalRed, hyperlink style) + source system badge (top row, right-aligned)
- Feature title
- Commitment status pill + story count + dependency badge (bottom row)

Detailed mode (adds):
- Story-sprint dot indicator (S1 ●●● S2 ●●)
- Expandable story list below card
- Strip parent feature name prefix from story titles

### StatusPill
```tsx
<StatusPill status="committed" />  // green
<StatusPill status="planned" />    // blue  
<StatusPill status="draft" />      // gray
```

### Badge
```tsx
<Badge variant="dependency" criticality="high" count={2} />
<Badge variant="stories" count={4} />
<Badge variant="source" system="ado" />
```

### EmptyCell
Ghost state for empty sprint cells.
- Inbox icon (text-gray-200, 20px)
- "Empty" text (text-gray-300, 11px)
- Centred in cell

### SprintHeader
Sticky header row showing sprint names and dates.
- Background: #f3f4f6
- Sprint name: 14px, font-weight 600
- Date range: 11px, muted
- Bottom border: 1px solid #e5e7eb

---

## Page Layout Pattern

Every planning page follows this structure:

```
<DispatchShell>           — sidebar + planning header
  <PageHeader>            — title + subtitle + controls
  <StickySprintHeader>    — sprint columns (Sorting Frame only)
  <BoardContent>          — VS sections + team rows + cards
    <SectionHeader>       — VS header (coloured)
      <SwimLaneRow>       — team row (full width)
        <SprintCells>     — one cell per sprint
          <FeatureCard>   — feature card
            <StoryList>   — expandable stories (Detailed mode)
```

---

## Planning Header (red bar)

Contains only:
- ART selector buttons (inactive: white text/border, active: white bg/red text)
- Demo chip (royalYellow background)
- Diagonal stripe watermark (white/yellow stripes, opacity 0.12)

Does NOT contain:
- Card view toggle (lives in filter row below page title)
- Planning Stage indicator (future feature)
- Any page-specific controls

---

## Sidebar

- Expanded: 180px, icons + labels
- Collapsed: 52px, icons only with tooltips
- Never truncate labels in expanded state
- Config section (Demo Mode, Admin, Help) always pinned to bottom
- Royal Mail logo at top, gradient stripe accent below brand area

---

## Animation Rules

- Expand/collapse: 200ms ease-out on height
- Icon rotation (chevrons): 200ms ease
- Sidebar collapse: 200ms ease-in-out on width
- Card hover: scale(1.01), 100ms ease
- Never exceed 250ms
- Always respect prefers-reduced-motion

---

## Rules for Claude Code

1. Read this file before touching any UI component
2. If a component you need exists in components/ui/ — use it
3. If it doesn't exist but should be shared — create it in components/ui/ first
4. Never create page-specific styled versions of shared components
5. Never use arbitrary Tailwind hex values — extend tailwind.config.ts
6. FeatureCard must look identical on every page that uses it
7. Check at 390px width before considering any component done
