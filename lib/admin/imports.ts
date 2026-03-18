import { CsvMappedRow, ImportSnapshot } from '@/lib/admin/types';
import { getSupabaseServerClient } from '@/lib/supabase/server';

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
    team_name: row.team,
    initiative_name: row.initiative,
    art_name: row.art,
    platform_name: row.platform,
    source_system: row.sourceSystem,
  }));

  const storyRows = payload.rows.map((row) => ({
    import_snapshot_id: payload.snapshotId,
    planning_cycle_id: payload.planningCycleId,
    story_key: row.storyKey,
    story_title: row.storyTitle,
    feature_key: row.featureKey,
    sprint_name: row.sprint,
    status: row.status,
    commitment_status: row.commitmentStatus ?? null,
  }));

  const dependencyRows = payload.rows
    .filter((row) => row.dependsOnKey || row.dependencyType)
    .map((row) => ({
      import_snapshot_id: payload.snapshotId,
      planning_cycle_id: payload.planningCycleId,
      source_feature_key: row.featureKey,
      target_feature_key: row.dependsOnKey ?? null,
      dependency_type: row.dependencyType ?? null,
      dependency_owner: row.dependencyOwner ?? null,
      criticality: row.dependencyCriticality ?? null,
      target_sprint: row.dependencyTargetSprint ?? null,
      description: row.dependencyDescription ?? null,
    }));

  const { error: featuresError } = await supabase.from('snapshot_features').insert(featureRows);
  if (featuresError) return { error: featuresError.message };

  const { error: storiesError } = await supabase.from('snapshot_stories').insert(storyRows);
  if (storiesError) return { error: storiesError.message };

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

  const { data: snapshotFeatures } = await supabase
    .from('snapshot_features')
    .select('*')
    .in('import_snapshot_id', snapshotIds)
    .eq('planning_cycle_id', planningCycleId);

  const { data: snapshotStories } = await supabase
    .from('snapshot_stories')
    .select('*')
    .in('import_snapshot_id', snapshotIds)
    .eq('planning_cycle_id', planningCycleId);

  const { data: snapshotDependencies } = await supabase
    .from('snapshot_dependencies')
    .select('*')
    .in('import_snapshot_id', snapshotIds)
    .eq('planning_cycle_id', planningCycleId);

  if (snapshotFeatures?.length) {
    await supabase.from('features').insert(
      snapshotFeatures.map((row: Record<string, unknown>) => ({
        planning_cycle_id: planningCycleId,
        feature_key: row.feature_key,
        title: row.feature_title,
        source_system: row.source_system,
      })),
    );
  }

  if (snapshotStories?.length) {
    await supabase.from('stories').insert(
      snapshotStories.map((row: Record<string, unknown>) => ({
        planning_cycle_id: planningCycleId,
        story_key: row.story_key,
        title: row.story_title,
        feature_key: row.feature_key,
        status: row.status,
        sprint_name: row.sprint_name,
      })),
    );
  }

  if (snapshotDependencies?.length) {
    await supabase.from('dependencies').insert(
      snapshotDependencies.map((row: Record<string, unknown>) => ({
        planning_cycle_id: planningCycleId,
        source_feature_key: row.source_feature_key,
        target_feature_key: row.target_feature_key,
        dependency_type: row.dependency_type,
      })),
    );
  }

  return { error: null };
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
