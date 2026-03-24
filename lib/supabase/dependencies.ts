import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getActiveOrSelectedPlanningCycle } from '@/lib/supabase/sortingFrame';
import type {
  DependenciesData,
  DependencyEdge,
  DependencyNode,
} from '@/lib/types/dependencies';

const DEMO_PI_ID = 'cc4d9336-8c6d-448a-80ed-9a4474e2a8a0';

// ─── DB row types ─────────────────────────────────────────────────────────────

type DbDependency = {
  id: string;
  source_ticket_key: string;
  target_ticket_key: string;
  source_feature_id: string | null;
  target_feature_id: string | null;
  dependency_type: string;
  dependency_criticality: string | null;
  dependency_owner: string | null;
  dependency_target_sprint: string | null;
  dependency_description: string | null;
};

type DbFeatureRow = {
  id: string;
  ticket_key: string;
  title: string;
  team_id: string | null;
  sprint_id: string | null;
  initiative_id: string | null;
  teams: { name: string; platforms: { name: string } | null } | null;
  sprints: { name: string; sprint_number: number } | null;
  initiatives: { name: string } | null;
};

type DbTeamArtAssignment = {
  team_id: string;
  art_id: string;
  arts: { id: string; name: string; short_name: string | null } | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normaliseCriticality(
  raw: string | null
): DependencyEdge['criticality'] {
  if (raw === 'High') return 'High';
  if (raw === 'Medium') return 'Medium';
  if (raw === 'Low') return 'Low';
  return null;
}

// ─── Main fetcher ─────────────────────────────────────────────────────────────

export async function getDependenciesData(
  artId?: string
): Promise<DependenciesData> {
  const supabase = getSupabaseServerClient();

  // 1. Active PI or Demo PI fallback
  type CycleRow = { id: string; name: string; start_date: string; end_date: string; is_active: boolean };
  let cycle: CycleRow | null = null;

  const activeOrLatest = await getActiveOrSelectedPlanningCycle(undefined);
  if (activeOrLatest) {
    cycle = activeOrLatest as CycleRow;
  } else {
    const { data } = await supabase
      .from('planning_cycles')
      .select('id, name, start_date, end_date, is_active')
      .eq('id', DEMO_PI_ID)
      .maybeSingle();
    cycle = (data as CycleRow | null) ?? null;
  }

  if (!cycle) {
    return {
      planningCycleId: '',
      planningCycleName: '',
      arts: [],
      selectedArtId: '',
      nodes: [],
      edges: [],
    };
  }

  // 2. ARTs that have team_art_assignments for this PI
  const { data: artAssignments } = await supabase
    .from('team_art_assignments')
    .select('art_id, arts(id, name, short_name)')
    .eq('planning_cycle_id', cycle.id);

  const artsMap = new Map<string, { id: string; name: string; short_name: string }>();
  ((artAssignments ?? []) as unknown as DbTeamArtAssignment[]).forEach((row) => {
    if (row.arts && !artsMap.has(row.art_id)) {
      artsMap.set(row.art_id, {
        id: row.art_id,
        name: row.arts.name,
        short_name: row.arts.short_name ?? '',
      });
    }
  });

  // Sort ARTs by their position in the DB (order by arts.display_order)
  const { data: orderedArts } = await supabase
    .from('arts')
    .select('id')
    .in('id', [...artsMap.keys()])
    .order('display_order', { ascending: true });

  const arts = ((orderedArts ?? []) as Array<{ id: string }>)
    .map((a) => artsMap.get(a.id))
    .filter((a): a is { id: string; name: string; short_name: string } => !!a);

  const selectedArtId =
    artId && arts.some((a) => a.id === artId)
      ? artId
      : (arts[0]?.id ?? '');

  // 3. All dependencies for this PI
  const { data: rawDeps } = await supabase
    .from('dependencies')
    .select(
      'id, source_ticket_key, target_ticket_key, source_feature_id, target_feature_id, dependency_type, dependency_criticality, dependency_owner, dependency_target_sprint, dependency_description'
    )
    .eq('planning_cycle_id', cycle.id);

  const allDeps = (rawDeps ?? []) as DbDependency[];

  // 4. Collect unique feature UUIDs for both source and target
  const featureUuids = new Set<string>();
  for (const dep of allDeps) {
    if (dep.source_feature_id) featureUuids.add(dep.source_feature_id);
    if (dep.target_feature_id) featureUuids.add(dep.target_feature_id);
  }

  // 5. Fetch feature details (team, platform, sprint, value stream)
  const featuresById = new Map<string, DbFeatureRow>();
  if (featureUuids.size > 0) {
    const { data: featureRows } = await supabase
      .from('features')
      .select(
        'id, ticket_key, title, team_id, sprint_id, initiative_id, teams(name, platforms(name)), sprints(name, sprint_number), initiatives(name)'
      )
      .in('id', [...featureUuids]);

    ((featureRows ?? []) as unknown as DbFeatureRow[]).forEach((f) =>
      featuresById.set(f.id, f)
    );
  }

  // 6. Team → ART map for the selected PI (needed to get art_short_name per feature)
  const { data: teamArtRows } = await supabase
    .from('team_art_assignments')
    .select('team_id, art_id, arts(id, name, short_name)')
    .eq('planning_cycle_id', cycle.id);

  // team_id → art_short_name (first assignment wins if a team is in multiple ARTs)
  const teamArtMap = new Map<string, string>();
  const teamArtIdMap = new Map<string, string>(); // team_id → art_id
  ((teamArtRows ?? []) as unknown as DbTeamArtAssignment[]).forEach((row) => {
    if (!teamArtMap.has(row.team_id)) {
      teamArtMap.set(row.team_id, row.arts?.short_name ?? '');
      teamArtIdMap.set(row.team_id, row.art_id);
    }
  });

  // Helper to build a DependencyNode from a DbFeatureRow
  function featureToNode(f: DbFeatureRow): DependencyNode {
    const teamId = f.team_id ?? '';
    const artShortName = teamId ? (teamArtMap.get(teamId) ?? null) : null;
    return {
      id: f.ticket_key,
      type: 'feature',
      ticket_key: f.ticket_key,
      title: f.title,
      team_name: (f.teams as { name: string } | null)?.name ?? null,
      platform_name:
        (f.teams as { platforms: { name: string } | null } | null)?.platforms
          ?.name ?? null,
      art_short_name: artShortName,
      sprint_name:
        (f.sprints as { name: string } | null)?.name ?? null,
      value_stream_name:
        (f.initiatives as { name: string } | null)?.name ?? null,
    };
  }

  // 7. Optionally filter: if artId provided, keep only deps where source
  //    feature belongs to that ART. Cross-ART targets are kept but flagged.
  let filteredDeps = allDeps;
  if (selectedArtId) {
    filteredDeps = allDeps.filter((dep) => {
      if (!dep.source_feature_id) return true;
      const sf = featuresById.get(dep.source_feature_id);
      if (!sf) return true;
      const artOfSource = sf.team_id ? teamArtIdMap.get(sf.team_id) : null;
      return artOfSource === selectedArtId;
    });
  }

  // 8. Build deduplicated nodes
  const nodesMap = new Map<string, DependencyNode>();

  for (const dep of filteredDeps) {
    // Source node
    if (dep.source_feature_id) {
      const sf = featuresById.get(dep.source_feature_id);
      if (sf && !nodesMap.has(sf.ticket_key)) {
        nodesMap.set(sf.ticket_key, featureToNode(sf));
      }
    } else if (!nodesMap.has(dep.source_ticket_key)) {
      // External source (shouldn't happen per task facts, but handle gracefully)
      nodesMap.set(dep.source_ticket_key, {
        id: dep.source_ticket_key,
        type: 'external',
        ticket_key: dep.source_ticket_key,
        title: dep.source_ticket_key,
        team_name: null,
        platform_name: null,
        art_short_name: null,
        sprint_name: null,
        value_stream_name: null,
      });
    }

    // Target node
    if (dep.target_feature_id) {
      const tf = featuresById.get(dep.target_feature_id);
      if (tf && !nodesMap.has(tf.ticket_key)) {
        nodesMap.set(tf.ticket_key, featureToNode(tf));
      }
    } else if (!nodesMap.has(dep.target_ticket_key)) {
      // External entity — valid node, never skip
      nodesMap.set(dep.target_ticket_key, {
        id: dep.target_ticket_key,
        type: 'external',
        ticket_key: dep.target_ticket_key,
        title: dep.target_ticket_key,
        team_name: null,
        platform_name: null,
        art_short_name: null,
        sprint_name: null,
        value_stream_name: null,
      });
    }
  }

  // 9. Build edges
  const edges: DependencyEdge[] = filteredDeps.map((dep) => {
    const sourceKey = dep.source_feature_id
      ? (featuresById.get(dep.source_feature_id)?.ticket_key ?? dep.source_ticket_key)
      : dep.source_ticket_key;
    const targetKey = dep.target_feature_id
      ? (featuresById.get(dep.target_feature_id)?.ticket_key ?? dep.target_ticket_key)
      : dep.target_ticket_key;

    return {
      id: dep.id,
      source_ticket_key: sourceKey,
      target_ticket_key: targetKey,
      dependency_type: dep.dependency_type,
      criticality: normaliseCriticality(dep.dependency_criticality),
      owner: dep.dependency_owner,
      target_sprint: dep.dependency_target_sprint,
      description: dep.dependency_description,
    };
  });

  return {
    planningCycleId: cycle.id,
    planningCycleName: cycle.name,
    arts,
    selectedArtId,
    nodes: [...nodesMap.values()],
    edges,
  };
}
