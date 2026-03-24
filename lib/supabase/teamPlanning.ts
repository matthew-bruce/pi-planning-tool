import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  getActiveOrSelectedPlanningCycle,
  getCycleSprints,
} from '@/lib/supabase/sortingFrame';

// ─── DB row types ─────────────────────────────────────────────────────────────

type DbArt = {
  id: string;
  name: string;
  short_name: string | null;
  display_order: number | null;
};

type DbTeam = {
  id: string;
  name: string;
  platform_id: string | null;
  team_type: string | null;
  platforms?: { id: string; name: string } | null;
};

type DbStory = {
  id: string;
  ticket_key: string;
  title: string;
  feature_id: string | null;
  team_id: string | null;
  sprint_id: string | null;
  status: string | null;
  commitment_status: string | null;
  story_points: number | null;
  source_url: string | null;
};

type DbFeature = {
  id: string;
  ticket_key: string;
  title: string;
  sprint_id: string | null;
  team_id: string | null;
  commitment_status: string | null;
  source_url: string | null;
  initiatives?: { name: string } | null;
};

// ─── Public types (passed to client component as initialData) ─────────────────

export type TeamPlanningStory = {
  id: string;
  ticketKey: string;
  title: string;
  storyPoints: number | null;
  status: string | null;
  commitmentStatus: string | null;
  sourceUrl: string | null;
};

export type TeamPlanningFeatureGroup = {
  featureId: string;
  featureTicketKey: string;
  featureTitle: string;
  featureSourceUrl: string | null;
  featureCommitmentStatus: string | null;
  valueStreamName: string | null;
  stories: TeamPlanningStory[];
};

export type TeamPlanningSprintColumn = {
  sprintId: string;
  sprintNumber: number;
  sprintName: string;
  startDate: string;
  endDate: string;
  featureGroups: TeamPlanningFeatureGroup[];
  totalStories: number;
  totalPoints: number;
};

export type TeamPlanningTeam = {
  id: string;
  name: string;
  platform: string | null;
  sprintColumns: TeamPlanningSprintColumn[];
  parkingLotFeatureGroups: TeamPlanningFeatureGroup[];
  totalStories: number;
  totalPoints: number;
};

export type TeamPlanningData = {
  cycle: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
  } | null;
  sprints: Array<{
    id: string;
    number: number;
    name: string;
    startDate: string;
    endDate: string;
  }>;
  arts: Array<{ id: string; name: string; short_name: string | null }>;
  selectedArtId: string | null;
  teams: TeamPlanningTeam[];
};

// ─── Private helpers ──────────────────────────────────────────────────────────

/** ARTs that have at least one team assigned in this cycle (ordered by display_order). */
async function getArtsForCycle(
  cycleId: string
): Promise<Array<{ id: string; name: string; short_name: string | null }>> {
  const supabase = getSupabaseServerClient();

  const { data: assignments } = await supabase
    .from('team_art_assignments')
    .select('art_id')
    .eq('planning_cycle_id', cycleId);

  if (!assignments || assignments.length === 0) return [];

  const artIds = [...new Set(assignments.map((a) => a.art_id as string))];

  const { data: arts } = await supabase
    .from('arts')
    .select('id, name, short_name, display_order')
    .in('id', artIds)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('name');

  return ((arts ?? []) as DbArt[]).map((a) => ({
    id: a.id,
    name: a.name,
    short_name: a.short_name,
  }));
}

/** Teams assigned to the given ART within the given cycle, ordered by name. */
async function getTeamsForArt(
  cycleId: string,
  artId: string
): Promise<DbTeam[]> {
  const supabase = getSupabaseServerClient();

  const { data: assignments } = await supabase
    .from('team_art_assignments')
    .select('team_id')
    .eq('planning_cycle_id', cycleId)
    .eq('art_id', artId);

  if (!assignments || assignments.length === 0) return [];

  const teamIds = assignments.map((a) => a.team_id as string);

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, platform_id, team_type, platforms(id, name)')
    .in('id', teamIds)
    .order('name');

  return (teams ?? []) as unknown as DbTeam[];
}

