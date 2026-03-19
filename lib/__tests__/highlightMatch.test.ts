import { describe, it, expect } from 'vitest';
import { highlightMatch } from '../highlightMatch';

describe('highlightMatch', () => {
  it('returns a single highlighted segment for a basic match', () => {
    expect(highlightMatch('Hello world', 'world')).toEqual([
      { text: 'Hello ', highlight: false },
      { text: 'world', highlight: true },
    ]);
  });

  it('matches case-insensitively but preserves original casing in output', () => {
    expect(highlightMatch('Hello World', 'world')).toEqual([
      { text: 'Hello ', highlight: false },
      { text: 'World', highlight: true },
    ]);
  });

  it('returns a single non-highlighted segment when there is no match', () => {
    expect(highlightMatch('Hello world', 'xyz')).toEqual([
      { text: 'Hello world', highlight: false },
    ]);
  });

  it('returns a single non-highlighted segment for an empty search term', () => {
    expect(highlightMatch('Hello world', '')).toEqual([
      { text: 'Hello world', highlight: false },
    ]);
  });

  it('returns a single non-highlighted segment for a single-character search term', () => {
    expect(highlightMatch('Hello world', 'w')).toEqual([
      { text: 'Hello world', highlight: false },
    ]);
  });

  it('handles multiple matches in one string', () => {
    expect(highlightMatch('foo bar foo baz foo', 'foo')).toEqual([
      { text: 'foo', highlight: true },
      { text: ' bar ', highlight: false },
      { text: 'foo', highlight: true },
      { text: ' baz ', highlight: false },
      { text: 'foo', highlight: true },
    ]);
  });
});
