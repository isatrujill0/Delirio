import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { volumeToGain } from '../../src/services/audioEngine';

const cfg = (seed: number, numRuns = 300) => ({ seed, numRuns });
const anyVolume = fc.oneof(fc.double({ noNaN: false }), fc.integer({ min: -500, max: 500 }), fc.constantFrom(0, -0, 100, 1, NaN, Infinity, -Infinity));
const finiteVolume = fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 });

describe('audio: volumeToGain', () => {
  it('output is always in [0,1] and never NaN', () => {
    fc.assert(fc.property(anyVolume, fc.boolean(), (v, muted) => {
      const g = volumeToGain(v, muted);
      expect(Number.isNaN(g)).toBe(false);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(1);
    }), cfg(520, 500));
  });
  it('muted is always 0', () => {
    fc.assert(fc.property(anyVolume, (v) => { expect(volumeToGain(v, true)).toBe(0); }), cfg(521));
  });
  it('non-decreasing in volume (finite volumes)', () => {
    fc.assert(fc.property(finiteVolume, finiteVolume, (a, b) => {
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      expect(volumeToGain(lo, false)).toBeLessThanOrEqual(volumeToGain(hi, false));
    }), cfg(522, 500));
    fc.assert(fc.property(fc.integer({ min: 0, max: 99 }), (v) => {
      expect(volumeToGain(v, false)).toBeLessThanOrEqual(volumeToGain(v + 1, false));
    }), cfg(523, 100));
  });
  it('volume <= 0 gives 0; volumes 1..100 unmuted are audible; >= 100 saturates at 1', () => {
    fc.assert(fc.property(fc.double({ max: 0, noNaN: true }), (v) => { expect(volumeToGain(v, false)).toBe(0); }), cfg(524));
    fc.assert(fc.property(fc.integer({ min: 1, max: 100 }), (v) => { expect(volumeToGain(v, false)).toBeGreaterThan(0); }), cfg(525, 100));
    fc.assert(fc.property(fc.double({ min: 100, max: 1e9, noNaN: true }), (v) => { expect(volumeToGain(v, false)).toBe(1); }), cfg(526));
    expect(volumeToGain(0, false)).toBe(0);
    expect(volumeToGain(100, false)).toBe(1);
  });
});