/** All stories for the given teams in this cycle (sprint-assigned and parking lot). */
async function getStoriesForTeams(
  cycleId: string,
  teamIds: string[]
): Promise<DbStory[]> {
  if (!teamIds.length) return [];
  const supabase = getSupabaseServerClient();

  const { data } = await supabase
    .from('stories')
    .select(
      'id, ticket_key, title, feature_id, team_id, sprint_id, status, commitment_status, story_points, source_url'
    )
    .eq('planning_cycle_id', cycleId)
    .in('team_id', teamIds);

  return (data ?? []) as DbStory[];
}

/** Feature lookup map for a list of feature IDs (includes initiative/value-stream name). */
async function getFeaturesByIds(
  featureIds: string[]
): Promise<Map<string, DbFeature>> {
  if (!featureIds.length) return new Map();
  const supabase = getSupabaseServerClient();

  const { data } = await supabase
    .from('features')
    .select(
      'id, ticket_key, title, sprint_id, team_id, commitment_status, source_url, initiatives(name)'
    )
    .in('id', featureIds);

  const map = new Map<string, DbFeature>();
  ((data ?? []) as unknown as DbFeature[]).forEach((f) => map.set(f.id, f));
  return map;
}

/**
 * Features assigned to these teams that have no sprint (parking lot),
 * including the initiative/value-stream name.
 */
async function getParkingLotFeaturesForTeams(
  cycleId: string,
  teamIds: string[]
): Promise<DbFeature[]> {
  if (!teamIds.length) return [];
  const supabase = getSupabaseServerClient();

  const { data } = await supabase
    .from('features')
    .select(
      'id, ticket_key, title, sprint_id, team_id, commitment_status, source_url, initiatives(name)'
    )
    .eq('planning_cycle_id', cycleId)
    .in('team_id', teamIds)
    .is('sprint_id', null);

  return (data ?? []) as unknown as DbFeature[];
}

// ─── Main fetcher ─────────────────────────────────────────────────────────────

