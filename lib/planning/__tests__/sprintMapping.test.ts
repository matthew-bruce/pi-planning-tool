import { describe, expect, it } from 'vitest';
import { buildSprintNameSet, getCycleSprintNames, isSprintMappedToCycle } from '../sprintMapping';

describe('sprintMapping', () => {
  it('returns sprint names scoped to a planning cycle', () => {
    const names = getCycleSprintNames(
      [
        { id: '1', planning_cycle_id: 'cycle-a', sprint_number: 7, name: 'Sprint 7', start_date: '2026-06-17', end_date: '2026-06-30' },
        { id: '2', planning_cycle_id: 'cycle-a', sprint_number: 8, name: 'Sprint 8', start_date: '2026-07-01', end_date: '2026-07-14' },
        { id: '3', planning_cycle_id: 'cycle-b', sprint_number: 9, name: 'Sprint 9', start_date: '2026-07-15', end_date: '2026-07-28' },
      ],
      'cycle-a',
    );

    expect(names).toEqual(['Sprint 7', 'Sprint 8']);
  });

  it('checks if sprint name is mapped to selected cycle', () => {
    const sprintSet = buildSprintNameSet(['Sprint 7', 'Sprint 8']);

    expect(isSprintMappedToCycle('Sprint 7', sprintSet)).toBe(true);
    expect(isSprintMappedToCycle('Sprint 10', sprintSet)).toBe(false);
  });
});
