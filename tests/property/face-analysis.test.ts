import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { summarizeFace, rangeLabel, type FaceSample } from '../../src/services/faceAnalysis';

const cfg = (seed: number, numRuns = 300) => ({ seed, numRuns });
const sample = fc.record({ t: fc.double({ min: 0, max: 600, noNaN: true }), y: fc.option(fc.double({ min: 0, max: 1, noNaN: true }), { nil: null }) });
const series = fc.array(sample, { maxLength: 200 }).map((ss) => [...ss].sort((a, b) => a.t - b.t));

describe('faceAnalysis: summarizeFace (exercise summary, not medical)', () => {
  it('percentages stay in 0–100, counts are non-negative integers, never NaN', () => {
    fc.assert(fc.property(series, (ss) => {
      const r = summarizeFace(ss);
      for (const v of [r.visiblePct, r.rangePct]) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100); }
      expect(Number.isInteger(r.moves)).toBe(true);
      expect(r.moves).toBeGreaterThanOrEqual(0);
      expect(r.seconds).toBeGreaterThanOrEqual(0);
    }), cfg(690));
  });
  it('visiblePct is exactly the share of samples where the face was seen', () => {
    fc.assert(fc.property(series.filter((s) => s.length > 0), (ss) => {
      expect(summarizeFace(ss).visiblePct).toBe(Math.round((ss.filter((s) => s.y !== null).length / ss.length) * 100));
    }), cfg(691));
  });
  it('a still face gives no movements and no range; small jitter below the noise threshold is ignored', () => {
    fc.assert(fc.property(fc.double({ min: 0.2, max: 0.8, noNaN: true }), fc.array(fc.double({ min: -0.009, max: 0.009, noNaN: true }), { minLength: 2, maxLength: 100 }), (y0, jitter) => {
      const ss: FaceSample[] = jitter.map((j, i) => ({ t: i / 10, y: y0 + j }));
      const r = summarizeFace(ss);
      expect(r.moves).toBe(0);
      expect(r.rangePct).toBeLessThanOrEqual(2);
    }), cfg(692));
  });
  it('n clear up-and-down swings are counted as about 2n direction changes, with a wide range', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 8 }), fc.double({ min: 0.08, max: 0.2, noNaN: true }), (n, amp) => {
      const ss: FaceSample[] = [];
      for (let i = 0; i <= n * 40; i++) ss.push({ t: i / 10, y: 0.5 + amp * Math.sin((i / 40) * 2 * Math.PI) });
      const r = summarizeFace(ss);
      expect(r.moves).toBeGreaterThanOrEqual(2 * n - 1);
      expect(r.moves).toBeLessThanOrEqual(2 * n + 1);
      expect(rangeLabel(r.rangePct)).toBe('Movimiento amplio');
    }), cfg(693, 100));
  });
  it('rangeLabel buckets', () => {
    expect(rangeLabel(2)).toBe('Movimiento pequeño');
    expect(rangeLabel(6)).toBe('Movimiento moderado');
    expect(rangeLabel(20)).toBe('Movimiento amplio');
  });
});
