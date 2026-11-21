import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
// Importing playlist.ts also loads audioEngine/media (asset imports); Vite handles those in Vitest, so no mocking was needed.
import { wrapIndex } from '../../src/services/playlist';

const cfg = (seed: number, numRuns = 300) => ({ seed, numRuns });
const len = fc.integer({ min: 1, max: 200 });
const idx = fc.integer({ min: -1e6, max: 1e6 });

describe('playlist: wrapIndex', () => {
  it('result in [0, length) for length > 0 and integer inputs', () => {
    fc.assert(fc.property(idx, idx, len, (i, s, n) => {
      const r = wrapIndex(i, s, n);
      expect(Number.isInteger(r)).toBe(true);
      expect(r).toBeGreaterThanOrEqual(0); expect(r).toBeLessThan(n);
    }), cfg(701, 500));
  });
  it('+1 then -1 returns to the (wrapped) start', () => {
    fc.assert(fc.property(idx, len, (i, n) => {
      const start = wrapIndex(i, 0, n);
      expect(wrapIndex(wrapIndex(i, 1, n), -1, n)).toBe(start);
    }), cfg(702));
  });
  it('stepping `length` times returns to start; stepping is additive mod length', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 199 }), len, (i0, n) => {
      const i = i0 % n;
      let cur = i;
      for (let k = 0; k < n; k++) cur = wrapIndex(cur, 1, n);
      expect(cur).toBe(i);
      cur = i;
      for (let k = 0; k < n; k++) cur = wrapIndex(cur, -1, n);
      expect(cur).toBe(i);
    }), cfg(703));
    fc.assert(fc.property(idx, idx, idx, len, (i, a, b, n) => {
      expect(wrapIndex(wrapIndex(i, a, n), b, n)).toBe(wrapIndex(i, a + b, n));
    }), cfg(704));
  });
  it('length <= 0 yields 0', () => {
    fc.assert(fc.property(idx, idx, fc.integer({ min: -50, max: 0 }), (i, s, n) => { expect(wrapIndex(i, s, n)).toBe(0); }), cfg(705));
  });
});
