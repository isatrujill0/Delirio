import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { BIRD_R, COL_W, GAP_H, BIRD_X, clampBird, gapCentre, headToTarget, hits, initialFlight, stepFlight, type FlightState } from '../../src/services/flight';

const cfg = (seed: number, numRuns = 200) => ({ seed, numRuns });
const mulberry32 = (a: number) => () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const dt = fc.double({ min: 0, max: 0.2, noNaN: true });
const anyTarget = fc.oneof(fc.double({ min: -2, max: 3, noNaN: true }), fc.constantFrom(NaN, Infinity, -Infinity));

const run = (steps: { dt: number; target: number }[], seed: number) => {
  let s: FlightState = initialFlight();
  const rand = mulberry32(seed);
  const events = [];
  for (const st of steps) {
    const r = stepFlight(s, st.dt, st.target, rand);
    s = r.state;
    events.push(...r.events);
  }
  return { s, events };
};

describe('flight: Vuelo del colibrí', () => {
  it('the bird always stays fully on screen and openings never leave the screen, whatever the input', () => {
    fc.assert(fc.property(fc.array(fc.record({ dt, target: anyTarget }), { maxLength: 300 }), fc.integer(), (steps, seed) => {
      let s = initialFlight();
      const rand = mulberry32(seed);
      for (const st of steps) {
        s = stepFlight(s, st.dt, st.target, rand).state;
        expect(s.birdY).toBeGreaterThanOrEqual(BIRD_R);
        expect(s.birdY).toBeLessThanOrEqual(1 - BIRD_R);
        for (const a of s.arches) {
          expect(a.gapY - GAP_H / 2).toBeGreaterThanOrEqual(0);
          expect(a.gapY + GAP_H / 2).toBeLessThanOrEqual(1);
        }
      }
    }), cfg(680));
  });
  it('each arch produces at most one event: either a clean pass (+1) or one bump, never both', () => {
    fc.assert(fc.property(fc.array(fc.record({ dt, target: anyTarget }), { maxLength: 400 }), fc.integer(), (steps, seed) => {
      const { s, events } = run(steps, seed);
      const byArch = new Map<number, string[]>();
      for (const e of events) byArch.set(e.arch, [...(byArch.get(e.arch) ?? []), e.type]);
      for (const types of byArch.values()) expect(types.length).toBe(1);
      expect(s.score).toBe(events.filter((e) => e.type === 'pass').length);
      expect(s.bumps).toBe(events.filter((e) => e.type === 'bump').length);
    }), cfg(681));
  });
  it('autopilot: always aiming at the centre of the next opening clears every arch (the game is fair)', () => {
    fc.assert(fc.property(fc.integer(), (seed) => {
      let s = initialFlight();
      const rand = mulberry32(seed);
      let bumps = 0;
      for (let i = 0; i < 3000; i++) {
        const next = s.arches.find((a) => a.x + COL_W > BIRD_X - BIRD_R);
        const r = stepFlight(s, 1 / 30, next ? next.gapY : 0.5, rand);
        s = r.state;
        bumps += r.events.filter((e) => e.type === 'bump').length;
      }
      expect(bumps).toBe(0);
      expect(s.score).toBeGreaterThan(5);
    }), cfg(682, 40));
  });
  it('helpers: clampBird, gapCentre and headToTarget stay in range; looking straight ahead puts the bird in the middle', () => {
    fc.assert(fc.property(anyTarget, fc.double({ min: 0, max: 1, noNaN: true }), (y, n) => {
      const c = clampBird(y);
      expect(c).toBeGreaterThanOrEqual(BIRD_R);
      expect(c).toBeLessThanOrEqual(1 - BIRD_R);
      const g = gapCentre(n);
      expect(g - GAP_H / 2).toBeGreaterThanOrEqual(0);
      expect(g + GAP_H / 2).toBeLessThanOrEqual(1);
      expect(headToTarget(n, n)).toBeCloseTo(0.5);
    }), cfg(683));
  });
  it('moving the head up raises the bird, down lowers it (monotonic)', () => {
    fc.assert(fc.property(fc.double({ min: 0, max: 1, noNaN: true }), fc.double({ min: 0, max: 1, noNaN: true }), fc.double({ min: 0, max: 1, noNaN: true }), (a, b, n) => {
      if (a <= b) expect(headToTarget(a, n)).toBeLessThanOrEqual(headToTarget(b, n));
    }), cfg(684));
  });
  it('a bird inside the opening never touches the arch', () => {
    fc.assert(fc.property(fc.double({ min: 0, max: 1, noNaN: true }), fc.double({ min: -0.2, max: 1.2, noNaN: true }), fc.double({ min: -1, max: 1, noNaN: true }), (r, x, off) => {
      const gapY = gapCentre(r);
      const y = gapY + off * (GAP_H / 2 - BIRD_R);
      expect(hits({ id: 1, x, gapY, passed: false, bumped: false }, y)).toBe(false);
    }), cfg(685));
  });
});
