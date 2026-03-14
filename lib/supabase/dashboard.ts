import type { DashboardData } from '@/lib/types/dashboard';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatSprintRange } from '@/lib/utils';

type Cycle = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

type Art = { id: string; name: string; is_active: boolean };

type Initiative = {
  id: string;
  name: string;
  planning_cycle_id: string | null;
  art_id: string | null;
  is_active: boolean;
};

type Participation = {
  planning_cycle_id: string;
  team_id: string;
  is_participating: boolean;
};

type Team = { id: string; name: string; is_active: boolean };

type Sprint = {
  id: string;
  planning_cycle_id: string;
  sprint_number: number;
  name: string;
  start_date: string;
  end_date: string;
};

type Feature = {
  id: string;
  planning_cycle_id: string;
  initiative_id: string | null;
  team_id: string | null;
  sprint_id: string | null;
  commitment_status: string | null;
  status: string | null;
};

type Story = {
  id: string;
  planning_cycle_id: string;
  feature_id: string | null;
  sprint_id?: string | null;
  sprint_name?: string | null;
  commitment_status?: string | null;
};

type Dependency = {
  id: string;
  planning_cycle_id: string;
  source_feature_id?: string | null;
  target_feature_id?: string | null;
  dependency_type: string | null;
  dependency_criticality: string | null;
  dependency_owner: string | null;
};

type ImportSnapshot = {
  id: string;
  planning_cycle_id: string;
  imported_at: string;
  status: string;
  created_at?: string;
  source_system?: string;
  file_name?: string;
};

type SnapshotFeature = {
  import_snapshot_id: string;
  planning_cycle_id: string;
  team_name: string | null;
};

type Activity = {
  id: string;
  planning_cycle_id: string;
  event_type: string;
  message: string;
  created_at: string;
};

function parseStatus(
  value: string | null | undefined
): 'draft' | 'planned' | 'committed' {
  const v = (value ?? '').toLowerCase();
  if (v === 'committed') return 'committed';
  if (v === 'planned') return 'planned';
  return 'draft';
}

function toConvergenceScore(status: string | null | undefined): number {
  const normalized = parseStatus(status);
  if (normalized === 'committed') return 1;
  if (normalized === 'planned') return 0.6;
  return 0.2;
}

function freshnessOf(latestImportAt: string | null): 'Fresh' | 'Stale' | 'Missing' {
  if (!latestImportAt) return 'Missing';
  const ms = Date.now() - new Date(latestImportAt).getTime();
  return ms <= 60 * 60 * 1000 ? 'Fresh' : 'Stale';
}

export async function getActiveOrSelectedPlanningCycle(
  selectedCycleId?: string
): Promise<Cycle | null> {
  const supabase = getSupabaseServerClient();

  if (selectedCycleId) {
    const { data } = await supabase
      .from('planning_cycles')
      .select('id,name,start_date,end_date,is_active')
      .eq('id', selectedCycleId)
      .maybeSingle();

    if (data) return data as Cycle;
  }

  const { data: active } = await supabase
    .from('planning_cycles')
    .select('id,name,start_date,end_date,is_active')
    .eq('is_active', true)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (active) return active as Cycle;

  const { data: latest } = await supabase
    .from('planning_cycles')
    .select('id,name,start_date,end_date,is_active')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (latest as Cycle | null) ?? null;
}

