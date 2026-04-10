import { describe, expect, it } from 'vitest';
import {
  convergenceThresholds,
  parkingLotThresholds,
  getConvergenceStatus,
  getConvergenceLabel,
  getParkingLotStatus,
} from '../dashboardThresholds';

describe('convergenceThresholds', () => {
  it('has entries for all 6 stages', () => {
    expect(Object.keys(convergenceThresholds)).toHaveLength(6);
    for (let i = 1; i <= 6; i++) {
      expect(convergenceThresholds[i]).toBeDefined();
    }
  });

  it('stage 6 expects 100%', () => {
    expect(convergenceThresholds[6].successRange).toEqual([100, 100]);
  });
});

describe('getConvergenceStatus', () => {
  it('returns success when within range', () => {
    expect(getConvergenceStatus(5, 1)).toBe('success');
    expect(getConvergenceStatus(50, 2)).toBe('success');
    expect(getConvergenceStatus(75, 3)).toBe('success');
    expect(getConvergenceStatus(90, 4)).toBe('success');
    expect(getConvergenceStatus(100, 5)).toBe('success');
    expect(getConvergenceStatus(100, 6)).toBe('success');
  });

  it('returns warning when above band (over-committing)', () => {
    // Stage 1: band is 0–10, anything above 10 is over-committing
    expect(getConvergenceStatus(15, 1)).toBe('warning');
    expect(getConvergenceStatus(50, 1)).toBe('warning');
    // Stage 2: band is 40–70, 75 is above
    expect(getConvergenceStatus(75, 2)).toBe('warning');
    // Stage 3: band is 70–85, 92 is above
    expect(getConvergenceStatus(92, 3)).toBe('warning');
    // Stage 4: band is 85–95, 98 is above
    expect(getConvergenceStatus(98, 4)).toBe('warning');
  });

  it('returns warning when slightly below range', () => {
    expect(getConvergenceStatus(35, 2)).toBe('warning');
    expect(getConvergenceStatus(60, 3)).toBe('warning');
  });

  it('returns danger when far below range (gap > 15)', () => {
    expect(getConvergenceStatus(20, 2)).toBe('danger');
    expect(getConvergenceStatus(40, 3)).toBe('danger');
    expect(getConvergenceStatus(60, 4)).toBe('danger');
  });

  it('falls back to stage 3 thresholds for unknown stage', () => {
    expect(getConvergenceStatus(75, 99)).toBe('success');
    expect(getConvergenceStatus(40, 99)).toBe('danger');
  });
});

describe('getConvergenceLabel', () => {
  it('returns "On track" when within band', () => {
    expect(getConvergenceLabel(5, 1)).toBe('On track');
    expect(getConvergenceLabel(50, 2)).toBe('On track');
    expect(getConvergenceLabel(80, 3)).toBe('On track');
    expect(getConvergenceLabel(90, 4)).toBe('On track');
    expect(getConvergenceLabel(100, 6)).toBe('On track');
  });

  it('returns "Above target" when above band', () => {
    expect(getConvergenceLabel(15, 1)).toBe('Above target');
    expect(getConvergenceLabel(75, 2)).toBe('Above target');
    expect(getConvergenceLabel(92, 3)).toBe('Above target');
    expect(getConvergenceLabel(98, 4)).toBe('Above target');
  });

  it('returns "Behind target" when slightly below band', () => {
    expect(getConvergenceLabel(35, 2)).toBe('Behind target');
    expect(getConvergenceLabel(60, 3)).toBe('Behind target');
  });

  it('returns "Well behind target" when far below band (gap > 15)', () => {
    expect(getConvergenceLabel(20, 2)).toBe('Well behind target');
    expect(getConvergenceLabel(40, 3)).toBe('Well behind target');
    expect(getConvergenceLabel(60, 4)).toBe('Well behind target');
  });
});

describe('parkingLotThresholds', () => {
  it('has entries for all 6 stages', () => {
    expect(Object.keys(parkingLotThresholds)).toHaveLength(6);
  });

  it('stage 1 thresholds are permissive (999)', () => {
    expect(parkingLotThresholds[1].warningCount).toBe(999);
    expect(parkingLotThresholds[1].dangerCount).toBe(999);
  });

  it('stage 6 thresholds are strict', () => {
    expect(parkingLotThresholds[6].warningCount).toBe(1);
    expect(parkingLotThresholds[6].dangerCount).toBe(2);
  });
});

describe('getParkingLotStatus', () => {
  it('returns success below warning threshold', () => {
    expect(getParkingLotStatus(0, 3)).toBe('success');
    expect(getParkingLotStatus(9, 3)).toBe('success');
  });

  it('returns warning between warning and danger', () => {
    expect(getParkingLotStatus(10, 3)).toBe('warning');
    expect(getParkingLotStatus(14, 3)).toBe('warning');
  });

  it('returns danger at or above danger threshold', () => {
    expect(getParkingLotStatus(15, 3)).toBe('danger');
    expect(getParkingLotStatus(100, 3)).toBe('danger');
  });

  it('stage 1 is always success for reasonable counts', () => {
    expect(getParkingLotStatus(100, 1)).toBe('success');
    expect(getParkingLotStatus(500, 1)).toBe('success');
  });
});
