import { describe, expect, it } from 'vitest';
import {
  buildValueStreamResolutionPlan,
  computeStoryUpdates,
  computeFeatureSprintUpdates,
} from '../importHelpers';

const CYCLE_ID = 'cycle-123';

const arts = [
  { id: 'art-waa', name: 'Web & App' },
  { id: 'art-ooh', name: 'Out Of Home' },
];

describe('buildValueStreamResolutionPlan', () => {
  it('returns toCreate for initiatives not yet in the DB', () => {
    const plan = buildValueStreamResolutionPlan({
      snapshotRows: [
        { feature_key: 'FEAT-001', initiative_name: 'Checkout Revamp', art_name: 'Web & App' },
        { feature_key: 'FEAT-002', initiative_name: 'Checkout Revamp', art_name: 'Web & App' },
        { feature_key: 'FEAT-003', initiative_name: 'Digital Signage', art_name: 'Out Of Home' },
      ],
      existingInitiatives: [],
      arts,
      planningCycleId: CYCLE_ID,
    });

    expect(plan.toCreate).toHaveLength(2);
    expect(plan.toCreate).toContainEqual({
      name: 'Checkout Revamp',
      art_id: 'art-waa',
      planning_cycle_id: CYCLE_ID,
      is_active: true,
    });
    expect(plan.toCreate).toContainEqual({
      name: 'Digital Signage',
      art_id: 'art-ooh',
      planning_cycle_id: CYCLE_ID,
      is_active: true,
    });
  });

  it('skips initiatives that already exist in the DB', () => {
    const plan = buildValueStreamResolutionPlan({
      snapshotRows: [
        { feature_key: 'FEAT-001', initiative_name: 'Checkout Revamp', art_name: 'Web & App' },
        { feature_key: 'FEAT-002', initiative_name: 'Digital Signage', art_name: 'Out Of Home' },
      ],
      existingInitiatives: [{ id: 'init-existing', name: 'Checkout Revamp' }],
      arts,
      planningCycleId: CYCLE_ID,
    });

    expect(plan.toCreate).toHaveLength(1);
    expect(plan.toCreate[0].name).toBe('Digital Signage');
  });

  it('groups feature keys by initiative name correctly', () => {
    const plan = buildValueStreamResolutionPlan({
      snapshotRows: [
        { feature_key: 'FEAT-001', initiative_name: 'Checkout Revamp', art_name: 'Web & App' },
        { feature_key: 'FEAT-002', initiative_name: 'Checkout Revamp', art_name: 'Web & App' },
        { feature_key: 'FEAT-003', initiative_name: 'Digital Signage', art_name: 'Out Of Home' },
      ],
      existingInitiatives: [],
      arts,
      planningCycleId: CYCLE_ID,
    });

    expect(plan.initiativeNameToFeatureKeys.get('Checkout Revamp')).toEqual(['FEAT-001', 'FEAT-002']);
    expect(plan.initiativeNameToFeatureKeys.get('Digital Signage')).toEqual(['FEAT-003']);
  });

  it('sets art_id to null when art_name does not match any known ART', () => {
    const plan = buildValueStreamResolutionPlan({
      snapshotRows: [{ feature_key: 'FEAT-001', initiative_name: 'Mystery Stream', art_name: 'Unknown ART' }],
      existingInitiatives: [],
      arts,
      planningCycleId: CYCLE_ID,
    });

    expect(plan.toCreate[0].art_id).toBeNull();
  });

  it('sets art_id to null when art_name is null', () => {
    const plan = buildValueStreamResolutionPlan({
      snapshotRows: [{ feature_key: 'FEAT-001', initiative_name: 'No ART Stream', art_name: null }],
      existingInitiatives: [],
      arts,
      planningCycleId: CYCLE_ID,
    });

    expect(plan.toCreate[0].art_id).toBeNull();
  });

  it('skips rows with no initiative_name', () => {
    const plan = buildValueStreamResolutionPlan({
      snapshotRows: [
        { feature_key: 'FEAT-001', initiative_name: null, art_name: 'Web & App' },
        { feature_key: 'FEAT-002', initiative_name: '', art_name: 'Web & App' },
      ],
      existingInitiatives: [],
      arts,
      planningCycleId: CYCLE_ID,
    });

    expect(plan.toCreate).toHaveLength(0);
    expect(plan.initiativeNameToFeatureKeys.size).toBe(0);
  });

  it('returns empty plan when no snapshot rows are provided', () => {
    const plan = buildValueStreamResolutionPlan({
      snapshotRows: [],
      existingInitiatives: [],
      arts,
      planningCycleId: CYCLE_ID,
    });

    expect(plan.toCreate).toHaveLength(0);
    expect(plan.initiativeNameToFeatureKeys.size).toBe(0);
  });

  it('uses first seen art_name when the same initiative appears with different art_names', () => {
    // Defensive: if data is inconsistent, first occurrence wins
    const plan = buildValueStreamResolutionPlan({
      snapshotRows: [
        { feature_key: 'FEAT-001', initiative_name: 'Mixed Stream', art_name: 'Web & App' },
        { feature_key: 'FEAT-002', initiative_name: 'Mixed Stream', art_name: 'Out Of Home' },
      ],
      existingInitiatives: [],
      arts,
      planningCycleId: CYCLE_ID,
    });

    expect(plan.toCreate).toHaveLength(1);
    expect(plan.toCreate[0].art_id).toBe('art-waa'); // first occurrence wins
  });
});

// ─── computeStoryUpdates ──────────────────────────────────────────────────────

