'use server';

import { revalidatePath } from 'next/cache';
import { CsvMappedRow, GeneratedSprintPreview, PlanningCycle } from '@/lib/admin/types';
import { createArt, reorderArts, updateArt } from '@/lib/admin/arts';
import { createImportActivityEvent, createImportSnapshot, insertSnapshotRows, rebuildLiveTablesFromSnapshots, rollbackLatestImport } from '@/lib/admin/imports';
import { createInitiative, updateInitiative } from '@/lib/admin/initiatives';
import { archivePlanningCycle, createPlanningCycleWithSprints, markCycleActive, updatePlanningCycle, updatePlanningCycleWithSprints } from '@/lib/admin/planningCycles';
import { createPlatform, updatePlatform } from '@/lib/admin/platforms';
import { createTeam, updateTeam, upsertTeamCycleParticipation } from '@/lib/admin/teams';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getStageById, type PlanningStageId } from '@/lib/planning/stages';

const ok = () => ({ ok: true as const });
const fail = (error: string) => ({ ok: false as const, error });

/**
 * Event type used for stage change rows in activity_events.
 *
 * There is no established past-tense convention in the table — the only
 * existing writer is `lib/admin/imports.ts` which uses `'import'` (noun,
 * lowercase). We default to `'stage_changed'` (past-tense, snake_case) per
 * the task spec. The Activity Feed panel already recognises the 'STAGE'
 * substring (see components/ActivityFeedPanel.tsx:getCategory).
 */
const STAGE_CHANGED_EVENT_TYPE = 'stage_changed';
const STAGE_REVERSAL_WINDOW_MS = 60_000;

export async function savePlanningCycleAction(payload: {
  cycle: Omit<PlanningCycle, 'id' | 'is_archived' | 'current_stage' | 'updated_at'>;
  sprints: GeneratedSprintPreview[];
}) {
  const result = await createPlanningCycleWithSprints(payload);
  if (result.error) return fail(result.error);
  revalidatePath('/admin');
  return ok();
}

export async function updatePlanningCycleAction(id: string, updates: Partial<PlanningCycle>) {
  const result = await updatePlanningCycle(id, updates);
  if (result.error) return fail(result.error);
  revalidatePath('/admin');
  return ok();
}

export async function updatePlanningCycleWithSprintsAction(payload: {
  id: string;
  cycle: {
    name: string;
    start_date: string;
    end_date: string;
    sprint_count: number;
    sprint_length_days: number;
  };
  sprints: GeneratedSprintPreview[];
}) {
  const result = await updatePlanningCycleWithSprints(payload);
  if (result.error) return fail(result.error);
  revalidatePath('/admin');
  return ok();
}

export async function archivePlanningCycleAction(id: string, isArchived: boolean) {
  const result = await archivePlanningCycle(id, isArchived);
  if (result.error) return fail(result.error);
  revalidatePath('/admin');
  return ok();
}

export async function markCycleActiveAction(cycleId: string) {
  const result = await markCycleActive(cycleId);
  if (result.error) return fail(result.error);
  revalidatePath('/admin');
  return ok();
}

export async function createPlatformAction(name: string) {
  const result = await createPlatform(name);
  if (result.error) return fail(result.error);
  revalidatePath('/admin');
  return ok();
}

export async function updatePlatformAction(id: string, updates: { name?: string; is_active?: boolean }) {
  const result = await updatePlatform(id, updates);
  if (result.error) return fail(result.error);
  revalidatePath('/admin');
  return ok();
}

export async function createArtAction(name: string) {
  const result = await createArt(name);
  if (result.error) return fail(result.error);
  revalidatePath('/admin');
  return ok();
}

export async function updateArtAction(id: string, updates: { name?: string; is_active?: boolean }) {
  const result = await updateArt(id, updates);
  if (result.error) return fail(result.error);
  revalidatePath('/admin');
  return ok();
}

export async function reorderArtsAction(orderedIds: string[]) {
  const result = await reorderArts(orderedIds);
  if (result.error) return fail(result.error);
  // No revalidatePath — optimistic update already applied client-side
  return ok();
}

