import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  getActiveOrSelectedPlanningCycle,
  getArts,
} from '@/lib/supabase/sortingFrame';
import type {
  DependenciesData,
  DependencyNode,
  DependencyEdge,
} from '@/lib/types/dependencies';

type DbDependency = {
  id: string;
  source_feature_id: string | null;
  target_feature_id: string | null;
  source_ticket_key: string | null;
  target_ticket_key: string | null;
  dependency_type: string | null;
  dependency_criticality: string | null;
  dependency_status: string | null;
  dependency_owner: string | null;
  dependency_description: string | null;
  dependency_target_sprint: string | null;
};

type DbFeature = {
  id: string;
  ticket_key: string;
  title: string;
  team_id: string | null;
  initiative_id: string | null;
};

type DbTeam = {
  id: string;
  name: string;
};

type DbInitiative = {
  id: string;
  art_id: string | null;
};

export async function getDependenciesData(input: {
  selectedCycleId?: string;
  selectedArtId?: string;
}): Promise<DependenciesData> {
  const cycle = await getActiveOrSelectedPlanningCycle(input.selectedCycleId);
  const allArts = (await getArts()).map((art) => ({
    id: art.id,
    name: art.name,
    short_name: art.short_name,
  }));

  const selectedArtId =
    input.selectedArtId && allArts.some((art) => art.id === input.selectedArtId)
      ? input.selectedArtId
      : allArts[0]?.id ?? null;

  if (!cycle || !selectedArtId) {
    return { cycle: cycle ? { id: cycle.id, name: cycle.name } : null, arts: allArts, selectedArtId, nodes: [], edges: [] };
  }

  const supabase = getSupabaseServerClient();

  const [
    { data: dependencies },
    { data: features },
    { data: initiatives },
    { data: teams },
  ] = await Promise.all([
    supabase
      .from('dependencies')
      .select(
        'id,source_feature_id,target_feature_id,source_ticket_key,target_ticket_key,dependency_type,dependency_criticality,dependency_status,dependency_owner,dependency_description,dependency_target_sprint'
      )
      .eq('planning_cycle_id', cycle.id),
    supabase
      .from('features')
      .select('id,ticket_key,title,team_id,initiative_id')
      .eq('planning_cycle_id', cycle.id),
    supabase
      .from('initiatives')
      .select('id,art_id')
      .eq('planning_cycle_id', cycle.id),
    supabase.from('teams').select('id,name'),
  ]);

  const initiativeRows = (initiatives ?? []) as DbInitiative[];
  const featureRows = (features ?? []) as DbFeature[];
  const teamRows = (teams ?? []) as DbTeam[];
  const depRows = (dependencies ?? []) as DbDependency[];

  // Build ART lookup: initiative_id → art short_name
  const artShortNameById = new Map(allArts.map((a) => [a.id, a.short_name]));
  const initiativeArtMap = new Map(
    initiativeRows.map((i) => [i.id, i.art_id])
  );

  function getArtShortName(initiativeId: string | null): string | null {
    if (!initiativeId) return null;
    const artId = initiativeArtMap.get(initiativeId);
    if (!artId) return null;
    return artShortNameById.get(artId) ?? null;
  }

  // Scope to selected ART
  const artInitiativeIds = new Set(
    initiativeRows.filter((i) => i.art_id === selectedArtId).map((i) => i.id)
  );

  const artFeatures = featureRows.filter(
    (f) => !!f.initiative_id && artInitiativeIds.has(f.initiative_id)
  );
  const artFeatureIds = new Set(artFeatures.map((f) => f.id));

  const teamNameById = new Map(teamRows.map((t) => [t.id, t.name]));
  const featureById = new Map(featureRows.map((f) => [f.id, f]));

  // Filter dependencies: at least one end must be in the ART
  const scopedDeps = depRows.filter(
    (d) =>
      (!!d.source_feature_id && artFeatureIds.has(d.source_feature_id)) ||
      (!!d.target_feature_id && artFeatureIds.has(d.target_feature_id))
  );

  // Build nodes: features that appear in scoped dependencies + external nodes
  const nodeMap = new Map<string, DependencyNode>();

  for (const dep of scopedDeps) {
    // Source node
    if (dep.source_feature_id) {
      if (!nodeMap.has(dep.source_feature_id)) {
        const feat = featureById.get(dep.source_feature_id);
        if (feat) {
          nodeMap.set(dep.source_feature_id, {
            id: feat.id,
            ticketKey: feat.ticket_key,
            title: feat.title,
            teamName: feat.team_id ? (teamNameById.get(feat.team_id) ?? null) : null,
            artShortName: getArtShortName(feat.initiative_id),
            isExternal: false,
          });
        }
      }
    }

    // Target node — may be a feature or an external entity
    if (dep.target_feature_id) {
      if (!nodeMap.has(dep.target_feature_id)) {
        const feat = featureById.get(dep.target_feature_id);
        if (feat) {
          nodeMap.set(dep.target_feature_id, {
            id: feat.id,
            ticketKey: feat.ticket_key,
            title: feat.title,
            teamName: feat.team_id ? (teamNameById.get(feat.team_id) ?? null) : null,
            artShortName: getArtShortName(feat.initiative_id),
            isExternal: false,
          });
        }
      }
    } else if (dep.target_ticket_key) {
      // External target — no matching feature row
      const externalId = `ext-${dep.target_ticket_key}`;
      if (!nodeMap.has(externalId)) {
        nodeMap.set(externalId, {
          id: externalId,
          ticketKey: dep.target_ticket_key,
          title: dep.dependency_type ?? dep.target_ticket_key,
          teamName: null,
          artShortName: null,
          isExternal: true,
        });
      }
    }
  }

  // Build edges
  const edges: DependencyEdge[] = scopedDeps
    .map((dep) => {
      const sourceId = dep.source_feature_id;
      const targetId =
        dep.target_feature_id ??
        (dep.target_ticket_key ? `ext-${dep.target_ticket_key}` : null);

      if (!sourceId || !targetId) return null;
      if (!nodeMap.has(sourceId) || !nodeMap.has(targetId)) return null;

      return {
        id: dep.id,
        sourceId,
        targetId,
        dependencyType: dep.dependency_type,
        criticality: dep.dependency_criticality,
        status: dep.dependency_status,
        owner: dep.dependency_owner,
        description: dep.dependency_description,
        targetSprint: dep.dependency_target_sprint,
      };
    })
    .filter((e): e is DependencyEdge => e !== null);

  return {
    cycle: { id: cycle.id, name: cycle.name },
    arts: allArts,
    selectedArtId,
    nodes: [...nodeMap.values()],
    edges,
  };
}
