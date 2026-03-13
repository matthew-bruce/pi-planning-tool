import { describe, expect, it } from 'vitest';
import { getLatestSprintNumber, getNextSprintNumber } from '../sprintNumbering';

describe('sprintNumbering', () => {
  it('returns latest sprint number from provided list', () => {
    const latest = getLatestSprintNumber([
      { id: '1', planning_cycle_id: 'c1', sprint_number: 4, name: 'Sprint 4', start_date: '2026-01-01', end_date: '2026-01-14' },
      { id: '2', planning_cycle_id: 'c1', sprint_number: 6, name: 'Sprint 6', start_date: '2026-01-15', end_date: '2026-01-28' },
      { id: '3', planning_cycle_id: 'c2', sprint_number: 5, name: 'Sprint 5', start_date: '2026-01-01', end_date: '2026-01-14' },
    ]);

    expect(latest).toBe(6);
  });

  it('returns zero when list is empty', () => {
    expect(getLatestSprintNumber([])).toBe(0);
  });

  it('calculates next sprint number', () => {
    expect(getNextSprintNumber(6)).toBe(7);
  });
});