export async function createTeamAction(payload: { name: string; platform_id: string | null }) {
  const result = await createTeam(payload);
  if (result.error) return fail(result.error);
  revalidatePath('/admin');
  return ok();
}

export async function updateTeamAction(id: string, updates: { name?: string; platform_id?: string | null; is_active?: boolean }) {
  const result = await updateTeam(id, updates);
  if (result.error) return fail(result.error);
  revalidatePath('/admin');
  return ok();
}

export async function setTeamParticipationAction(payload: {
  planning_cycle_id: string;
  team_id: string;
  is_participating: boolean;
}) {
  const result = await upsertTeamCycleParticipation(payload);
  if (result.error) return fail(result.error);
  revalidatePath('/admin');
  return ok();
}

export async function createInitiativeAction(payload: {
  name: string;
  art_id: string | null;
  planning_cycle_id: string | null;
  is_active: boolean;
}) {
  const result = await createInitiative(payload);
  if (result.error) return fail(result.error);
  revalidatePath('/admin');
  return ok();
}

export async function updateInitiativeAction(id: string, updates: { name?: string; art_id?: string | null; planning_cycle_id?: string | null; is_active?: boolean }) {
  const result = await updateInitiative(id, updates);
  if (result.error) return fail(result.error);
  revalidatePath('/admin');
  return ok();
}

export async function runImportAction(payload: {
  planningCycleId: string;
  fileName: string;
  validRows: CsvMappedRow[];
  warningCount: number;
  totalRows: number;
  mode: 'valid-only' | 'continue';
}) {
  const snapshot = await createImportSnapshot({
    planning_cycle_id: payload.planningCycleId,
    file_name: payload.fileName,
    source_system: 'CSV',
    row_count: payload.totalRows,
    status: 'imported',
  });

  if (snapshot.error || !snapshot.data) return fail(snapshot.error ?? 'Failed to create import snapshot.');

  const insert = await insertSnapshotRows({
    snapshotId: snapshot.data.id,
    planningCycleId: payload.planningCycleId,
    rows: payload.validRows,
  });

  if (insert.error) return fail(insert.error);

  const rebuild = await rebuildLiveTablesFromSnapshots(payload.planningCycleId);
  if (rebuild.error) return fail(rebuild.error);

  await createImportActivityEvent({
    planning_cycle_id: payload.planningCycleId,
    message: `Imported ${payload.validRows.length}/${payload.totalRows} rows from ${payload.fileName}`,
    metadata: { warningCount: payload.warningCount, mode: payload.mode },
  });

  revalidatePath('/admin');
  return ok();
}

export async function rollbackLatestImportAction(planningCycleId: string) {
  const result = await rollbackLatestImport(planningCycleId);
  if (result.error) return fail(result.error);
  revalidatePath('/admin');
  return ok();
}

