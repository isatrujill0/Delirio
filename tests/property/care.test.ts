import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { nextDose, orderProcedures, splitTimes, validateTreatment, validateProcedure, procTime } from '../../src/services/care';
import { parseHM } from '../../src/services/time';
import type { Procedure, ProcedureStatus, Treatment } from '../../src/types';

const cfg = (seed: number, numRuns = 300) => ({ seed, numRuns });
const p2 = (n: number) => String(n).padStart(2, '0');
const hm = fc.tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 })).map(([h, m]) => `${p2(h)}:${p2(m)}`);
const anyTime = fc.oneof(hm, hm, fc.string(), fc.constantFrom('24:00', '8:5', '12:60', ''));
const treatment = fc.record({
  id: fc.uuid(), name: fc.string(), description: fc.string(), startDate: fc.constant('2026-11-01'),
  frequency: fc.string(), observations: fc.string(), times: fc.array(anyTime, { maxLength: 6 }),
}) as fc.Arbitrary<Treatment>;
const now = fc.date({ min: new Date(2020, 0, 1), max: new Date(2040, 0, 1), noInvalidDate: true });

describe('care: nextDose', () => {
  it('null iff there are no valid times', () => {
    fc.assert(fc.property(fc.array(treatment, { maxLength: 5 }), now, (ts, n) => {
      const any = ts.some((t) => t.times.some((x) => parseHM(x) !== null));
      expect(nextDose(ts, n) === null).toBe(!any);
    }), cfg(301, 500));
  });
  it('inMinutes in [0,1439]; time belongs to the returned treatment; tomorrow flag consistent', () => {
    fc.assert(fc.property(fc.array(treatment, { maxLength: 5 }), now, (ts, n) => {
      const r = nextDose(ts, n);
      if (!r) return;
      const nowMin = n.getHours() * 60 + n.getMinutes();
      const m = parseHM(r.time)!;
      expect(r.inMinutes).toBeGreaterThanOrEqual(0);
      expect(r.inMinutes).toBeLessThanOrEqual(1439);
      expect(ts).toContain(r.treatment);
      expect(r.treatment.times).toContain(r.time);
      expect(r.tomorrow).toBe(m < nowMin);
      expect(r.inMinutes).toBe(r.tomorrow ? m + 1440 - nowMin : m - nowMin);
      expect((nowMin + r.inMinutes) % 1440).toBe(m);
    }), cfg(302, 500));
  });
  it('oracle: no other valid time is strictly sooner', () => {
    fc.assert(fc.property(fc.array(treatment, { maxLength: 5 }), now, (ts, n) => {
      const r = nextDose(ts, n);
      const nowMin = n.getHours() * 60 + n.getMinutes();
      const all = ts.flatMap((t) => t.times).map(parseHM).filter((x): x is number => x !== null)
        .map((m) => (m - nowMin + 1440) % 1440);
      if (!r) { expect(all).toHaveLength(0); return; }
      expect(Math.min(...all)).toBe(r.inMinutes);
    }), cfg(303, 500));
  });
  it('a dose exactly now is "today" with inMinutes 0', () => {
    fc.assert(fc.property(now, (n) => {
      const t = { id: 'a', name: 'x', description: '', startDate: '2026-01-01', frequency: 'x', observations: '', times: [`${p2(n.getHours())}:${p2(n.getMinutes())}`] };
      const r = nextDose([t], n)!;
      expect(r.inMinutes).toBe(0);
      expect(r.tomorrow).toBe(false);
    }), cfg(304));
  });
});

const statuses: ProcedureStatus[] = ['programado', 'confirmado', 'realizado', 'reprogramado', 'cancelado'];
const procDate = fc.oneof(
  fc.integer({ min: 0, max: 3000 }).map((n) => new Date(2026, 0, 1, 0, n * 17).toISOString().slice(0, 16)),
  fc.constantFrom('', 'nope', '2026-13-45T99:99'),
);
const procedure = fc.record({
  id: fc.uuid(), name: fc.string(), description: fc.string(), date: procDate, status: fc.constantFrom(...statuses),
}) as fc.Arbitrary<Procedure>;
const isDone = (p: Procedure) => p.status === 'realizado' || p.status === 'cancelado';

