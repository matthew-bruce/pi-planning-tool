# Dispatch Help Guide — Importing Planning Data

## Why importing matters — and why it's safer than you think

Importing data is how your team's planning work gets into Dispatch. Without it, the board is empty and the dashboard has nothing to show. It's the bridge between the work your teams are doing in Jira or Azure DevOps and the shared planning view that everyone sees during PI Planning.

**The most important thing to understand upfront:**

> Importing data into Dispatch **never touches your Jira or Azure DevOps data**. It is a one-way read. Dispatch takes a copy of your planning data and displays it. Your backlog, your stories, your sprints in ADO or Jira remain exactly as they were. Nothing in Dispatch can delete, edit or corrupt your source data.

If something goes wrong with an import — wrong file, wrong data, mismatched sprints — you can roll it back instantly from the Admin area. The previous state is restored in seconds. Nothing is permanent until you are happy with it.

---

## What you are importing

A CSV file exported from Jira or Azure DevOps (or prepared manually) containing your team's planning data for the current Program Increment. This includes:

- **Features** — the work items your team is committing to this PI
- **Stories** — the breakdown of work within each feature
- **Dependencies** — cross-team or cross-platform dependencies that need visibility
- **Sprint assignments** — which sprint each feature or story is planned for
- **Commitment status** — whether each item is Draft, Planned or Committed

The file must follow the Dispatch CSV format. See the CSV Format section below.

---

## When to import

| Moment | What to do |
|---|---|
| Before PI Planning starts | Import each team's initial snapshot — gives the board its starting state |
| During PI Planning (Team Breakouts) | Teams re-export from ADO/Jira as their plans evolve and re-import the updated file |
| After Draft Plan Review | Re-import if teams have made significant changes in their backlog tools |
| Any time data looks stale | Check import freshness on the Dashboard — if a team's data is >60 minutes old, ask them to re-export and re-import |

**There is no limit to how many times you can import.** Each import creates a new snapshot. The board always reflects the most recent active snapshot. You can roll back to any previous snapshot at any time.

---

## Where to import

`Admin → Data Import`

You must have Admin access to import data. Regular users cannot import — this is intentional. Imports are a controlled action that affects what everyone sees on the shared planning board.

---

## How to import — step by step

### Step 1 — Prepare your Program Increment

Before importing, make sure the correct Program Increment is active in Dispatch.

Go to `Admin → Program Increments` and confirm:
- The correct PI exists (e.g. `FY26 Q1`)
- It has sprints generated (e.g. Sprint 1 through Sprint 6)
- It is set as **Active**

If the PI doesn't exist yet, create it first. The sprint names in your CSV must match the sprint names in Dispatch exactly — this is the most common source of import warnings.

---

### Step 2 — Get your CSV file

Export your planning data from Jira or Azure DevOps using the Dispatch CSV template. The file should have these columns:

```
sourceSystem, art, initiative, team, platform, featureKey, featureTitle,
storyKey, storyTitle, sprint, status, commitmentStatus, dependencyType,
dependsOnKey, dependencyOwner, dependencyCriticality, dependencyTargetSprint,
dependencyDescription
```

**Tips for a clean export:**
- Make sure sprint names match exactly — `Sprint 1` not `Sprint 01` or `S1`
- Feature keys and story keys must be unique across the file
- Dependency rows reference the `featureKey` of the feature being depended on — make sure that feature exists in the same file or a previous import

---

### Step 3 — Go to Admin → Data Import

You will see:
- An upload area for your CSV file
- Import history showing previous snapshots
- Any active imports with their status

---

### Step 4 — Upload your file

Click **Choose file** or drag your CSV into the upload area.

Dispatch will immediately parse the file and show you:
- Row count detected
- Column mapping — confirm that each CSV column is mapped to the correct Dispatch field
- Any validation warnings (sprint mismatches, unknown teams, missing required fields)

**Do not proceed if you see red errors.** Warnings (amber) are informational — the import can proceed but some rows may be skipped or defaulted. Errors (red) mean the file has a problem that needs fixing before import.

---

### Step 5 — Review the column mapping

Dispatch will attempt to auto-map your CSV columns to its field names. Review this carefully:

| If you see... | Do this... |
|---|---|
| All columns mapped (green ticks) | Proceed |
| Some columns unmapped | Manually select the correct Dispatch field from the dropdown |
| A column mapped incorrectly | Click the dropdown and select the correct field |
| A column you don't recognise | It's safe to leave it unmapped — Dispatch will ignore unknown columns |

---

### Step 6 — Review validation results

Dispatch validates your data before importing. Common warnings:

**Sprint name mismatch**
> "Sprint 7 found in CSV but does not exist in FY26 Q1"

This means a sprint name in your file doesn't match any sprint in the active PI. Either:
- Fix the sprint name in your CSV and re-upload
- Or accept the warning — features with unmatched sprints will go to the Parking Lot

**Unknown team**
> "Team 'Helios' not found in Dispatch"

