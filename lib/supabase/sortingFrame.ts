import type { Feature } from '@/lib/models';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type DbCycle = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

type DbSprint = {
  id: string;
  planning_cycle_id: string;
  sprint_number: number;
  name: string;
  start_date: string;
  end_date: string;
};

type DbArt = {
  id: string;
  name: string;
  is_active: boolean;
};

type DbInitiative = {
  id: string;
  name: string;
  art_id: string | null;
  planning_cycle_id: string | null;
  is_active: boolean;
};

type DbFeature = {
  id: string;
  planning_cycle_id: string;
  initiative_id: string | null;
  team_id: string | null;
  sprint_id: string | null;
  ticket_key: string;
  title: string;
  source_url: string | null;
  commitment_status: string | null;
  status: string | null;
};

type DbTeam = {
  id: string;
  name: string;
  platform_id: string | null;
  is_active: boolean;
  platforms?: Array<{
    id: string;
    name: string;
  }> | null;
};

type DbStoryCount = {
  feature_id: string | null;
};

type DbDependency = {
  id: string;
  source_feature_id: string | null;
  target_feature_id: string | null;
  dependency_type: string | null;
};

export type SortingFrameInitiativeSummary = {
  teamsCount: number;
  featuresCount: number;
  dependencyCount: number;
  conflictCount: number;
};

export type SortingFrameTeamLane = {
  id: string;
  name: string;
  platform: string;
  features: Feature[];
};

export type SortingFrameInitiativeGroup = {
  id: string;
  name: string;
  summary: SortingFrameInitiativeSummary;
  teams: SortingFrameTeamLane[];
};

export type SortingFrameData = {
  selectedCycleId?: string;
  cycle: DbCycle | null;
  sprints: Array<{
    id: string;
    number: number;
    name: string;
    startDate: string;
    endDate: string;
  }>;
  arts: Array<{ id: string; name: string }>;
  selectedArtId: string | null;
  initiatives: SortingFrameInitiativeGroup[];
  parkingLot: Feature[];
  availablePlatforms: string[];
};

export async function getActiveOrSelectedPlanningCycle(
  selectedCycleId?: string
): Promise<DbCycle | null> {
  const supabase = getSupabaseServerClient();

  if (selectedCycleId) {
    const { data } = await supabase
      .from('planning_cycles')
      .select('*')
      .eq('id', selectedCycleId)
      .maybeSingle();

    if (data) return data as DbCycle;
  }

  const { data: active } = await supabase
    .from('planning_cycles')
    .select('*')
    .eq('is_active', true)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (active) return active as DbCycle;

  const { data: latest } = await supabase
    .from('planning_cycles')
    .select('*')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (latest as DbCycle | null) ?? null;
}

export async function getCycleSprints(cycleId: string): Promise<DbSprint[]> {
  const supabase = getSupabaseServerClient();

  const { data } = await supabase
    .from('sprints')
    .select('*')
    .eq('planning_cycle_id', cycleId)
    .order('sprint_number', { ascending: true });

  return (data ?? []) as DbSprint[];
}

export async function getArts(): Promise<DbArt[]> {
  const supabase = getSupabaseServerClient();

  const { data } = await supabase
    .from('arts')
    .select('*')
    .eq('is_active', true)
    .order('name');

  return (data ?? []) as DbArt[];
}

export async function getInitiativesForArt(
  cycleId: string,
  artId: string
): Promise<DbInitiative[]> {
  const supabase = getSupabaseServerClient();

  const { data } = await supabase
    .from('initiatives')
    .select('*')
    .eq('planning_cycle_id', cycleId)
    .eq('art_id', artId)
    .eq('is_active', true)
    .order('name');

  return (data ?? []) as DbInitiative[];
}

export async function getFeaturesForSortingFrame(
  cycleId: string,
  artId: string
): Promise<DbFeature[]> {
  const supabase = getSupabaseServerClient();

  const { data } = await supabase
    .from('features')
    .select(
      'id, planning_cycle_id, initiative_id, team_id, sprint_id, ticket_key, title, source_url, commitment_status, status, initiatives!inner(art_id)'
    )
    .eq('planning_cycle_id', cycleId)
    .eq('initiatives.art_id', artId)
    .returns<Array<DbFeature & { initiatives: { art_id: string } }>>();

  return (data ?? []).map(({ initiatives: _initiative, ...feature }) => feature);
}

export async function getTeamsByIds(teamIds: string[]): Promise<DbTeam[]> {
  const supabase = getSupabaseServerClient();

  if (!teamIds.length) return [];

  const { data } = await supabase
    .from('teams')
    .select('id, name, platform_id, is_active, platforms(id, name)')
    .in('id', teamIds)
    .order('name');

  return (data ?? []) as unknown as DbTeam[];
}

export async function getStoryCountsByFeature(
  cycleId: string
): Promise<Map<string, number>> {
  const supabase = getSupabaseServerClient();

  const { data } = await supabase
    .from('stories')
    .select('feature_id')
    .eq('planning_cycle_id', cycleId)
    .not('feature_id', 'is', null);

  const counts = new Map<string, number>();

  ((data ?? []) as DbStoryCount[]).forEach((row) => {
    if (!row.feature_id) return;
    counts.set(row.feature_id, (counts.get(row.feature_id) ?? 0) + 1);
  });

  return counts;
}

