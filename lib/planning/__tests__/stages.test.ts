import { describe, expect, it } from 'vitest';
import {
  PLANNING_STAGES,
  getStageById,
  isValidStageId,
} from '../stages';

describe('PLANNING_STAGES', () => {
  it('has exactly six stages in order', () => {
    expect(PLANNING_STAGES).toHaveLength(6);
    expect(PLANNING_STAGES.map((stage) => stage.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('every stage has id, name, shortLabel and description populated', () => {
    PLANNING_STAGES.forEach((stage) => {
      expect(typeof stage.id).toBe('number');
      expect(stage.name.length).toBeGreaterThan(0);
      expect(stage.shortLabel.length).toBeGreaterThan(0);
      expect(stage.description.length).toBeGreaterThan(0);
    });
  });

  it('stage ids are unique', () => {
    const ids = PLANNING_STAGES.map((stage) => stage.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getStageById', () => {
  it('returns the matching stage for a valid id', () => {
    expect(getStageById(1)?.name).toBe('Business Context & Vision');
    expect(getStageById(2)?.shortLabel).toBe('Draft Plan');
    expect(getStageById(6)?.shortLabel).toBe('Complete');
  });

  it('returns null for null input', () => {
    expect(getStageById(null)).toBeNull();
  });

  it('returns null for out-of-range ids', () => {
    expect(getStageById(0)).toBeNull();
    expect(getStageById(7)).toBeNull();
    expect(getStageById(-1)).toBeNull();
    expect(getStageById(100)).toBeNull();
  });
});

describe('isValidStageId', () => {
  it('accepts integers 1 through 6', () => {
    expect(isValidStageId(1)).toBe(true);
    expect(isValidStageId(2)).toBe(true);
    expect(isValidStageId(3)).toBe(true);
    expect(isValidStageId(4)).toBe(true);
    expect(isValidStageId(5)).toBe(true);
    expect(isValidStageId(6)).toBe(true);
  });

  it('rejects out-of-range integers', () => {
    expect(isValidStageId(0)).toBe(false);
    expect(isValidStageId(7)).toBe(false);
    expect(isValidStageId(-1)).toBe(false);
    expect(isValidStageId(999)).toBe(false);
  });

  it('rejects non-integer numbers', () => {
    expect(isValidStageId(1.5)).toBe(false);
    expect(isValidStageId(Number.NaN)).toBe(false);
    expect(isValidStageId(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('rejects null and undefined', () => {
    expect(isValidStageId(null)).toBe(false);
    expect(isValidStageId(undefined)).toBe(false);
  });

  it('rejects non-number values', () => {
    expect(isValidStageId('1')).toBe(false);
    expect(isValidStageId('two')).toBe(false);
    expect(isValidStageId({})).toBe(false);
    expect(isValidStageId([])).toBe(false);
    expect(isValidStageId(true)).toBe(false);
  });
});
