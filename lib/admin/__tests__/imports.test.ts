import { describe, expect, it } from 'vitest';
import { buildValueStreamResolutionPlan } from '../importHelpers';

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