describe('care: orderProcedures', () => {
  it('pending ascending, past descending, no status mixing', () => {
    fc.assert(fc.property(fc.array(procedure, { maxLength: 15 }), (list) => {
      const { pending, past } = orderProcedures(list);
      for (let i = 1; i < pending.length; i++) expect(procTime(pending[i - 1])).toBeLessThanOrEqual(procTime(pending[i]));
      for (let i = 1; i < past.length; i++) expect(procTime(past[i - 1])).toBeGreaterThanOrEqual(procTime(past[i]));
      expect(pending.some(isDone)).toBe(false);
      expect(past.every(isDone)).toBe(true);
    }), cfg(305));
  });
  it('partition covers exactly the valid-date inputs (as a multiset)', () => {
    fc.assert(fc.property(fc.array(procedure, { maxLength: 15 }), (list) => {
      const { pending, past } = orderProcedures(list);
      const valid = list.filter((p) => Number.isFinite(procTime(p)));
      expect([...pending, ...past].map((p) => p.id).sort()).toEqual(valid.map((p) => p.id).sort());
    }), cfg(306));
  });
  it('does not mutate its input', () => {
    fc.assert(fc.property(fc.array(procedure, { maxLength: 15 }), (list) => {
      const copy = list.map((p) => p.id);
      orderProcedures(list);
      expect(list.map((p) => p.id)).toEqual(copy);
    }), cfg(307));
  });
});

describe('care: splitTimes', () => {
  it('fixed point: split -> join(", ") -> split', () => {
    fc.assert(fc.property(fc.string(), (s) => {
      const a = splitTimes(s);
      expect(splitTimes(a.join(', '))).toEqual(a);
    }), cfg(308, 500));
  });
  it('items are trimmed, non-empty and comma-free', () => {
    fc.assert(fc.property(fc.string(), (s) => {
      for (const x of splitTimes(s)) { expect(x).toBe(x.trim()); expect(x.length).toBeGreaterThan(0); expect(x).not.toContain(','); }
    }), cfg(309));
  });
  it('round-trip: joined valid times are recovered', () => {
    fc.assert(fc.property(fc.array(hm, { maxLength: 6 }), fc.constantFrom(',', ', ', ' , '), (ts, sep) => {
      expect(splitTimes(ts.join(sep))).toEqual(ts);
    }), cfg(310));
  });
});

describe('care: validateTreatment / validateProcedure', () => {
  const ws = fc.stringMatching(/^\s{0,5}$/);
  const okDate = fc.integer({ min: 0, max: 20000 }).map((n) => new Date(Date.UTC(2000, 0, 1 + n)).toISOString().slice(0, 10));
  const nonBlank = fc.string({ minLength: 1 }).filter((s) => s.trim() !== '');
  it('blank names always error', () => {
    fc.assert(fc.property(ws, okDate, nonBlank, fc.array(hm), (name, d, f, times) => {
      expect(validateTreatment({ name, startDate: d, frequency: f, times }).name).toBeTruthy();
    }), cfg(311));
    fc.assert(fc.property(ws, fc.constant('2026-11-18T10:00'), (name, date) => {
      expect(validateProcedure({ name, date }).name).toBeTruthy();
    }), cfg(312));
  });
  it('valid generated inputs never error', () => {
    fc.assert(fc.property(nonBlank, okDate, nonBlank, fc.array(hm, { maxLength: 6 }), (name, d, f, times) => {
      expect(validateTreatment({ name, startDate: d, frequency: f, times })).toEqual({});
    }), cfg(313));
    fc.assert(fc.property(nonBlank, fc.integer({ min: 0, max: 5000 }), (name, n) => {
      const date = new Date(2026, 0, 1, 0, n * 13).toISOString().slice(0, 16);
      expect(validateProcedure({ name, date })).toEqual({});
    }), cfg(314));
  });
  it('an invalid time always flags `times`; blank frequency flags `frequency`', () => {
    fc.assert(fc.property(fc.array(hm, { maxLength: 3 }), fc.constantFrom('24:00', '12:60', 'x', '1230', '8:5'), (times, bad) => {
      expect(validateTreatment({ name: 'a', startDate: '2026-01-01', frequency: 'x', times: [...times, bad] }).times).toBeTruthy();
    }), cfg(315));
    fc.assert(fc.property(ws, (f) => {
      expect(validateTreatment({ name: 'a', startDate: '2026-01-01', frequency: f, times: [] }).frequency).toBeTruthy();
    }), cfg(316));
  });
  it('an empty/garbled procedure date errors', () => {
    fc.assert(fc.property(fc.constantFrom('', 'nope', 'xx-yy'), (date) => {
      expect(validateProcedure({ name: 'a', date }).date).toBeTruthy();
    }), cfg(317, 50));
  });
});