export async function getDashboardSummary(
  cycleId: string,
  selectedArtId?: string | null
) {
  const supabase = getSupabaseServerClient();

  const [
    { data: initiatives },
    { data: participations },
    { data: features },
    { data: stories },
    { data: dependencies },
    { data: imports },
    { data: snapshotFeatures },
  ] = await Promise.all([
    supabase
      .from('initiatives')
      .select('id,planning_cycle_id,art_id,is_active')
      .eq('planning_cycle_id', cycleId),
    supabase
      .from('team_cycle_participation')
      .select('planning_cycle_id,team_id,is_participating')
      .eq('planning_cycle_id', cycleId),
    supabase
      .from('features')
      .select('id,planning_cycle_id,initiative_id')
      .eq('planning_cycle_id', cycleId),
    supabase
      .from('stories')
      .select('id,planning_cycle_id,feature_id')
      .eq('planning_cycle_id', cycleId),
    supabase
      .from('dependencies')
      .select(
        'id,planning_cycle_id,source_feature_id,target_feature_id,dependency_criticality'
      )
      .eq('planning_cycle_id', cycleId),
    supabase
      .from('import_snapshots')
      .select('id,planning_cycle_id,imported_at,status')
      .eq('planning_cycle_id', cycleId),
    supabase
      .from('snapshot_features')
      .select('planning_cycle_id,import_snapshot_id,team_name')
      .eq('planning_cycle_id', cycleId),
  ]);

  const initiativeRows = (initiatives ?? []) as Initiative[];
  const featureRows = (features ?? []) as Feature[];

  const filteredInitiatives = selectedArtId
    ? initiativeRows.filter((row) => row.art_id === selectedArtId)
    : initiativeRows;

  const filteredInitiativeIds = new Set(
    filteredInitiatives.map((item) => item.id)
  );

  const filteredFeatures = selectedArtId
    ? featureRows.filter(
        (feature) =>
          !!feature.initiative_id && filteredInitiativeIds.has(feature.initiative_id)
      )
    : featureRows;

  const filteredFeatureIdSet = new Set(filteredFeatures.map((item) => item.id));

  const filteredDependencies = selectedArtId
    ? ((dependencies ?? []) as Dependency[]).filter(
        (dep) =>
          (!!dep.source_feature_id &&
            filteredFeatureIdSet.has(dep.source_feature_id)) ||
          (!!dep.target_feature_id &&
            filteredFeatureIdSet.has(dep.target_feature_id))
      )
    : ((dependencies ?? []) as Dependency[]);

  const importRows = (imports ?? []) as ImportSnapshot[];
  const importsToday = importRows.filter((snapshot) => {
    const imported = new Date(snapshot.imported_at);
    const today = new Date();
    return (
      imported.getFullYear() === today.getFullYear() &&
      imported.getMonth() === today.getMonth() &&
      imported.getDate() === today.getDate()
    );
  }).length;

  const storyRows = (stories ?? []) as Story[];
  const filteredStories = selectedArtId
    ? storyRows.filter((story) =>
        story.feature_id ? filteredFeatureIdSet.has(story.feature_id) : false
      )
    : storyRows;

  const importedSnapshotById = new Map(
    importRows
      .filter((row) => row.status === 'imported')
      .map((row) => [row.id, row.imported_at] as const)
  );

  const latestImportByTeam = new Map<string, string>();
  ((snapshotFeatures ?? []) as SnapshotFeature[]).forEach((row) => {
    if (!row.team_name) return;
    const importedAt = importedSnapshotById.get(row.import_snapshot_id);
    if (!importedAt) return;
    const prev = latestImportByTeam.get(row.team_name);
    if (!prev || prev < importedAt) {
      latestImportByTeam.set(row.team_name, importedAt);
    }
  });

  const teamsWithFreshData = [...latestImportByTeam.values()].filter(
    (value) => Date.now() - new Date(value).getTime() <= 60 * 60 * 1000
  ).length;

  return {
    totalFeatures: filteredFeatures.length,
    totalStories: filteredStories.length,
    participatingTeams: ((participations ?? []) as Participation[]).filter(
      (row) => row.is_participating
    ).length,
    activeInitiatives: filteredInitiatives.filter((row) => row.is_active).length,
    totalDependencies: filteredDependencies.length,
    highCriticalityDependencies: filteredDependencies.filter(
      (dep) => (dep.dependency_criticality ?? '').toLowerCase() === 'high'
    ).length,
    importsToday,
    teamsWithFreshData,
  };
}

