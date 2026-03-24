/**
 * Pure helpers for the import pipeline — no Supabase dependency so they
 * can be unit-tested without the server client.
 */

// ─── Story relationship resolution ───────────────────────────────────────────

export type StorySnapshotRow = {
  story_key: string;
  feature_key: string | null;
  sprint_name: string | null;
};

export type FeatureLookupEntry = {
  id: string;
  teamId: string | null;
};

export type StoryUpdateRow = {
  ticketKey: string;
  featureId: string | null;
  teamId: string | null;
  sprintId: string | null;
};

/**
 * Given snapshot story rows and pre-loaded lookup maps, computes the
 * feature_id, team_id, and sprint_id that should be written to each live
 * story row.
 *
 * Pure function — no side effects, fully unit-testable.
 *
 * team_id is inherited from the parent feature (stories don't carry it
 * in the CSV). sprint_id is resolved from the sprint_name text field.
 * Orphan stories (no matching feature) keep featureId and teamId null
 * without error.
 */
export function computeStoryUpdates(
  snapshotStories: StorySnapshotRow[],
  featuresByTicketKey: Map<string, FeatureLookupEntry>,
  sprintIdByName: Map<string, string>,
): StoryUpdateRow[] {
  return snapshotStories.map((row) => {
    const feature =
      row.feature_key ? featuresByTicketKey.get(row.feature_key) ?? null : null;

    return {
      ticketKey: row.story_key,
      featureId: feature?.id ?? null,
      teamId: feature?.teamId ?? null,
      sprintId:
        row.sprint_name ? sprintIdByName.get(row.sprint_name) ?? null : null,
    };
  });
}

// ─── Feature sprint resolution ────────────────────────────────────────────────

export type FeatureSnapshotRow = {
  feature_key: string;
  sprint_name: string | null;
};

export type FeatureSprintUpdateRow = {
  ticketKey: string;
  sprintId: string | null;
};

/**
 * Given snapshot feature rows and a sprint-name → sprint-id lookup map,
 * computes the sprint_id that should be written to each live feature row.
 *
 * Pure function — no side effects, fully unit-testable.
 *
 * Features whose sprint_name doesn't match any known sprint (or is null)
 * get sprintId = null — they remain in the parking lot.
 */
export function computeFeatureSprintUpdates(
  snapshotFeatures: FeatureSnapshotRow[],
  sprintIdByName: Map<string, string>,
): FeatureSprintUpdateRow[] {
  return snapshotFeatures.map((row) => ({
    ticketKey: row.feature_key,
    sprintId:
      row.sprint_name ? sprintIdByName.get(row.sprint_name) ?? null : null,
  }));
}

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
