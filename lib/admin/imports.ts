import { SupabaseClient } from '@supabase/supabase-js';
import { CsvMappedRow, ImportSnapshot } from '@/lib/admin/types';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { buildValueStreamResolutionPlan, ValueStreamSnapshotRow } from '@/lib/admin/importHelpers';

export type { ValueStreamSnapshotRow, ValueStreamResolutionPlan } from '@/lib/admin/importHelpers';
export { buildValueStreamResolutionPlan } from '@/lib/admin/importHelpers';

export async function listImportSnapshots(planningCycleId?: string): Promise<ImportSnapshot[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  let query = supabase.from('import_snapshots').select('*').order('imported_at', { ascending: false });
  if (planningCycleId) query = query.eq('planning_cycle_id', planningCycleId);

  const { data } = await query;
  return (data ?? []) as ImportSnapshot[];
}

export async function createImportSnapshot(payload: {
  planning_cycle_id: string;
  file_name: string;
  source_system: string;
  row_count: number;
  status: string;
}) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { error: 'Supabase is not configured.' };

  const { data, error } = await supabase.from('import_snapshots').insert(payload).select('*').single();
  if (error) return { error: error.message };
  return { data: data as ImportSnapshot };
}

export async function insertSnapshotRows(payload: {
  snapshotId: string;
  planningCycleId: string;
  rows: CsvMappedRow[];
}) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { error: 'Supabase is not configured.' };

  const featureRows = payload.rows.map((row) => ({
    import_snapshot_id: payload.snapshotId,
    planning_cycle_id: payload.planningCycleId,
    feature_key: row.featureKey,
    feature_title: row.featureTitle,
    team_name: row.team || null,
    initiative_name: row.initiative || null,
    art_name: row.art || null,
    platform_name: row.platform || null,
    sprint_name: row.sprint || null,
    status: row.status || null,
    commitment_status: row.commitmentStatus || null,
    source_system: 'CSV',
  }));

  // Only insert story rows where a story key is present (feature-only rows have no story data)
  const storyRows = payload.rows
    .filter((row) => row.storyKey)
    .map((row) => ({
      import_snapshot_id: payload.snapshotId,
      planning_cycle_id: payload.planningCycleId,
      story_key: row.storyKey,
      story_title: row.storyTitle || row.storyKey,
      feature_key: row.featureKey || null,
      feature_title: row.featureTitle || null,
      team_name: row.team || null,
      initiative_name: row.initiative || null,
      art_name: row.art || null,
      platform_name: row.platform || null,
      sprint_name: row.sprint || null,
      status: row.status || null,
      commitment_status: row.commitmentStatus || null,
      source_system: 'CSV',
    }));

  // Only insert dependency rows where both the source key and type are present (both NOT NULL in schema)
  const dependencyRows = payload.rows
    .filter((row) => row.dependsOnKey && row.dependencyType)
    .map((row) => ({
      import_snapshot_id: payload.snapshotId,
      planning_cycle_id: payload.planningCycleId,
      source_ticket_key: row.featureKey,
      target_ticket_key: row.dependsOnKey,
      dependency_type: row.dependencyType,
      dependency_owner: row.dependencyOwner || null,
      dependency_criticality: row.dependencyCriticality || null,
      dependency_target_sprint: row.dependencyTargetSprint || null,
      dependency_description: row.dependencyDescription || null,
    }));

  const { error: featuresError } = await supabase.from('snapshot_features').insert(featureRows);
  if (featuresError) return { error: featuresError.message };

  if (storyRows.length) {
    const { error: storiesError } = await supabase.from('snapshot_stories').insert(storyRows);
    if (storiesError) return { error: storiesError.message };
  }

  if (dependencyRows.length) {
    const { error: dependenciesError } = await supabase.from('snapshot_dependencies').insert(dependencyRows);
    if (dependenciesError) return { error: dependenciesError.message };
  }

  return { error: null };
}

export async function createImportActivityEvent(payload: { planning_cycle_id: string; message: string; metadata?: Record<string, unknown> }) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { error: 'Supabase is not configured.' };

  const { error } = await supabase.from('activity_events').insert({
    planning_cycle_id: payload.planning_cycle_id,
    event_type: 'import',
    message: payload.message,
    metadata: payload.metadata ?? {},
    created_at: new Date().toISOString(),
  });

  return { error: error?.message };
}