export async function getArtStatusTiles(
  cycleId: string,
  selectedArtId?: string | null
) {
  const supabase = getSupabaseServerClient();

  const [
    { data: arts },
    { data: initiatives },
    { data: features },
    { data: dependencies },
  ] = await Promise.all([
    supabase
      .from('arts')
      .select('id,name,is_active')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('initiatives')
      .select('id,name,planning_cycle_id,art_id,is_active')
      .eq('planning_cycle_id', cycleId)
      .eq('is_active', true),
    supabase
      .from('features')
      .select('id,planning_cycle_id,initiative_id,team_id,commitment_status,status')
      .eq('planning_cycle_id', cycleId),
    supabase
      .from('dependencies')
      .select(
        'id,planning_cycle_id,source_feature_id,target_feature_id,dependency_criticality'
      )
      .eq('planning_cycle_id', cycleId),
  ]);

  const activeArts = ((arts ?? []) as Art[]).filter(
    (art) => !selectedArtId || art.id === selectedArtId
  );
  const initiativeRows = (initiatives ?? []) as Initiative[];
  const featureRows = (features ?? []) as Feature[];
  const dependencyRows = (dependencies ?? []) as Dependency[];

  return activeArts.map((art) => {
    const artInitiatives = initiativeRows.filter(
      (initiative) => initiative.art_id === art.id
    );
    const artInitiativeIds = new Set(
      artInitiatives.map((initiative) => initiative.id)
    );
    const artFeatures = featureRows.filter(
      (feature) =>
        !!feature.initiative_id && artInitiativeIds.has(feature.initiative_id)
    );
    const artFeatureIds = new Set(artFeatures.map((feature) => feature.id));
    const artDependencies = dependencyRows.filter(
      (dep) =>
        (!!dep.source_feature_id && artFeatureIds.has(dep.source_feature_id)) ||
        (!!dep.target_feature_id && artFeatureIds.has(dep.target_feature_id))
    );

    const weighted = artFeatures.reduce(
      (sum, feature) => sum + toConvergenceScore(feature.commitment_status),
      0
    );
    const convergencePct = artFeatures.length
      ? Math.round((weighted / artFeatures.length) * 100)
      : 0;

    return {
      artId: art.id,
      artName: art.name,
      initiatives: artInitiatives.length,
      teamsContributing: new Set(
        artFeatures.map((feature) => feature.team_id).filter(Boolean)
      ).size,
      features: artFeatures.length,
      dependencies: artDependencies.length,
      unresolvedHighDependencies: artDependencies.filter(
        (dep) => (dep.dependency_criticality ?? '').toLowerCase() === 'high'
      ).length,
      convergencePct,
    };
  });
}

export async function getSprintDistribution(
  cycleId: string,
  selectedArtId?: string | null
) {
  const supabase = getSupabaseServerClient();

  const [
    { data: sprints },
    { data: features },
    { data: stories },
    { data: initiatives },
  ] = await Promise.all([
    supabase
      .from('sprints')
      .select('id,planning_cycle_id,sprint_number,name,start_date,end_date')
      .eq('planning_cycle_id', cycleId)
      .order('sprint_number', { ascending: true }),
    supabase
      .from('features')
      .select('id,planning_cycle_id,sprint_id,initiative_id')
      .eq('planning_cycle_id', cycleId),
    supabase
      .from('stories')
      .select('id,planning_cycle_id,sprint_id,sprint_name,feature_id')
      .eq('planning_cycle_id', cycleId),
    supabase
      .from('initiatives')
      .select('id,art_id,planning_cycle_id')
      .eq('planning_cycle_id', cycleId),
  ]);

  const initiativeIds = !selectedArtId
    ? null
    : new Set(
        ((initiatives ?? []) as Initiative[])
          .filter((item) => item.art_id === selectedArtId)
          .map((item) => item.id)
      );

  const scopedFeatureIds = new Set(
    ((features ?? []) as Feature[])
      .filter((feature) =>
        initiativeIds
          ? !!feature.initiative_id && initiativeIds.has(feature.initiative_id)
          : true
      )
      .map((feature) => feature.id)
  );

  const featureBySprint = new Map<string, number>();
  ((features ?? []) as Feature[])
    .filter((feature) => scopedFeatureIds.has(feature.id))
    .forEach((feature) => {
      if (!feature.sprint_id) return;
      featureBySprint.set(
        feature.sprint_id,
        (featureBySprint.get(feature.sprint_id) ?? 0) + 1
      );
    });

  const storyBySprintKey = new Map<string, number>();
  ((stories ?? []) as Story[])
    .filter((story) =>
      !selectedArtId
        ? true
        : story.feature_id
          ? scopedFeatureIds.has(story.feature_id)
          : true
    )
    .forEach((story) => {
      const key = story.sprint_id ?? story.sprint_name ?? 'Unassigned';
      storyBySprintKey.set(key, (storyBySprintKey.get(key) ?? 0) + 1);
    });

  return ((sprints ?? []) as Sprint[]).map((sprint) => ({
    sprintId: sprint.id,
    sprintName: sprint.name,
    dateRange: formatSprintRange(sprint.start_date, sprint.end_date),
    featureCount: featureBySprint.get(sprint.id) ?? 0,
    storyCount:
      (storyBySprintKey.get(sprint.id) ?? 0) +
      (storyBySprintKey.get(sprint.name) ?? 0),
  }));
}

