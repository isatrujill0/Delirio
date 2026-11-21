import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { upsertMood, lastDays, moodTrend, validateVitals, isoDay, VITAL_RANGES, simulateVitalsStep, SIM_RANGES } from '../../src/services/wellbeing';
import type { MoodValue } from '../../src/types';

const cfg = (seed: number, numRuns = 300) => ({ seed, numRuns });
const value = fc.constantFrom<MoodValue>(1, 2, 3, 4, 5);
const day = fc.integer({ min: 0, max: 60 }).map((n) => isoDay(new Date(2026, 8, 1 + n)));
// A valid mood list: sorted, one entry per date.
const moodList = fc.uniqueArray(fc.record({ date: day, value }), { selector: (m) => m.date, maxLength: 20 })
  .map((l) => [...l].sort((a, b) => a.date.localeCompare(b.date)));

describe('wellbeing: upsertMood', () => {
  it('result has one entry per date, sorted, and contains the new entry', () => {
    fc.assert(fc.property(moodList, day, value, (l, d, v) => {
      const out = upsertMood(l, d, v);
      const dates = out.map((m) => m.date);
      expect(new Set(dates).size).toBe(dates.length);
      expect([...dates].sort()).toEqual(dates);
      expect(out.find((m) => m.date === d)).toEqual({ date: d, value: v, demo: false }); // logged by the patient: never demo
    }), cfg(501));
  });
  it('idempotent for the same date/value', () => {
    fc.assert(fc.property(moodList, day, value, (l, d, v) => {
      const once = upsertMood(l, d, v);
      expect(upsertMood(once, d, v)).toEqual(once);
    }), cfg(502));
  });
  it('last write wins; other dates untouched; length grows by at most 1', () => {
    fc.assert(fc.property(moodList, day, value, value, (l, d, v1, v2) => {
      const out = upsertMood(upsertMood(l, d, v1), d, v2);
      expect(out.find((m) => m.date === d)!.value).toBe(v2);
      expect(out.filter((m) => m.date !== d)).toEqual(l.filter((m) => m.date !== d));
      expect(out.length).toBe(l.some((m) => m.date === d) ? l.length : l.length + 1);
    }), cfg(503));
  });
  it('does not mutate its input', () => {
    fc.assert(fc.property(moodList, day, value, (l, d, v) => {
      const snap = JSON.stringify(l);
      upsertMood(l, d, v);
      expect(JSON.stringify(l)).toBe(snap);
    }), cfg(504));
  });
  it('upserts on different dates commute', () => {
    fc.assert(fc.property(moodList, day, day, value, value, (l, d1, d2, v1, v2) => {
      fc.pre(d1 !== d2);
      expect(upsertMood(upsertMood(l, d1, v1), d2, v2)).toEqual(upsertMood(upsertMood(l, d2, v2), d1, v1));
    }), cfg(505));
  });
});

describe('wellbeing: lastDays', () => {
  const now = fc.date({ min: new Date(2020, 0, 1), max: new Date(2040, 0, 1), noInvalidDate: true });
  it('length n, consecutive dates ending today, values match the list', () => {
    fc.assert(fc.property(moodList, now, fc.integer({ min: 1, max: 40 }), (l, n, len) => {
      const out = lastDays(l, n, len);
      expect(out).toHaveLength(len);
      expect(out[out.length - 1].date).toBe(isoDay(n));
      for (let i = 1; i < out.length; i++) {
        const a = new Date(out[i - 1].date + 'T12:00:00');
        a.setDate(a.getDate() + 1);
        expect(isoDay(a)).toBe(out[i].date);
      }
      for (const o of out) expect(o.value).toBe(l.find((m) => m.date === o.date)?.value ?? null);
    }), cfg(506));
  });
  it('defaults to 7 days', () => {
    expect(lastDays([], new Date(2026, 10, 18))).toHaveLength(7);
  });
  it('dates are unique even across DST/month/year boundaries', () => {
    fc.assert(fc.property(now, (n) => {
      const out = lastDays([], n, 30).map((o) => o.date);
      expect(new Set(out).size).toBe(30);
    }), cfg(507));
  });
});