export async function getDependenciesByFeature(
  cycleId: string
): Promise<Map<string, { requires: number; blocks: number; conflict: number }>> {
  const supabase = getSupabaseServerClient();

  const { data } = await supabase
    .from('dependencies')
    .select('id, source_feature_id, target_feature_id, dependency_type')
    .eq('planning_cycle_id', cycleId);

  const map = new Map<
    string,
    { requires: number; blocks: number; conflict: number }
  >();

  ((data ?? []) as DbDependency[]).forEach((dependency) => {
    const type = (dependency.dependency_type ?? '').toLowerCase();

    const normalized: 'requires' | 'blocks' | 'conflict' =
      type === 'blocks'
        ? 'blocks'
        : type === 'conflict'
          ? 'conflict'
          : 'requires';

    const apply = (featureId: string | null) => {
      if (!featureId) return;

      const current = map.get(featureId) ?? {
        requires: 0,
        blocks: 0,
        conflict: 0,
      };

      current[normalized] += 1;
      map.set(featureId, current);
    };

    apply(dependency.source_feature_id);
    apply(dependency.target_feature_id);
  });

  return map;
}

export async function getSortingFrameData(input: {
  selectedCycleId?: string;
  selectedArtId?: string;
}): Promise<SortingFrameData> {
  const cycle = await getActiveOrSelectedPlanningCycle(input.selectedCycleId);
  const arts = (await getArts()).map((art) => ({
    id: art.id,
    name: art.name,
  }));

  const selectedArtId =
    input.selectedArtId && arts.some((art) => art.id === input.selectedArtId)
      ? input.selectedArtId
      : arts[0]?.id ?? null;

  if (!cycle || !selectedArtId) {
    return {
      selectedCycleId: input.selectedCycleId,
      cycle,
      sprints: [],
      arts,
      selectedArtId,
      initiatives: [],
      parkingLot: [],
      availablePlatforms: [],
    };
  }

  const [sprints, initiatives, rawFeatures, storyCounts, dependencyCounts] =
    await Promise.all([
      getCycleSprints(cycle.id),
      getInitiativesForArt(cycle.id, selectedArtId),
      getFeaturesForSortingFrame(cycle.id, selectedArtId),
      getStoryCountsByFeature(cycle.id),
      getDependenciesByFeature(cycle.id),
    ]);

  const features: Feature[] = rawFeatures.map((feature) => ({
    id: feature.id,
    ticketKey: feature.ticket_key,
    title: feature.title,
    initiativeId: feature.initiative_id ?? 'unknown-initiative',
    teamId: feature.team_id ?? 'unknown-team',
    sprintId: feature.sprint_id,
    sourceUrl: feature.source_url,
    commitmentStatus: feature.commitment_status,
    status: feature.status,
    storyCount: storyCounts.get(feature.id) ?? 0,
    dependencyCounts: dependencyCounts.get(feature.id) ?? {
      requires: 0,
      blocks: 0,
      conflict: 0,
    },
  }));

  const teamIds = [
    ...new Set(
      features
        .map((feature) => feature.teamId)
        .filter((id) => id !== 'unknown-team')
    ),
  ];

  const teams = await getTeamsByIds(teamIds);
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const platformSet = new Set<string>();

  const initiativesVm: SortingFrameInitiativeGroup[] = initiatives.map(
    (initiative) => {
      const initiativeFeatures = features.filter(
        (feature) => feature.initiativeId === initiative.id
      );

      const teamMap = new Map<string, Feature[]>();

      initiativeFeatures.forEach((feature) => {
        if (!teamMap.has(feature.teamId)) {
          teamMap.set(feature.teamId, []);
        }
        teamMap.get(feature.teamId)?.push(feature);
      });

      const lanes: SortingFrameTeamLane[] = [...teamMap.entries()]
        .map(([teamId, laneFeatures]) => {
          const team = teamById.get(teamId);
          if (!team) return null;

          const platform = team.platforms?.[0]?.name ?? 'Unknown';
          platformSet.add(platform);

          return {
            id: team.id,
            name: team.name,
            platform,
            features: laneFeatures,
          };
        })
        .filter((lane): lane is SortingFrameTeamLane => lane !== null)
        .sort((a, b) => a.name.localeCompare(b.name));

      return {
        id: initiative.id,
        name: initiative.name,
        summary: {
          teamsCount: lanes.length,
          featuresCount: initiativeFeatures.length,
          dependencyCount: initiativeFeatures.reduce(
            (sum, feature) =>
              sum +
              feature.dependencyCounts.requires +
              feature.dependencyCounts.blocks +
              feature.dependencyCounts.conflict,
            0
          ),
          conflictCount: initiativeFeatures.reduce(
            (sum, feature) => sum + feature.dependencyCounts.conflict,
            0
          ),
        },
        teams: lanes,
      };
    }
  );

  const parkingLot = features.filter((feature) => feature.sprintId === null);

  return {
    selectedCycleId: cycle.id,
    cycle,
    sprints: sprints.map((sprint) => ({
      id: sprint.id,
      number: sprint.sprint_number,
      name: sprint.name,
      startDate: sprint.start_date,
      endDate: sprint.end_date,
    })),
    arts,
    selectedArtId,
    initiatives: initiativesVm,
    parkingLot,
    availablePlatforms: [...platformSet].sort((a, b) => a.localeCompare(b)),
  };
}
