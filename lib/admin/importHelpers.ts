/**
 * Pure helpers for the import pipeline — no Supabase dependency so they
 * can be unit-tested without the server client.
 */

export type ValueStreamSnapshotRow = {
  feature_key: string;
  initiative_name: string | null;
  art_name: string | null;
};

export type ValueStreamResolutionPlan = {
  /** Initiatives that do not yet exist and must be created */
  toCreate: Array<{ name: string; art_id: string | null; planning_cycle_id: string; is_active: boolean }>;
  /** Map of initiative_name → feature_keys that belong to it */
  initiativeNameToFeatureKeys: Map<string, string[]>;
};

/**
 * Determines which value streams (initiatives) need to be created and
 * which live feature rows need their initiative_id updated.
 *
 * Receives already-loaded reference data so it has no side effects and
 * can be fully unit-tested.
 */
export function buildValueStreamResolutionPlan(params: {
  snapshotRows: ValueStreamSnapshotRow[];
  existingInitiatives: Array<{ id: string; name: string }>;
  arts: Array<{ id: string; name: string }>;
  planningCycleId: string;
}): ValueStreamResolutionPlan {
  const { snapshotRows, existingInitiatives, arts, planningCycleId } = params;

  const artsByName = new Map(arts.map((a) => [a.name, a.id]));
  const existingByName = new Set(existingInitiatives.map((i) => i.name));

  // First pass: collect unique initiative_name → art_name and feature_key groupings
  const initiativeArtMap = new Map<string, string | null>();
  const initiativeNameToFeatureKeys = new Map<string, string[]>();

  for (const row of snapshotRows) {
    if (!row.initiative_name) continue;
    if (!initiativeArtMap.has(row.initiative_name)) {
      // First occurrence wins if the same name appears with different art_names
      initiativeArtMap.set(row.initiative_name, row.art_name ?? null);
    }
    const keys = initiativeNameToFeatureKeys.get(row.initiative_name) ?? [];
    keys.push(row.feature_key);
    initiativeNameToFeatureKeys.set(row.initiative_name, keys);
  }

  // Second pass: identify which initiatives need creating
  const toCreate: ValueStreamResolutionPlan['toCreate'] = [];
  for (const [name, artName] of initiativeArtMap) {
    if (existingByName.has(name)) continue;
    const art_id = artName ? (artsByName.get(artName) ?? null) : null;
    toCreate.push({ name, art_id, planning_cycle_id: planningCycleId, is_active: true });
  }

  return { toCreate, initiativeNameToFeatureKeys };
}