export async function rebuildLiveTablesFromSnapshots(planningCycleId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { error: 'Supabase is not configured.' };

  // Pragmatic PoC rebuild: clear existing live tables for cycle, then rebuild from imported snapshots.
  // TODO: Replace with deterministic merge/upsert strategy preserving manual edits.
  await supabase.from('dependencies').delete().eq('planning_cycle_id', planningCycleId);
  await supabase.from('stories').delete().eq('planning_cycle_id', planningCycleId);
  await supabase.from('features').delete().eq('planning_cycle_id', planningCycleId);

  const { data: snapshots, error: snapshotsError } = await supabase
    .from('import_snapshots')
    .select('id')
    .eq('planning_cycle_id', planningCycleId)
    .eq('status', 'imported');

  if (snapshotsError) return { error: snapshotsError.message };

  const snapshotIds = (snapshots ?? []).map((item) => item.id);
  if (!snapshotIds.length) return { error: null };

  const { data: rawSnapshotFeatures, error: sfFetchError } = await supabase
    .from('snapshot_features')
    .select('*')
    .in('import_snapshot_id', snapshotIds)
    .eq('planning_cycle_id', planningCycleId);

  if (sfFetchError) return { error: sfFetchError.message };

  const { data: rawSnapshotStories, error: ssFetchError } = await supabase
    .from('snapshot_stories')
    .select('*')
    .in('import_snapshot_id', snapshotIds)
    .eq('planning_cycle_id', planningCycleId);

  if (ssFetchError) return { error: ssFetchError.message };

  const { data: snapshotDependencies, error: sdFetchError } = await supabase
    .from('snapshot_dependencies')
    .select('*')
    .in('import_snapshot_id', snapshotIds)
    .eq('planning_cycle_id', planningCycleId);

  if (sdFetchError) return { error: sdFetchError.message };

  // Deduplicate features by feature_key before inserting into the live table.
  //
  // Root cause of the silent empty-table bug: a typical CSV has one row per story,
  // with feature data repeated on every story row. snapshot_features therefore
  // contains many rows with the same feature_key. The live features table has
  // UNIQUE (planning_cycle_id, ticket_key), so inserting duplicates fails the
  // entire batch — and since errors were not checked, the failure was invisible.
  // First occurrence wins.
  const seenFeatureKeys = new Set<string>();
  const snapshotFeatures = (rawSnapshotFeatures ?? []).filter((row) => {
    const key = row.feature_key as string;
    if (seenFeatureKeys.has(key)) return false;
    seenFeatureKeys.add(key);
    return true;
  });

  // Deduplicate stories by story_key for the same reason.
  const seenStoryKeys = new Set<string>();
  const snapshotStories = (rawSnapshotStories ?? []).filter((row) => {
    const key = row.story_key as string;
    if (!key) return false;
    if (seenStoryKeys.has(key)) return false;
    seenStoryKeys.add(key);
    return true;
  });

  // ---- Insert features ----
  if (snapshotFeatures.length) {
    const { error: featuresInsertError } = await supabase.from('features').insert(
      snapshotFeatures.map((row: Record<string, unknown>) => ({
        planning_cycle_id: planningCycleId,
        ticket_key: row.feature_key,
        title: row.feature_title,
        source_system: row.source_system ?? 'CSV',
      })),
    );
    if (featuresInsertError) return { error: `features insert failed: ${featuresInsertError.message}` };
  }

  // ---- Insert stories ----
  if (snapshotStories.length) {
    const { error: storiesInsertError } = await supabase.from('stories').insert(
      snapshotStories.map((row: Record<string, unknown>) => ({
        planning_cycle_id: planningCycleId,
        ticket_key: row.story_key,
        title: row.story_title,
        status: row.status,
        source_system: row.source_system ?? 'CSV',
        // feature_id and sprint_id require UUID lookups — resolved in a future phase
      })),
    );
    if (storiesInsertError) return { error: `stories insert failed: ${storiesInsertError.message}` };
  }

  // ---- Insert dependencies ----
  if (snapshotDependencies?.length) {
    const { error: dependenciesInsertError } = await supabase.from('dependencies').insert(
      snapshotDependencies.map((row: Record<string, unknown>) => ({
        planning_cycle_id: planningCycleId,
        source_ticket_key: row.source_ticket_key,
        target_ticket_key: row.target_ticket_key,
        dependency_type: row.dependency_type,
        dependency_owner: row.dependency_owner,
        dependency_criticality: row.dependency_criticality,
        dependency_target_sprint: row.dependency_target_sprint,
        dependency_description: row.dependency_description,
      })),
    );
    if (dependenciesInsertError) return { error: `dependencies insert failed: ${dependenciesInsertError.message}` };
  }

  // ---- Auto-create value streams (initiatives) and teams, link to features ----
  const resolveError = await resolveValueStreamsAndTeams(supabase, planningCycleId, snapshotFeatures);
  if (resolveError) return { error: resolveError };

  return { error: null };
}

/**
 * After features are inserted into the live table, resolve value streams
 * (initiatives) and teams from snapshot data — creating missing ones — then
 * update features.initiative_id and features.team_id.
 */
