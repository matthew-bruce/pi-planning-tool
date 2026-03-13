import { describe, expect, it } from 'vitest';
import { generateSprintPreview } from '../sprintGeneration';

describe('sprintGeneration', () => {
  it('generates sequential sprint numbers and names from latest sprint', () => {
    const preview = generateSprintPreview({
      startDate: '2026-06-17',
      sprintCount: 3,
      sprintLengthDays: 14,
      latestSprintNumber: 6,
    });

    expect(preview.map((s) => s.sprint_number)).toEqual([7, 8, 9]);
    expect(preview.map((s) => s.name)).toEqual(['Sprint 7', 'Sprint 8', 'Sprint 9']);
  });

  it('generates expected date windows for 14-day sprints', () => {
    const preview = generateSprintPreview({
      startDate: '2026-06-17',
      sprintCount: 2,
      sprintLengthDays: 14,
      latestSprintNumber: 6,
    });

    expect(preview[0]).toMatchObject({ start_date: '2026-06-17', end_date: '2026-06-30' });
    expect(preview[1]).toMatchObject({ start_date: '2026-07-01', end_date: '2026-07-14' });
  });
});