describe('computeStoryUpdates', () => {
  const featuresByTicketKey = new Map([
    ['FEAT-001', { id: 'feat-uuid-001', teamId: 'team-uuid-alpha' }],
    ['FEAT-002', { id: 'feat-uuid-002', teamId: null }],
  ]);

  const sprintIdByName = new Map([
    ['Sprint 1', 'sprint-uuid-1'],
    ['Sprint 2', 'sprint-uuid-2'],
  ]);

  it('resolves feature_id and team_id from parent feature', () => {
    const result = computeStoryUpdates(
      [{ story_key: 'STORY-101', feature_key: 'FEAT-001', sprint_name: null }],
      featuresByTicketKey,
      sprintIdByName,
    );

    expect(result).toHaveLength(1);
    expect(result[0].featureId).toBe('feat-uuid-001');
    expect(result[0].teamId).toBe('team-uuid-alpha');
    expect(result[0].sprintId).toBeNull();
  });

  it('resolves sprint_id from sprint name', () => {
    const result = computeStoryUpdates(
      [{ story_key: 'STORY-101', feature_key: null, sprint_name: 'Sprint 2' }],
      featuresByTicketKey,
      sprintIdByName,
    );

    expect(result[0].sprintId).toBe('sprint-uuid-2');
    expect(result[0].featureId).toBeNull();
    expect(result[0].teamId).toBeNull();
  });

  it('resolves feature_id, team_id and sprint_id together', () => {
    const result = computeStoryUpdates(
      [{ story_key: 'STORY-101', feature_key: 'FEAT-001', sprint_name: 'Sprint 1' }],
      featuresByTicketKey,
      sprintIdByName,
    );

    expect(result[0].featureId).toBe('feat-uuid-001');
    expect(result[0].teamId).toBe('team-uuid-alpha');
    expect(result[0].sprintId).toBe('sprint-uuid-1');
  });

  it('keeps team_id null when parent feature has no team assigned', () => {
    const result = computeStoryUpdates(
      [{ story_key: 'STORY-201', feature_key: 'FEAT-002', sprint_name: null }],
      featuresByTicketKey,
      sprintIdByName,
    );

    expect(result[0].featureId).toBe('feat-uuid-002');
    expect(result[0].teamId).toBeNull();
  });

  it('keeps featureId and teamId null for orphan stories with no matching feature', () => {
    const result = computeStoryUpdates(
      [{ story_key: 'STORY-999', feature_key: 'FEAT-UNKNOWN', sprint_name: 'Sprint 1' }],
      featuresByTicketKey,
      sprintIdByName,
    );

    expect(result[0].featureId).toBeNull();
    expect(result[0].teamId).toBeNull();
    expect(result[0].sprintId).toBe('sprint-uuid-1'); // sprint still resolves
  });

  it('keeps featureId and teamId null when feature_key is null', () => {
    const result = computeStoryUpdates(
      [{ story_key: 'STORY-999', feature_key: null, sprint_name: null }],
      featuresByTicketKey,
      sprintIdByName,
    );

    expect(result[0].featureId).toBeNull();
    expect(result[0].teamId).toBeNull();
    expect(result[0].sprintId).toBeNull();
  });

  it('keeps sprintId null when sprint_name does not match any sprint', () => {
    const result = computeStoryUpdates(
      [{ story_key: 'STORY-101', feature_key: null, sprint_name: 'Sprint 99' }],
      featuresByTicketKey,
      sprintIdByName,
    );

    expect(result[0].sprintId).toBeNull();
  });

  it('returns empty array when given no stories', () => {
    const result = computeStoryUpdates([], featuresByTicketKey, sprintIdByName);
    expect(result).toHaveLength(0);
  });
});

// ─── computeFeatureSprintUpdates ─────────────────────────────────────────────

describe('computeFeatureSprintUpdates', () => {
  const sprintIdByName = new Map([
    ['Sprint 1', 'sprint-uuid-1'],
    ['Sprint 3', 'sprint-uuid-3'],
  ]);

  it('resolves sprint_id from sprint name', () => {
    const result = computeFeatureSprintUpdates(
      [{ feature_key: 'FEAT-001', sprint_name: 'Sprint 1' }],
      sprintIdByName,
    );

    expect(result).toHaveLength(1);
    expect(result[0].ticketKey).toBe('FEAT-001');
    expect(result[0].sprintId).toBe('sprint-uuid-1');
  });

  it('returns sprintId null when sprint_name is null (parking lot)', () => {
    const result = computeFeatureSprintUpdates(
      [{ feature_key: 'FEAT-001', sprint_name: null }],
      sprintIdByName,
    );

    expect(result[0].sprintId).toBeNull();
  });

  it('returns sprintId null when sprint_name does not match any known sprint', () => {
    const result = computeFeatureSprintUpdates(
      [{ feature_key: 'FEAT-001', sprint_name: 'Sprint 99' }],
      sprintIdByName,
    );

    expect(result[0].sprintId).toBeNull();
  });

  it('handles a mix of matching, unmatched and null sprint names', () => {
    const result = computeFeatureSprintUpdates(
      [
        { feature_key: 'FEAT-001', sprint_name: 'Sprint 1' },
        { feature_key: 'FEAT-002', sprint_name: null },
        { feature_key: 'FEAT-003', sprint_name: 'Sprint 99' },
        { feature_key: 'FEAT-004', sprint_name: 'Sprint 3' },
      ],
      sprintIdByName,
    );

    expect(result[0].sprintId).toBe('sprint-uuid-1');
    expect(result[1].sprintId).toBeNull();
    expect(result[2].sprintId).toBeNull();
    expect(result[3].sprintId).toBe('sprint-uuid-3');
  });

  it('returns empty array when given no features', () => {
    const result = computeFeatureSprintUpdates([], sprintIdByName);
    expect(result).toHaveLength(0);
  });
});