The team name in the CSV doesn't match any team in Dispatch. Either:
- Add the team in `Admin → Teams` first, then re-import
- Or accept — features from unknown teams will still import but won't appear in team swimlanes

**Missing required fields**
> "featureKey is missing on row 47"

A required field is blank on one or more rows. Fix the CSV and re-upload.

---

### Step 7 — Confirm and import

Once you are happy with the mapping and validation results, click **Import**.

Dispatch will:
1. Store the raw CSV rows as an immutable snapshot (your rollback point)
2. Rebuild the live planning tables from all active snapshots
3. Show you a success confirmation with row counts

The board will now reflect your imported data.

---

### Step 8 — Verify the import

After importing, check:

- **Sorting Frame** — do you see features appearing in sprint columns and the parking lot?
- **Dashboard** — do the KPI numbers reflect your import? Check "Teams with Fresh Data" and "Import Freshness"
- **Import history** — does your snapshot show the correct row count and status of `imported`?

If something looks wrong, do not re-import immediately. Use the rollback option first (see below).

---

## How to roll back an import

If an import produces unexpected results:

1. Go to `Admin → Data Import`
2. Find the import in the history list
3. Click **Roll back**
4. Dispatch marks that snapshot as `rolled_back` and rebuilds the live tables from the remaining active snapshots
5. The board reverts to its previous state

**Rollback is instant and safe.** The rolled-back snapshot is kept in history — you can see what was in it, but it no longer affects the live board. You can roll back and re-import as many times as needed.

---

## What happens when a team re-imports

When a team updates their plan in Jira or ADO and exports a new CSV, re-importing is safe:

- Dispatch creates a new snapshot for this import
- The live tables are rebuilt from all active (non-rolled-back) snapshots
- The board reflects the latest data
- Previous snapshots remain in history as an audit trail

**The most recent import for a team always takes precedence.** If a team imports at 10am and again at 2pm, the 2pm data is what appears on the board. The 10am snapshot is kept in history but does not affect the live view.

---

## CSV format reference

Minimum required columns:

| Column | Required | Description |
|---|---|---|
| `featureKey` | ✅ | Unique identifier for the feature (e.g. RM-1042) |
| `featureTitle` | ✅ | Feature name |
| `team` | ✅ | Team name — must match a team in Dispatch |
| `sprint` | ✅ | Sprint name — must match a sprint in the active PI |
| `commitmentStatus` | ✅ | `Draft`, `Planned` or `Committed` |
| `storyKey` | Optional | Unique identifier for a story |
| `storyTitle` | Optional | Story name |
| `initiative` | Optional | Initiative name |
| `art` | Optional | ART name |
| `platform` | Optional | Platform name |
| `dependencyType` | Optional | `Team`, `Platform`, `Infrastructure`, `Environment`, `Operations`, `External`, `Approval`, `ServiceNow` |
| `dependsOnKey` | Optional | The `featureKey` this item depends on |
| `dependencyOwner` | Optional | Who owns resolving this dependency |
| `dependencyCriticality` | Optional | `Low`, `Medium`, `High` |
| `status` | Optional | Workflow status from ADO/Jira (e.g. `In Progress`) |
| `sourceUrl` | Optional | URL to the ticket in ADO/Jira |

---

## Frequently asked questions

**Q: Will importing overwrite data that's already on the board?**
A: Yes — the board is rebuilt from all active snapshots after every import. If you import a new file for Team Helios, it replaces the previous Helios data on the live board. Other teams' data is unaffected.

**Q: Can I import data from multiple teams in one file?**
A: Yes. A single CSV can contain data for multiple teams. Dispatch will process all rows regardless of team.

**Q: What if two people import at the same time?**
A: Both imports will complete. The live board will reflect both. There is no conflict — imports are processed sequentially and each creates its own snapshot.

**Q: Can I import the same file twice?**
A: Yes, though it's unnecessary. The second import will create a duplicate snapshot with identical data. It won't cause errors but will add noise to the import history.

**Q: What happens to features that were in the previous import but not in the new one?**
A: If a feature doesn't appear in the new snapshot, it is removed from the live board when the tables are rebuilt. If you want to keep features from a previous import alongside new ones, keep both snapshots active (don't roll back the old one).

**Q: My sprint names don't match — what's the quickest fix?**
A: Either update the sprint names in your CSV to match Dispatch exactly, or go to `Admin → Program Increments` and check the sprint names that were generated. They are usually `Sprint 1`, `Sprint 2` etc. — simple numbered names work best.

**Q: I imported the wrong file. What do I do?**
A: Roll it back immediately from the import history. Takes about 5 seconds. Then import the correct file.

---

## Summary — the things to remember

1. **Importing never touches Jira or ADO.** It is read-only from your source systems.
2. **Every import is reversible.** Rollback is instant.
3. **Sprint names must match exactly.** This is the most common issue.
4. **The board always reflects the most recent active snapshots** — one per team, or one combined file.
5. **Re-importing is normal and expected** during PI Planning as teams update their plans.
6. **Check the Dashboard after importing** — Import Freshness confirms Dispatch has the latest data.