export async function getDependencyOverview(
  cycleId: string,
  selectedArtId?: string | null
) {
  const supabase = getSupabaseServerClient();

  const [
    { data: dependencies },
    { data: initiatives },
    { data: features },
  ] = await Promise.all([
    supabase
      .from('dependencies')
      .select(
        'id,planning_cycle_id,source_feature_id,target_feature_id,dependency_type,dependency_criticality,dependency_owner'
      )
      .eq('planning_cycle_id', cycleId),
    supabase
      .from('initiatives')
      .select('id,art_id,planning_cycle_id')
      .eq('planning_cycle_id', cycleId),
    supabase
      .from('features')
      .select('id,initiative_id,planning_cycle_id')
      .eq('planning_cycle_id', cycleId),
  ]);

  let dependencyRows = (dependencies ?? []) as Dependency[];

  if (selectedArtId) {
    const scopedInitiatives = new Set(
      ((initiatives ?? []) as Initiative[])
        .filter((i) => i.art_id === selectedArtId)
        .map((i) => i.id)
    );

    const scopedFeatureIds = new Set(
      ((features ?? []) as Feature[])
        .filter(
          (f) => !!f.initiative_id && scopedInitiatives.has(f.initiative_id)
        )
        .map((f) => f.id)
    );

    dependencyRows = dependencyRows.filter(
      (dep) =>
        (!!dep.source_feature_id && scopedFeatureIds.has(dep.source_feature_id)) ||
        (!!dep.target_feature_id && scopedFeatureIds.has(dep.target_feature_id))
    );
  }

  const typeBuckets = [
    'Team',
    'Platform',
    'Infrastructure',
    'Environment',
    'Operations',
    'External',
    'Approval',
    'ServiceNow',
  ];

  const byType = typeBuckets.map((type) => ({
    type,
    count: dependencyRows.filter(
      (row) => (row.dependency_type ?? '').toLowerCase() === type.toLowerCase()
    ).length,
  }));

  const byCriticality = ['High', 'Medium', 'Low'].map((criticality) => ({
    criticality,
    count: dependencyRows.filter(
      (row) =>
        (row.dependency_criticality ?? '').toLowerCase() ===
        criticality.toLowerCase()
    ).length,
  }));

  const ownerMap = new Map<string, number>();
  dependencyRows.forEach((dependency) => {
    if (!dependency.dependency_owner) return;
    ownerMap.set(
      dependency.dependency_owner,
      (ownerMap.get(dependency.dependency_owner) ?? 0) + 1
    );
  });

  const topOwners = [...ownerMap.entries()]
    .map(([owner, count]) => ({ owner, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { byType, byCriticality, topOwners };
}

export async function getImportFreshness(cycleId: string) {
  const supabase = getSupabaseServerClient();

  const [
    { data: imports },
    { data: snapshotFeatures },
    { data: teams },
    { data: participations },
  ] = await Promise.all([
    supabase
      .from('import_snapshots')
      .select('id,planning_cycle_id,imported_at,status')
      .eq('planning_cycle_id', cycleId)
      .order('imported_at', { ascending: false }),
    supabase
      .from('snapshot_features')
      .select('planning_cycle_id,import_snapshot_id,team_name')
      .eq('planning_cycle_id', cycleId),
    supabase.from('teams').select('id,name,is_active').eq('is_active', true),
    supabase
      .from('team_cycle_participation')
      .select('planning_cycle_id,team_id,is_participating')
      .eq('planning_cycle_id', cycleId),
  ]);

  const snapshots = (imports ?? []) as ImportSnapshot[];
  const imported = snapshots.filter((item) => item.status === 'imported');
  const latestImportAt = imported[0]?.imported_at ?? null;

  const importedMap = new Map<string, string>();
  ((snapshotFeatures ?? []) as SnapshotFeature[]).forEach((row) => {
    const snapshot = snapshots.find(
      (item) => item.id === row.import_snapshot_id && item.status === 'imported'
    );
    if (!snapshot || !row.team_name) return;
    const prev = importedMap.get(row.team_name);
    if (!prev || prev < snapshot.imported_at) {
      importedMap.set(row.team_name, snapshot.imported_at);
    }
  });

  const participatingIds = new Set(
    ((participations ?? []) as Participation[])
      .filter((row) => row.is_participating)
      .map((row) => row.team_id)
  );

  const teamStatuses = ((teams ?? []) as Team[])
    .filter((team) => participatingIds.has(team.id))
    .map((team) => {
      const latest = importedMap.get(team.name) ?? null;
      return {
        team: team.name,
        latestImportAt: latest,
        freshness: freshnessOf(latest),
      };
    })
    .sort((a, b) => a.team.localeCompare(b.team));

  return {
    latestImportAt,
    importedSnapshots: imported.length,
    rolledBackSnapshots: snapshots.filter(
      (item) => item.status === 'rolled_back'
    ).length,
    teamsNoImport: teamStatuses.filter((item) => item.freshness === 'Missing')
      .length,
    teamsStale: teamStatuses.filter((item) => item.freshness === 'Stale').length,
    teamStatuses,
  };
}

export async function getRecentActivity(cycleId: string) {
  const supabase = getSupabaseServerClient();

  const { data: activity } = await supabase
    .from('activity_events')
    .select('id,planning_cycle_id,event_type,message,created_at')
    .eq('planning_cycle_id', cycleId)
    .order('created_at', { ascending: false })
    .limit(30);

  const activityRows = (activity ?? []) as Activity[];

  if (activityRows.length > 0) {
    return activityRows.map((row) => ({
      id: row.id,
      timestamp: row.created_at,
      eventType: row.event_type,
      message: row.message,
    }));
  }

  const { data: snapshots } = await supabase
    .from('import_snapshots')
    .select('id,imported_at,source_system,file_name,status')
    .eq('planning_cycle_id', cycleId)
    .order('imported_at', { ascending: false })
    .limit(20);

  return ((snapshots ?? []) as ImportSnapshot[]).map((row) => ({
    id: row.id,
    timestamp: row.imported_at,
    eventType:
      row.status === 'rolled_back'
        ? 'SNAPSHOT_ROLLED_BACK'
        : 'SNAPSHOT_IMPORTED',
    message: `${row.file_name ?? 'Snapshot'} (${row.source_system ?? 'CSV'})`,
  }));
}

export async function getAttentionItems(
  cycle: Cycle | null,
  selectedArtId?: string | null
) {
  if (!cycle) {
    return [
      {
        severity: 'high' as const,
        message: 'No active planning cycle configured.',
      },
    ];
  }

  const [freshness, dependencyOverview, artTiles] = await Promise.all([
    getImportFreshness(cycle.id),
    getDependencyOverview(cycle.id, selectedArtId),
    getArtStatusTiles(cycle.id, selectedArtId),
  ]);

  const items: Array<{ severity: 'high' | 'medium'; message: string }> = [];

  if (freshness.teamsNoImport > 0) {
    items.push({
      severity: 'high',
      message: `${freshness.teamsNoImport} participating team(s) have no import snapshots.`,
    });
  }

  if (freshness.teamsStale > 0) {
    items.push({
      severity: 'medium',
      message: `${freshness.teamsStale} participating team(s) have stale import data (>60 mins).`,
    });
  }

  const highCriticalityCount =
    dependencyOverview.byCriticality.find((x) => x.criticality === 'High')
      ?.count ?? 0;

  const unownedHigh =
    dependencyOverview.topOwners.length === 0 ? highCriticalityCount : 0;

  if (unownedHigh > 0) {
    items.push({
      severity: 'high',
      message: `${unownedHigh} high-criticality dependencies have no clear owner signal.`,
    });
  }

  artTiles
    .filter((tile) => tile.features === 0)
    .forEach((tile) => {
      items.push({
        severity: 'medium',
        message: `${tile.artName} has active initiatives but no imported features.`,
      });
    });

  return items;
}

export async function getDashboardData(input: {
  selectedCycleId?: string;
  selectedArtId?: string;
} = {}): Promise<DashboardData> {
  const cycle = await getActiveOrSelectedPlanningCycle(input.selectedCycleId);
  const supabase = getSupabaseServerClient();

  const { data: arts } = await supabase
    .from('arts')
    .select('id,name,is_active')
    .eq('is_active', true)
    .order('name');

  const activeArts = ((arts ?? []) as Art[]).map((art) => ({
    id: art.id,
    name: art.name,
  }));

  const selectedArtId =
    input.selectedArtId && activeArts.some((art) => art.id === input.selectedArtId)
      ? input.selectedArtId
      : null;

  if (!cycle) {
    return {
      cycle: null,
      arts: activeArts,
      selectedArtId,
      refreshedAt: new Date().toISOString(),
      summary: {
        totalFeatures: 0,
        totalStories: 0,
        participatingTeams: 0,
        activeInitiatives: 0,
        totalDependencies: 0,
        highCriticalityDependencies: 0,
        importsToday: 0,
        teamsWithFreshData: 0,
      },
      artTiles: [],
      convergence: {
        draft: 0,
        planned: 0,
        committed: 0,
        summary: 'No active cycle configured.',
      },
      sprintDistribution: [],
      dependencyOverview: { byType: [], byCriticality: [], topOwners: [] },
      importFreshness: {
        latestImportAt: null,
        importedSnapshots: 0,
        rolledBackSnapshots: 0,
        teamsNoImport: 0,
        teamsStale: 0,
        teamStatuses: [],
      },
      activity: [],
      attentionItems: [
        {
          severity: 'high',
          message: 'No active planning cycle configured.',
        },
      ],
    };
  }

  const [
    summary,
    artTiles,
    sprintDistribution,
    dependencyOverview,
    importFreshness,
    activity,
    allFeaturesResult,
    cycleInitiativesResult,
  ] = await Promise.all([
    getDashboardSummary(cycle.id, selectedArtId),
    getArtStatusTiles(cycle.id, selectedArtId),
    getSprintDistribution(cycle.id, selectedArtId),
    getDependencyOverview(cycle.id, selectedArtId),
    getImportFreshness(cycle.id),
    getRecentActivity(cycle.id),
    supabase
      .from('features')
      .select('id,planning_cycle_id,initiative_id,commitment_status')
      .eq('planning_cycle_id', cycle.id),
    supabase
      .from('initiatives')
      .select('id,art_id,planning_cycle_id')
      .eq('planning_cycle_id', cycle.id),
  ]);

  const allFeatures = (allFeaturesResult.data ?? []) as Feature[];
  const cycleInitiatives = (cycleInitiativesResult.data ?? []) as Initiative[];

  const initiativeSet = selectedArtId
    ? new Set(
        cycleInitiatives
          .filter((i) => i.art_id === selectedArtId)
          .map((i) => i.id)
      )
    : null;

  const scopedFeatures = allFeatures.filter((feature) =>
    initiativeSet
      ? !!feature.initiative_id && initiativeSet.has(feature.initiative_id)
      : true
  );

  const draft = scopedFeatures.filter(
    (feature) => parseStatus(feature.commitment_status) === 'draft'
  ).length;
  const planned = scopedFeatures.filter(
    (feature) => parseStatus(feature.commitment_status) === 'planned'
  ).length;
  const committed = scopedFeatures.filter(
    (feature) => parseStatus(feature.commitment_status) === 'committed'
  ).length;

  let convergenceSummary = 'Plan is converging.';
  if (draft > committed) convergenceSummary = 'Large number of draft items remain.';
  if (scopedFeatures.length === 0) {
    convergenceSummary = 'No features imported for this cycle yet.';
  }

  const attentionItems = await getAttentionItems(cycle, selectedArtId);

  return {
    cycle,
    arts: activeArts,
    selectedArtId,
    refreshedAt: new Date().toISOString(),
    summary: summary ?? {
      totalFeatures: 0,
      totalStories: 0,
      participatingTeams: 0,
      activeInitiatives: 0,
      totalDependencies: 0,
      highCriticalityDependencies: 0,
      importsToday: 0,
      teamsWithFreshData: 0,
    },
    artTiles,
    convergence: {
      draft,
      planned,
      committed,
      summary: convergenceSummary,
    },
    sprintDistribution,
    dependencyOverview,
    importFreshness,
    activity,
    attentionItems,
  };
}
