import type { Feature } from '@/lib/models';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type DbCycle = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_archived: boolean;
  current_stage: number;
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
  short_name: string | null;
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
  source_system: string | null;
};

type DbTeam = {
  id: string;
  name: string;
  platform_id: string | null;
  team_type: string | null;
  is_active: boolean;
  platforms?: { id: string; name: string } | null;
};

type DbStory = {
  id: string;
  ticket_key: string;
  title: string;
  feature_id: string | null;
  sprint_id: string | null;
  status: string | null;
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
  platform: string | null;
  teamType: string | null;
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
  arts: Array<{ id: string; name: string; short_name: string | null }>;
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
    .order('display_order', { ascending: true })
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
      'id, planning_cycle_id, initiative_id, team_id, sprint_id, ticket_key, title, source_url, commitment_status, status, source_system, initiatives!inner(art_id)'
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
    .select('id, name, platform_id, team_type, is_active, platforms(id, name)')
    .in('id', teamIds)
    .order('name');

  return (data ?? []) as unknown as DbTeam[];
}

export async function getStoriesForCycle(
  cycleId: string
): Promise<Map<string, DbStory[]>> {
  const supabase = getSupabaseServerClient();

  const { data } = await supabase
    .from('stories')
    .select('id, ticket_key, title, feature_id, sprint_id, status')
    .eq('planning_cycle_id', cycleId)
    .not('feature_id', 'is', null);

  const map = new Map<string, DbStory[]>();

  ((data ?? []) as DbStory[]).forEach((row) => {
    if (!row.feature_id) return;
    if (!map.has(row.feature_id)) map.set(row.feature_id, []);
    map.get(row.feature_id)!.push(row);
  });

  return map;
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
    short_name: art.short_name,
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

  const [sprints, initiatives, rawFeatures, rawStories, dependencyCounts] =
    await Promise.all([
      getCycleSprints(cycle.id),
      getInitiativesForArt(cycle.id, selectedArtId),
      getFeaturesForSortingFrame(cycle.id, selectedArtId),
      getStoriesForCycle(cycle.id),
      getDependenciesByFeature(cycle.id),
    ]);

  // Build sprint-number lookup so stories (and features) can resolve S1/S2 labels.
  const sprintNumberById = new Map(
    sprints.map((s) => [s.id, s.sprint_number])
  );

  const features: Feature[] = rawFeatures.map((feature) => {
    const featureStories = (rawStories.get(feature.id) ?? []).map((s) => ({
      id: s.id,
      ticketKey: s.ticket_key,
      title: s.title,
      sprintId: s.sprint_id,
      sprintNumber: s.sprint_id ? (sprintNumberById.get(s.sprint_id) ?? null) : null,
      status: s.status,
    }));

    return {
      id: feature.id,
      ticketKey: feature.ticket_key,
      title: feature.title,
      initiativeId: feature.initiative_id ?? 'unknown-initiative',
      teamId: feature.team_id ?? 'unknown-team',
      sprintId: feature.sprint_id,
      sprintNumber: feature.sprint_id
        ? (sprintNumberById.get(feature.sprint_id) ?? null)
        : null,
      sourceUrl: feature.source_url,
      commitmentStatus: feature.commitment_status,
      status: feature.status,
      sourceSystem: feature.source_system,
      storyCount: featureStories.length,
      dependencyCounts: dependencyCounts.get(feature.id) ?? {
        requires: 0,
        blocks: 0,
        conflict: 0,
      },
      stories: featureStories,
    };
  });

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

          const platform = team.platforms?.name ?? null;
          if (platform) platformSet.add(platform);

          return {
            id: team.id,
            name: team.name,
            platform,
            teamType: team.team_type ?? null,
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