// ─── Planning Stage ────────────────────────────────────────────────────────
//
// TODO: gate behind facilitator role when RBAC lands (P4).
//
// Writes `planning_cycles.current_stage` and emits a row into
// `activity_events` (event_type = 'stage_changed') so the room-level feed
// reflects the change in real time. There is no separate history table —
// the activity feed is the temporal record of stage transitions.
//
// The activity feed emission is reversal-aware: if the facilitator changes
// stage again within 60 seconds, the previous event row is deleted. If the
// new stage equals the `from_stage` of the deleted event, no replacement row
// is inserted — the net effect of the two clicks was nothing. Any other
// follow-up is treated as a correction and a fresh event is inserted.
export async function setProgramIncrementStage(
  cycleId: string,
  newStage: PlanningStageId,
) {
  const stageDef = getStageById(newStage);
  if (!stageDef) return fail(`Invalid stage id: ${newStage}`);

  const supabase = getSupabaseServerClient();

  // Step 1 — read current stage
  const { data: cycleRow, error: readError } = await supabase
    .from('planning_cycles')
    .select('id, current_stage')
    .eq('id', cycleId)
    .maybeSingle();

  if (readError) return fail(readError.message);
  if (!cycleRow) return fail('Program Increment not found.');

  const previousStage: number | null =
    (cycleRow.current_stage as number | null) ?? null;

  // Step 2 — idempotent no-op
  if (previousStage === newStage) return ok();

  // Step 3 — update planning_cycles.current_stage
  const { error: updateError } = await supabase
    .from('planning_cycles')
    .update({ current_stage: newStage })
    .eq('id', cycleId);

  if (updateError) return fail(updateError.message);

  // Step 4 — reversal-aware debounce of the activity feed emission.
  //
  // Look up the most recent stage_changed row for this cycle.
  let shouldInsertNewEvent = true;

  const { data: recentEvents, error: recentFetchError } = await supabase
    .from('activity_events')
    .select('id, created_at, metadata')
    .eq('planning_cycle_id', cycleId)
    .eq('event_type', STAGE_CHANGED_EVENT_TYPE)
    .order('created_at', { ascending: false })
    .limit(1);

  if (recentFetchError) {
    console.error(
      `[setProgramIncrementStage] Stage updated on ${cycleId} to ${newStage}, ` +
        `but failed to look up recent activity_events row: ${recentFetchError.message}`,
    );
  } else {
    const recent = (recentEvents ?? [])[0] as
      | { id: string; created_at: string; metadata: Record<string, unknown> | null }
      | undefined;

    if (recent) {
      const ageMs = Date.now() - new Date(recent.created_at).getTime();

      if (ageMs <= STAGE_REVERSAL_WINDOW_MS) {
        const meta = (recent.metadata ?? {}) as Record<string, unknown>;
        const recentFrom = (meta.from_stage as number | null | undefined) ?? null;

        // Delete the recent row — we're either reverting it or replacing it
        // with a corrected one.
        const { error: deleteError } = await supabase
          .from('activity_events')
          .delete()
          .eq('id', recent.id);

        if (deleteError) {
          console.error(
            `[setProgramIncrementStage] Stage updated on ${cycleId} to ${newStage}, ` +
              `but failed to delete superseded activity_events row ${recent.id}: ${deleteError.message}`,
          );
          // Fall through — still insert the new row below so the feed
          // reflects reality, even if there's now a dangling older row.
        } else if (newStage === recentFrom) {
          // Net effect is nothing — skip the insert. planning_cycles.current_stage
          // was already updated in step 3 to newStage, which equals recentFrom,
          // i.e. the state that existed before the just-deleted event. Correct.
          shouldInsertNewEvent = false;
        }
      }
    }
  }

  if (!shouldInsertNewEvent) {
    revalidatePath('/sorting-frame');
    revalidatePath('/team-planning');
    revalidatePath('/dependencies');
    revalidatePath('/dashboard');
    revalidatePath('/activity');
    return ok();
  }

  // Step 5 — insert a new stage_changed row.
  // Shape matches the existing activity_events writer in lib/admin/imports.ts:
  // planning_cycle_id + event_type + message + metadata (jsonb) + created_at.
  // The task spec calls the jsonb column "payload" — the actual column is
  // `metadata`, which we use to match the existing convention.
  const previousStageDef = getStageById(previousStage);
  const message = previousStageDef
    ? `Stage changed from "${previousStageDef.name}" to "${stageDef.name}"`
    : `Stage set to "${stageDef.name}"`;

  const { error: insertError } = await supabase.from('activity_events').insert({
    planning_cycle_id: cycleId,
    event_type: STAGE_CHANGED_EVENT_TYPE,
    message,
    metadata: {
      from_stage: previousStage,
      to_stage: newStage,
      stage_name: stageDef.name,
    },
    created_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error(
      `[setProgramIncrementStage] Stage updated on ${cycleId} to ${newStage}, ` +
        `but failed to insert activity_events row: ${insertError.message}`,
    );
    // Partial state is acceptable — the stage change is the source of truth,
    // the activity feed row is best-effort. Do NOT attempt to roll back the
    // planning_cycles update.
  }

  revalidatePath('/sorting-frame');
  revalidatePath('/team-planning');
  revalidatePath('/dependencies');
  revalidatePath('/dashboard');
  revalidatePath('/activity');
  return ok();
}
