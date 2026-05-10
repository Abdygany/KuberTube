import { describe, expect, it } from 'vitest';
import { cacheHash, interleave } from './search.utils';

describe('interleave', () => {
  it('interleaves equal-length arrays', () => {
    expect(interleave<string | number>(['a', 'b', 'c'], [1, 2, 3])).toEqual([
      'a', 1, 'b', 2, 'c', 3,
    ]);
  });

  it('appends remainder when arrays differ in length', () => {
    expect(interleave<string | number>(['a', 'b'], [1, 2, 3, 4])).toEqual([
      'a', 1, 'b', 2, 3, 4,
    ]);
  });

  it('handles empty arrays', () => {
    expect(interleave([], ['x', 'y'])).toEqual(['x', 'y']);
    expect(interleave(['x'], [])).toEqual(['x']);
    expect(interleave<number>([], [])).toEqual([]);
  });
});

describe('cacheHash', () => {
  it('produces deterministic 64-char hex hashes', () => {
    const h = cacheHash('react hooks', { freshness: '1y' }, 'youtube');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(cacheHash('react hooks', { freshness: '1y' }, 'youtube')).toBe(h);
  });

  it('is case- and whitespace-insensitive on the query', () => {
    const a = cacheHash('  React Hooks  ', {}, 'brave');
    const b = cacheHash('react hooks', {}, 'brave');
    expect(a).toBe(b);
  });

  it('changes when the provider changes', () => {
    expect(cacheHash('q', {}, 'youtube')).not.toBe(cacheHash('q', {}, 'brave'));
  });

  it('changes when filters change', () => {
    expect(cacheHash('q', { freshness: '6m' }, 'brave')).not.toBe(
      cacheHash('q', { freshness: '1y' }, 'brave'),
    );
  });
});
