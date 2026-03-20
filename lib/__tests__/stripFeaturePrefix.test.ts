import { describe, it, expect } from 'vitest';
import { stripFeaturePrefix } from '../stripFeaturePrefix';

describe('stripFeaturePrefix', () => {
  it('strips prefix when separated by " - "', () => {
    expect(
      stripFeaturePrefix('CIAM Platform Integration - Discovery and design', 'CIAM Platform Integration')
    ).toBe('Discovery and design');
  });

  it('strips prefix when separated by ": "', () => {
    expect(
      stripFeaturePrefix('CIAM Platform Integration: Discovery and design', 'CIAM Platform Integration')
    ).toBe('Discovery and design');
  });

  it('returns title unchanged when no prefix is present', () => {
    expect(
      stripFeaturePrefix('Discovery and design', 'CIAM Platform Integration')
    ).toBe('Discovery and design');
  });

  it('is case-insensitive when matching the prefix', () => {
    expect(
      stripFeaturePrefix('ciam platform integration - Discovery and design', 'CIAM Platform Integration')
    ).toBe('Discovery and design');
  });

  it('returns an empty story title unchanged', () => {
    expect(stripFeaturePrefix('', 'CIAM Platform Integration')).toBe('');
  });

  it('returns story title unchanged when feature title is empty', () => {
    expect(stripFeaturePrefix('Discovery and design', '')).toBe('Discovery and design');
  });

  it('does not strip when separator is missing (title is exact prefix only)', () => {
    expect(
      stripFeaturePrefix('CIAM Platform Integration', 'CIAM Platform Integration')
    ).toBe('CIAM Platform Integration');
  });

  it('trims the result after stripping', () => {
    expect(
      stripFeaturePrefix('CIAM Platform Integration -  spaced out title ', 'CIAM Platform Integration')
    ).toBe('spaced out title');
  });
});
