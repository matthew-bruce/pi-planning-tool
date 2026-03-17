'use server';

import { revalidatePath } from 'next/cache';
import { CsvMappedRow, GeneratedSprintPreview, PlanningCycle } from '@/lib/admin/types';
import { createArt, updateArt } from '@/lib/admin/arts';
import { createImportActivityEvent, createImportSnapshot, insertSnapshotRows, rebuildLiveTablesFromSnapshots, rollbackLatestImport } from '@/lib/admin/imports';
import { createInitiative, updateInitiative } from '@/lib/admin/initiatives';
import { createPlanningCycleWithSprints, markCycleActive, updatePlanningCycle, updatePlanningCycleWithSprints } from '@/lib/admin/planningCycles';
import { createPlatform, updatePlatform } from '@/lib/admin/platforms';
import { createTeam, updateTeam, upsertTeamCycleParticipation } from '@/lib/admin/teams';

const ok = () => ({ ok: true as const });
const fail = (error: string) => ({ ok: false as const, error });

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
  sourceSystem: string;
  validRows: CsvMappedRow[];
  warningCount: number;
  totalRows: number;
  mode: 'valid-only' | 'continue';
}) {
  const snapshot = await createImportSnapshot({
    planning_cycle_id: payload.planningCycleId,
    file_name: payload.fileName,
    source_system: payload.sourceSystem,
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