async function resolveValueStreamsAndTeams(
  supabase: SupabaseClient,
  planningCycleId: string,
  snapshotFeatures: Record<string, unknown>[],
): Promise<string | null> {
  // ---- Value streams (initiatives) ----

  const { data: arts } = await supabase.from('arts').select('id, name');
  const { data: existingInitiatives } = await supabase
    .from('initiatives')
    .select('id, name')
    .eq('planning_cycle_id', planningCycleId);

  const snapshotRowsForPlan: ValueStreamSnapshotRow[] = snapshotFeatures.map((row) => ({
    feature_key: row.feature_key as string,
    initiative_name: (row.initiative_name as string) || null,
    art_name: (row.art_name as string) || null,
  }));

  const plan = buildValueStreamResolutionPlan({
    snapshotRows: snapshotRowsForPlan,
    existingInitiatives: (existingInitiatives ?? []) as Array<{ id: string; name: string }>,
    arts: (arts ?? []) as Array<{ id: string; name: string }>,
    planningCycleId,
  });

  // Build a mutable lookup of initiative_name → id, seeded with existing initiatives
  const initiativeIdByName = new Map(
    (existingInitiatives ?? []).map((i: Record<string, unknown>) => [i.name as string, i.id as string]),
  );

  // Create missing value streams
  for (const payload of plan.toCreate) {
    const { data: created, error } = await supabase.from('initiatives').insert(payload).select('id, name').single();
    if (error) {
      // Tolerate race conditions — fetch the existing row instead
      const { data: existing } = await supabase
        .from('initiatives')
        .select('id')
        .eq('name', payload.name)
        .eq('planning_cycle_id', planningCycleId)
        .maybeSingle();
      if (existing) initiativeIdByName.set(payload.name, existing.id as string);
    } else if (created) {
      initiativeIdByName.set(created.name as string, created.id as string);
    }
  }

  // Update features.initiative_id
  for (const [initiativeName, featureKeys] of plan.initiativeNameToFeatureKeys) {
    const initiativeId = initiativeIdByName.get(initiativeName);
    if (!initiativeId || !featureKeys.length) continue;
    await supabase
      .from('features')
      .update({ initiative_id: initiativeId })
      .eq('planning_cycle_id', planningCycleId)
      .in('ticket_key', featureKeys);
  }

  // ---- Teams ----

  const { data: existingTeams } = await supabase.from('teams').select('id, name');
  const teamIdByName = new Map(
    (existingTeams ?? []).map((t: Record<string, unknown>) => [t.name as string, t.id as string]),
  );

  const { data: existingParticipation } = await supabase
    .from('team_cycle_participation')
    .select('team_id')
    .eq('planning_cycle_id', planningCycleId);
  const participatingTeamIds = new Set(
    (existingParticipation ?? []).map((r: Record<string, unknown>) => r.team_id as string),
  );

  // Collect unique team_name → feature_keys from the deduplicated snapshot features
  const teamNameToFeatureKeys = new Map<string, string[]>();
  for (const row of snapshotFeatures) {
    const teamName = row.team_name as string | null;
    const featureKey = row.feature_key as string;
    if (!teamName) continue;
    const keys = teamNameToFeatureKeys.get(teamName) ?? [];
    keys.push(featureKey);
    teamNameToFeatureKeys.set(teamName, keys);
  }

  for (const [teamName, featureKeys] of teamNameToFeatureKeys) {
    let teamId = teamIdByName.get(teamName);

    if (!teamId) {
      // Team does not exist — create it (platform_id nullable, assigned manually by Admin later)
      const { data: newTeam, error: createTeamError } = await supabase
        .from('teams')
        .insert({ name: teamName, platform_id: null, is_active: true })
        .select('id')
        .single();
      if (createTeamError || !newTeam) continue;
      teamId = newTeam.id as string;
      teamIdByName.set(teamName, teamId);
    }

    // Ensure the team is marked as participating in this PI
    if (!participatingTeamIds.has(teamId)) {
      await supabase
        .from('team_cycle_participation')
        .upsert(
          { planning_cycle_id: planningCycleId, team_id: teamId, is_participating: true },
          { onConflict: 'planning_cycle_id,team_id' },
        );
      participatingTeamIds.add(teamId);
    }

    // Update features.team_id
    if (featureKeys.length) {
      await supabase
        .from('features')
        .update({ team_id: teamId })
        .eq('planning_cycle_id', planningCycleId)
        .in('ticket_key', featureKeys);
    }
  }

  return null;
}

export async function rollbackLatestImport(planningCycleId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { error: 'Supabase is not configured.' };

  const { data: latest, error: latestError } = await supabase
    .from('import_snapshots')
    .select('*')
    .eq('planning_cycle_id', planningCycleId)
    .eq('status', 'imported')
    .order('imported_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) return { error: latestError.message };
  if (!latest) return { error: 'No imported snapshot found for this cycle.' };

  const { error: updateError } = await supabase.from('import_snapshots').update({ status: 'rolled_back' }).eq('id', latest.id);
  if (updateError) return { error: updateError.message };

  const rebuild = await rebuildLiveTablesFromSnapshots(planningCycleId);
  if (rebuild.error) return { error: rebuild.error };

  await createImportActivityEvent({
    planning_cycle_id: planningCycleId,
    message: `Rollback executed for snapshot ${latest.file_name}`,
    metadata: { snapshot_id: latest.id },
  });

  return { error: null };
}