describe('wellbeing: moodTrend', () => {
  const vals = fc.array(fc.integer({ min: 1, max: 5 }), { maxLength: 20 });
  it('pocos-datos when fewer than 3 logged values (nulls ignored)', () => {
    fc.assert(fc.property(fc.array(fc.option(fc.integer({ min: 1, max: 5 }), { nil: null }), { maxLength: 15 }), (v) => {
      const logged = v.filter((x) => x !== null).length;
      expect(moodTrend(v) === 'pocos-datos').toBe(logged < 3);
    }), cfg(508));
  });
  it('constant series is estable', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 5 }), fc.integer({ min: 3, max: 20 }), (x, n) => {
      expect(moodTrend(Array(n).fill(x))).toBe('estable');
    }), cfg(509));
  });
  it('strictly increasing series with a big enough step is mejora; its reverse is baja (symmetry)', () => {
    const flip = { mejora: 'baja', baja: 'mejora', estable: 'estable', 'pocos-datos': 'pocos-datos' } as const;
    fc.assert(fc.property(fc.uniqueArray(fc.integer({ min: 1, max: 5 }), { minLength: 3, maxLength: 5 }), (u) => {
      const inc = [...u].sort((a, b) => a - b);
      const t = moodTrend(inc);
      expect(moodTrend([...inc].reverse())).toBe(flip[t]);
    }), cfg(510));
    expect(moodTrend([1, 2, 4, 5])).toBe('mejora');
    expect(moodTrend([5, 4, 2, 1])).toBe('baja');
  });
  it('symmetry: reversing any series flips mejora<->baja only when length is even (halves swap evenly)', () => {
    const flip = { mejora: 'baja', baja: 'mejora', estable: 'estable', 'pocos-datos': 'pocos-datos' } as const;
    fc.assert(fc.property(vals.filter((v) => v.length % 2 === 0), (v) => {
      expect(moodTrend([...v].reverse())).toBe(flip[moodTrend(v)]);
    }), cfg(511));
  });
  it('mirroring values (x -> 6-x) flips mejora<->baja', () => {
    const flip = { mejora: 'baja', baja: 'mejora', estable: 'estable', 'pocos-datos': 'pocos-datos' } as const;
    fc.assert(fc.property(vals, (v) => {
      expect(moodTrend(v.map((x) => 6 - x))).toBe(flip[moodTrend(v)]);
    }), cfg(512));
  });
  it('nulls interleaved do not change the result', () => {
    fc.assert(fc.property(vals, (v) => {
      expect(moodTrend(v.flatMap((x) => [x, null]))).toBe(moodTrend(v));
    }), cfg(513));
  });
});

describe('wellbeing: validateVitals', () => {
  const R = VITAL_RANGES;
  const inRange = fc.record({
    heartRate: fc.integer({ min: R.heartRate.min, max: R.heartRate.max }),
    respRate: fc.integer({ min: R.respRate.min, max: R.respRate.max }),
    spo2: fc.integer({ min: R.spo2.min, max: R.spo2.max }),
  });
  it('in-range values never error', () => {
    fc.assert(fc.property(inRange, (v) => { expect(validateVitals(v)).toEqual({}); }), cfg(514));
  });
  it('an out-of-range (or non-finite) field always errors, only on that field', () => {
    const field = fc.constantFrom('heartRate', 'respRate', 'spo2' as const);
    fc.assert(fc.property(inRange, field, fc.boolean(), fc.integer({ min: 1, max: 1000 }), (v, f, high, d) => {
      const r = R[f as keyof typeof R];
      const bad = high ? r.max + d : r.min - d;
      const errs = validateVitals({ ...v, [f]: bad });
      expect(Object.keys(errs)).toEqual([f]);
    }), cfg(515));
    fc.assert(fc.property(inRange, fc.constantFrom(NaN, Infinity, -Infinity), (v, bad) => {
      expect(Object.keys(validateVitals({ ...v, heartRate: bad }))).toEqual(['heartRate']);
    }), cfg(516, 20));
  });
  it('boundaries are inclusive', () => {
    expect(validateVitals({ heartRate: R.heartRate.min, respRate: R.respRate.max, spo2: R.spo2.max })).toEqual({});
  });
});

describe('wellbeing: simulateVitalsStep (labelled demo simulation)', () => {
  const vit = fc.record({ heartRate: fc.integer({ min: -50, max: 300 }), respRate: fc.integer({ min: -10, max: 100 }), spo2: fc.integer({ min: 0, max: 120 }) });
  const rand = fc.double({ min: 0, max: 1, maxExcluded: true, noNaN: true });
  it('always stays inside the plausible ranges, whatever the starting values', () => {
    fc.assert(fc.property(vit, rand, (v, r) => {
      const n = simulateVitalsStep(v, () => r);
      for (const k of Object.keys(SIM_RANGES) as (keyof typeof SIM_RANGES)[]) {
        expect(Number.isInteger(n[k])).toBe(true);
        expect(n[k]).toBeGreaterThanOrEqual(SIM_RANGES[k].min);
        expect(n[k]).toBeLessThanOrEqual(SIM_RANGES[k].max);
      }
    }), cfg(620, 500));
  });
  it('from an in-range value, each step moves at most `step` (no jumps)', () => {
    const inRange = fc.record({ heartRate: fc.integer({ min: 68, max: 92 }), respRate: fc.integer({ min: 14, max: 20 }), spo2: fc.integer({ min: 94, max: 98 }) });
    fc.assert(fc.property(inRange, rand, (v, r) => {
      const n = simulateVitalsStep(v, () => r);
      for (const k of Object.keys(SIM_RANGES) as (keyof typeof SIM_RANGES)[]) expect(Math.abs(n[k] - v[k])).toBeLessThanOrEqual(SIM_RANGES[k].step);
    }), cfg(621, 500));
  });
  it('a long walk keeps moving (it is not stuck) and never leaves the ranges', () => {
    fc.assert(fc.property(fc.integer(), (seed) => {
      let s = seed | 0;
      const r = () => { s = (s * 1103515245 + 12345) | 0; return ((s >>> 0) % 10000) / 10000; };
      let v = { heartRate: 72, respRate: 16, spo2: 97 };
      const seen = new Set<number>();
      for (let i = 0; i < 200; i++) { v = simulateVitalsStep(v, r); seen.add(v.heartRate); }
      expect(seen.size).toBeGreaterThan(1);
    }), cfg(622, 100));
  });
});
