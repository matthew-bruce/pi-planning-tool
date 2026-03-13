import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CycleReadinessSummary } from '@/lib/admin/types';

function formatFreshness(lastImportAt: string | null): string {
  if (!lastImportAt) return 'No imports yet';
  const now = Date.now();
  const then = new Date(lastImportAt).getTime();
  const diffHrs = Math.floor((now - then) / (1000 * 60 * 60));
  if (diffHrs < 1) return 'Updated <1h ago';
  if (diffHrs < 24) return `Updated ${diffHrs}h ago`;
  const days = Math.floor(diffHrs / 24);
  return `Updated ${days}d ago`;
}

export async function getCycleReadinessSummaries(): Promise<CycleReadinessSummary[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const [
    { data: cycles },
    { data: sprints },
    { data: teams },
    { data: participation },
    { data: initiatives },
    { data: imports },
    { data: snapshotFeatures },
    { data: snapshotStories },
  ] = await Promise.all([
    supabase.from('planning_cycles').select('*').order('start_date', { ascending: false }),
    supabase.from('sprints').select('id,planning_cycle_id,name'),
    supabase.from('teams').select('id,name,is_active'),
    supabase.from('team_cycle_participation').select('planning_cycle_id,team_id,is_participating'),
    supabase.from('initiatives').select('planning_cycle_id,name,is_active'),
    supabase.from('import_snapshots').select('id,planning_cycle_id,status,imported_at'),
    supabase.from('snapshot_features').select('planning_cycle_id,import_snapshot_id,team_name,initiative_name'),
    supabase.from('snapshot_stories').select('planning_cycle_id,import_snapshot_id,sprint_name'),
  ]);

  const cycleRows = cycles ?? [];
  const sprintRows = sprints ?? [];
  const teamRows = teams ?? [];
  const participationRows = participation ?? [];
  const initiativeRows = initiatives ?? [];
  const importRows = imports ?? [];
  const featureRows = snapshotFeatures ?? [];
  const storyRows = snapshotStories ?? [];

  const activeTeamCount = teamRows.filter((team) => team.is_active).length;

  return cycleRows.map((cycle) => {
    const cycleSprints = sprintRows.filter((sprint) => sprint.planning_cycle_id === cycle.id);
    const cycleSprintNameSet = new Set(cycleSprints.map((sprint) => sprint.name));

    const cycleParticipation = participationRows.filter(
      (row) => row.planning_cycle_id === cycle.id && row.is_participating,
    );

    const participatingTeamIds = new Set(cycleParticipation.map((row) => row.team_id));
    const participatingTeams = teamRows.filter((team) => participatingTeamIds.has(team.id));

    const cycleInitiatives = initiativeRows.filter(
      (initiative) => initiative.planning_cycle_id === cycle.id && initiative.is_active,
    );

    const cycleImports = importRows.filter((item) => item.planning_cycle_id === cycle.id);
    const importedSnapshots = cycleImports.filter((item) => item.status === 'imported');
    const importedSnapshotIdSet = new Set(importedSnapshots.map((row) => row.id));

    const cycleFeatureRows = featureRows.filter(
      (row) => row.planning_cycle_id === cycle.id && importedSnapshotIdSet.has(row.import_snapshot_id),
    );

    const cycleStoryRows = storyRows.filter(
      (row) => row.planning_cycle_id === cycle.id && importedSnapshotIdSet.has(row.import_snapshot_id),
    );

    const teamsWithImports = new Set(cycleFeatureRows.map((row) => row.team_name).filter(Boolean));

    const teamsWithoutImports = participatingTeams
      .filter((team) => !teamsWithImports.has(team.name))
      .map((team) => team.name);

    const sprintMismatchCount = cycleStoryRows.filter((row) => row.sprint_name && !cycleSprintNameSet.has(row.sprint_name)).length;

    const initiativesWithImportedRows = new Set(
      cycleFeatureRows.map((row) => row.initiative_name).filter(Boolean),
    );

    const initiativesWithoutParticipation = cycleInitiatives
      .filter((initiative) => !initiativesWithImportedRows.has(initiative.name))
      .map((initiative) => initiative.name);

    const latestImport = importedSnapshots
      .map((row) => row.imported_at)
      .sort((a, b) => (a < b ? 1 : -1))[0] ?? null;

    const attentionItems: string[] = [];
    if (teamsWithoutImports.length) {
      attentionItems.push(`Participating teams with no import snapshots: ${teamsWithoutImports.join(', ')}`);
    }
    if (sprintMismatchCount > 0) {
      attentionItems.push(`Imports contain ${sprintMismatchCount} sprint mismatch row(s) against configured cycle sprints.`);
    }
    if (initiativesWithoutParticipation.length) {
      attentionItems.push(`Active initiatives with no imported participation: ${initiativesWithoutParticipation.join(', ')}`);
    }

    const readinessStatus =
      !cycle.is_active
        ? 'Not Active'
        : attentionItems.length === 0
          ? 'Ready'
          : attentionItems.length <= 2
            ? 'At Risk'
            : 'Needs Attention';

    return {
      cycleId: cycle.id,
      cycleName: cycle.name,
      cycleStartDate: cycle.start_date,
      cycleEndDate: cycle.end_date,
      isActiveCycle: Boolean(cycle.is_active),
      configuredSprintCount: cycleSprints.length,
      participatingTeamsCount: participatingTeams.length,
      totalActiveTeamsCount: activeTeamCount,
      activeInitiativesCount: cycleInitiatives.length,
      importCount: cycleImports.length,
      freshnessSummary: formatFreshness(latestImport),
      readinessStatus,
      attentionItems,
    } as CycleReadinessSummary;
  });
}
