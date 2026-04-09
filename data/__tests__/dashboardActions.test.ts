import { describe, expect, it } from 'vitest';
import { getContextualReading, dashboardActions } from '../dashboardActions';

describe('getContextualReading', () => {
  it('returns convergence success message with stage info', () => {
    const msg = getContextualReading('convergence', 'success', '80', '3');
    expect(msg).toContain('On track');
    expect(msg).toContain('Stage 3');
  });

  it('returns convergence warning message — early stage advice', () => {
    const msg = getContextualReading('convergence', 'warning', '30', '2');
    expect(msg).toContain('recoverable');
  });

  it('returns convergence warning message — late stage advice', () => {
    const msg = getContextualReading('convergence', 'warning', '70', '4');
    expect(msg).toContain('Sorting Frame');
  });

  it('returns convergence danger message — early stage', () => {
    const msg = getContextualReading('convergence', 'danger', '10', '2');
    expect(msg).toContain('pause');
  });

  it('returns convergence danger message — late stage', () => {
    const msg = getContextualReading('convergence', 'danger', '50', '5');
    expect(msg).toContain('facilitator action');
  });

  it('returns parking lot messages for all statuses', () => {
    expect(getContextualReading('parkingLot', 'success')).toContain('clear');
    expect(getContextualReading('parkingLot', 'warning')).toContain('clearing');
    expect(getContextualReading('parkingLot', 'danger')).toContain('decision');
  });

  it('returns dependency messages for all statuses', () => {
    expect(getContextualReading('dependencies', 'success')).toContain('good');
    expect(getContextualReading('dependencies', 'warning')).toContain('risk');
    expect(getContextualReading('dependencies', 'danger')).toContain('Blocked');
  });

  it('returns freshness messages for all statuses', () => {
    expect(getContextualReading('freshness', 'success')).toContain('current');
    expect(getContextualReading('freshness', 'warning')).toContain('ageing');
    expect(getContextualReading('freshness', 'danger')).toContain('hour');
  });

  it('returns sprint load messages', () => {
    expect(getContextualReading('sprintLoad', 'success')).toContain('evenly');
    expect(getContextualReading('sprintLoad', 'warning', 'Sprint 3')).toContain(
      'Sprint 3',
    );
    expect(getContextualReading('sprintLoad', 'danger', 'Sprint 5')).toContain(
      'Sprint 5',
    );
  });

  it('returns empty string for unknown metric', () => {
    expect(getContextualReading('unknown', 'success')).toBe('');
  });
});

describe('dashboardActions', () => {
  it('has entries for all expected metrics', () => {
    expect(dashboardActions).toHaveProperty('convergence');
    expect(dashboardActions).toHaveProperty('parkingLot');
    expect(dashboardActions).toHaveProperty('dependencies');
    expect(dashboardActions).toHaveProperty('freshness');
    expect(dashboardActions).toHaveProperty('sprintLoad');
  });

  it('each metric has all three status handlers', () => {
    Object.values(dashboardActions).forEach((lookup) => {
      expect(typeof lookup.success).toBe('function');
      expect(typeof lookup.warning).toBe('function');
      expect(typeof lookup.danger).toBe('function');
    });
  });
});
