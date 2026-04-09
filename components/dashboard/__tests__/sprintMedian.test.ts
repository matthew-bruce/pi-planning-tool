import { describe, expect, it } from 'vitest';

// Inline the pure function from LiveDashboard for unit testing
function getSprintMedian(loads: number[]): number {
  if (loads.length === 0) return 0;
  const sorted = [...loads].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

describe('getSprintMedian', () => {
  it('returns 0 for empty array', () => {
    expect(getSprintMedian([])).toBe(0);
  });

  it('returns the single value for one-element array', () => {
    expect(getSprintMedian([7])).toBe(7);
  });

  it('returns the middle value for odd-length array', () => {
    expect(getSprintMedian([1, 3, 5])).toBe(3);
    expect(getSprintMedian([10, 20, 30, 40, 50])).toBe(30);
  });

  it('returns the rounded average of middle two for even-length array', () => {
    expect(getSprintMedian([1, 2, 3, 4])).toBe(3);
    expect(getSprintMedian([10, 20])).toBe(15);
  });

  it('handles unsorted input correctly', () => {
    expect(getSprintMedian([5, 1, 3])).toBe(3);
    expect(getSprintMedian([50, 10, 30, 20, 40])).toBe(30);
  });

  it('does not mutate the original array', () => {
    const arr = [3, 1, 2];
    getSprintMedian(arr);
    expect(arr).toEqual([3, 1, 2]);
  });
});