export async function getTeamPlanningData(input: {
  selectedCycleId?: string;
  selectedArtId?: string;
}): Promise<TeamPlanningData> {
  const cycle = await getActiveOrSelectedPlanningCycle(input.selectedCycleId);

  if (!cycle) {
    return { cycle: null, sprints: [], arts: [], selectedArtId: null, teams: [] };
  }

  const [rawSprints, arts] = await Promise.all([
    getCycleSprints(cycle.id),
    getArtsForCycle(cycle.id),
  ]);

  const selectedArtId =
    input.selectedArtId && arts.some((a) => a.id === input.selectedArtId)
      ? input.selectedArtId
      : (arts[0]?.id ?? null);

  if (!selectedArtId) {
    return { cycle, sprints: [], arts, selectedArtId: null, teams: [] };
  }

  const sprints = rawSprints.map((s) => ({
    id: s.id,
    number: s.sprint_number,
    name: s.name,
    startDate: s.start_date,
    endDate: s.end_date,
  }));

  const dbTeams = await getTeamsForArt(cycle.id, selectedArtId);
  const teamIds = dbTeams.map((t) => t.id);

  const [rawStories, parkingLotFeatures] = await Promise.all([
    getStoriesForTeams(cycle.id, teamIds),
    getParkingLotFeaturesForTeams(cycle.id, teamIds),
  ]);

  // Resolve all parent features for sprint-assigned stories in one query.
  const featureIds = [
    ...new Set(
      rawStories
        .filter((s) => s.feature_id !== null)
        .map((s) => s.feature_id as string)
    ),
  ];
  const featuresById = await getFeaturesByIds(featureIds);

  // Merge parking lot features into the lookup map so feature sub-headers
  // are available even when a parking lot feature has no stories yet.
  parkingLotFeatures.forEach((f) => featuresById.set(f.id, f));

  // Helper: map a DbFeature to the value-stream name string.
  function vsName(f: DbFeature): string | null {
    return (f.initiatives as { name: string } | null)?.name ?? null;
  }

  // Helper: map a DbStory to a TeamPlanningStory value object.
  function toStory(s: DbStory): TeamPlanningStory {
    return {
      id: s.id,
      ticketKey: s.ticket_key,
      title: s.title,
      storyPoints: s.story_points !== null ? Number(s.story_points) : null,
      status: s.status,
      commitmentStatus: s.commitment_status,
      sourceUrl: s.source_url,
    };
  }

  // Build the Team → Sprint → FeatureGroup → Stories hierarchy.
  const teams: TeamPlanningTeam[] = dbTeams
    .map((dbTeam) => {
      const teamStories = rawStories.filter((s) => s.team_id === dbTeam.id);

      // ── Sprint columns ────────────────────────────────────────────────────
      const sprintColumns: TeamPlanningSprintColumn[] = sprints.map((sprint) => {
        const sprintStories = teamStories.filter(
          (s) => s.sprint_id === sprint.id
        );

        const featureMap = new Map<string, TeamPlanningStory[]>();
        const noFeatureStories: TeamPlanningStory[] = [];

        sprintStories.forEach((s) => {
          if (s.feature_id && featuresById.has(s.feature_id)) {
            if (!featureMap.has(s.feature_id)) featureMap.set(s.feature_id, []);
            featureMap.get(s.feature_id)!.push(toStory(s));
          } else {
            noFeatureStories.push(toStory(s));
          }
        });

        const featureGroups: TeamPlanningFeatureGroup[] = [
          ...featureMap.entries(),
        ].map(([fId, stories]) => {
          const feature = featuresById.get(fId)!;
          return {
            featureId: fId,
            featureTicketKey: feature.ticket_key,
            featureTitle: feature.title,
            featureSourceUrl: feature.source_url,
            featureCommitmentStatus: feature.commitment_status,
            valueStreamName: vsName(feature),
            stories,
          };
        });

        if (noFeatureStories.length > 0) {
          featureGroups.push({
            featureId: 'unassigned',
            featureTicketKey: '',
            featureTitle: 'No feature',
            featureSourceUrl: null,
            featureCommitmentStatus: null,
            valueStreamName: null,
            stories: noFeatureStories,
          });
        }

        const totalPoints = sprintStories.reduce(
          (sum, s) =>
            sum + (s.story_points !== null ? Number(s.story_points) : 0),
          0
        );

        return {
          sprintId: sprint.id,
          sprintNumber: sprint.number,
          sprintName: sprint.name,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
          featureGroups,
          totalStories: sprintStories.length,
          totalPoints,
        };
      });

      // ── Parking lot ───────────────────────────────────────────────────────
      // Stories with no sprint assigned for this team.
      const parkingStories = teamStories.filter((s) => s.sprint_id === null);
      const parkingFeatureMap = new Map<string, TeamPlanningStory[]>();

      parkingStories.forEach((s) => {
        if (s.feature_id && featuresById.has(s.feature_id)) {
          if (!parkingFeatureMap.has(s.feature_id))
            parkingFeatureMap.set(s.feature_id, []);
          parkingFeatureMap.get(s.feature_id)!.push(toStory(s));
        }
      });

      // Include parking lot features with no stories yet (feature header only).
      parkingLotFeatures
        .filter((f) => f.team_id === dbTeam.id && !parkingFeatureMap.has(f.id))
        .forEach((f) => parkingFeatureMap.set(f.id, []));

      const parkingLotFeatureGroups: TeamPlanningFeatureGroup[] = [
        ...parkingFeatureMap.entries(),
      ].map(([fId, stories]) => {
        const feature = featuresById.get(fId)!;
        return {
          featureId: fId,
          featureTicketKey: feature.ticket_key,
          featureTitle: feature.title,
          featureSourceUrl: feature.source_url,
          featureCommitmentStatus: feature.commitment_status,
          valueStreamName: vsName(feature),
          stories,
        };
      });

      // ── Totals (all stories including parking lot) ────────────────────────
      const totalStories = teamStories.length;
      const totalPoints = teamStories.reduce(
        (sum, s) =>
          sum + (s.story_points !== null ? Number(s.story_points) : 0),
        0
      );

      return {
        id: dbTeam.id,
        name: dbTeam.name,
        platform:
          (dbTeam.platforms as { name: string } | null | undefined)?.name ??
          null,
        sprintColumns,
        parkingLotFeatureGroups,
        totalStories,
        totalPoints,
      };
    })
    // Only show teams that have at least one story (sprint or parking lot).
    .filter((team) => team.totalStories > 0);

  return {
    cycle,
    sprints,
    arts,
    selectedArtId,
    teams,
  };
}
