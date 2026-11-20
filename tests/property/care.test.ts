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
  id: fc.uuid(), name: fc.string(), description: fc.string(), startDate: fc.constant('2000-01-01'), // always started: start-date behaviour has its own properties
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
      const t = { id: 'a', name: 'x', description: '', startDate: '2000-01-01', frequency: 'x', observations: '', demo: false, times: [`${p2(n.getHours())}:${p2(n.getMinutes())}`] };
      const r = nextDose([t], n)!;
      expect(r.inMinutes).toBe(0);
      expect(r.tomorrow).toBe(false);
    }), cfg(304));
  });
});

// ---- start-date aware oracle -------------------------------------------------------------------
const isoOf = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
const hmOf = (m: number) => `${p2(Math.floor((((m % 1440) + 1440) % 1440) / 60))}:${p2((((m % 1440) + 1440) % 1440) % 60)}`;
const nowAt = fc.tuple(fc.integer({ min: 0, max: 800 }), fc.integer({ min: 0, max: 1439 }))
  .map(([day, min]) => new Date(2025, 0, 1 + day, Math.floor(min / 60), min % 60, 0));
const badStart = fc.constantFrom('', 'garbage', '2026-1-1', '26-01-01', '2026/01/01', '20260101', ' 2026-01-01');
/** Treatments with start dates 5 days either side of `n`, plus invalid dates, and times clustered around `n` so ties are frequent. */
const scenario = nowAt.chain((n) => {
  const nowMin = n.getHours() * 60 + n.getMinutes();
  const start = fc.oneof(fc.integer({ min: -5, max: 5 }).map((k) => isoOf(addDays(n, k))), badStart);
  const time = fc.oneof(fc.integer({ min: -3, max: 3 }).map((d) => hmOf(nowMin + d)), fc.integer({ min: 0, max: 1439 }).map(hmOf), fc.constantFrom('', 'x', '24:00'));
  const t = fc.record({ name: fc.string(), description: fc.constant(''), startDate: start, frequency: fc.constant('x'), observations: fc.constant(''), times: fc.array(time, { maxLength: 4 }), demo: fc.boolean() });
  return fc.array(t, { maxLength: 6 }).map((ts) => [n, ts.map((x, i) => ({ id: `t${i}`, ...x })) as Treatment[]] as const);
});

describe('care: nextDose with start dates', () => {
  it('oracle: null iff no (started, valid time) pair; inMinutes is the minimum over started pairs; treatments is exactly the tied set in list order', () => {
    fc.assert(fc.property(scenario, ([n, ts]) => {
      const nowMin = n.getHours() * 60 + n.getMinutes();
      const tomorrowIso = isoOf(addDays(n, 1));
      const todayIso = isoOf(n);
      const pairs: { t: Treatment; time: string; m: number; inMin: number }[] = [];
      for (const t of ts) for (const time of t.times) {
        const m = parseHM(time);
        if (m === null) continue;
        const later = m < nowMin;
        const day = later ? tomorrowIso : todayIso;
        const started = !/^\d{4}-\d{2}-\d{2}$/.test(t.startDate) || t.startDate <= day;
        if (started) pairs.push({ t, time, m, inMin: later ? m + 1440 - nowMin : m - nowMin });
      }
      const r = nextDose(ts, n);
      if (pairs.length === 0) { expect(r).toBeNull(); return; }
      expect(r).not.toBeNull();
      const best = Math.min(...pairs.map((x) => x.inMin));
      expect(r!.inMinutes).toBe(best);
      expect(r!.tomorrow).toBe(pairs.find((x) => x.inMin === best)!.m < nowMin);
      const tied = ts.filter((t) => pairs.some((x) => x.t === t && x.inMin === best));
      expect(r!.treatments).toEqual(tied);
      expect(new Set(r!.treatments).size).toBe(r!.treatments.length);
      expect(r!.treatment).toBe(r!.treatments[0]);
      expect(parseHM(r!.time)).toBe(pairs.find((x) => x.inMin === best)!.m);
      expect(r!.treatments.every((t) => t.times.some((x) => parseHM(x) === parseHM(r!.time)))).toBe(true);
    }), cfg(501, 800));
  });
  it('scenario is not vacuous: both started and not-yet-started treatments, ties and tomorrow doses occur', () => {
    const stats = { future: 0, past: 0, ties: 0, tomorrow: 0, nulls: 0, total: 0 };
    fc.assert(fc.property(scenario, ([n, ts]) => {
      stats.total++;
      if (ts.some((t) => t.startDate > isoOf(n))) stats.future++;
      if (ts.some((t) => /^\d{4}/.test(t.startDate) && t.startDate < isoOf(n))) stats.past++;
      const r = nextDose(ts, n);
      if (!r) stats.nulls++; else { if (r.treatments.length > 1) stats.ties++; if (r.tomorrow) stats.tomorrow++; }
    }), cfg(502, 800));
    expect(stats.future).toBeGreaterThan(stats.total / 4);
    expect(stats.past).toBeGreaterThan(stats.total / 4);
    expect(stats.ties).toBeGreaterThan(20);
    expect(stats.tomorrow).toBeGreaterThan(20);
    expect(stats.nulls).toBeGreaterThan(0);
  });
  it('a treatment starting tomorrow IS eligible for a time earlier than now (tomorrow\'s dose) but NOT for a later time today', () => {
    fc.assert(fc.property(nowAt, fc.integer({ min: 1, max: 1439 }), (n, delta) => {
      const nowMin = n.getHours() * 60 + n.getMinutes();
      const mk = (time: string): Treatment => ({ id: 'a', name: 'x', description: '', startDate: isoOf(addDays(n, 1)), frequency: 'x', observations: '', demo: false, times: [time] });
      if (nowMin >= 1) {
        const earlier = mk(hmOf(nowMin - Math.min(delta, nowMin)));
        const r = nextDose([earlier], n);
        expect(r).not.toBeNull();
        expect(r!.tomorrow).toBe(true);
        expect(r!.treatment).toBe(earlier);
      }
      if (nowMin <= 1438) {
        const later = mk(hmOf(nowMin + Math.min(delta, 1439 - nowMin)));
        expect(nextDose([later], n)).toBeNull();
      }
      // exactly now, starting tomorrow: today's dose, not started yet
      expect(nextDose([mk(hmOf(nowMin))], n)).toBeNull();
    }), cfg(503, 500));
  });
  it('a treatment that started today or earlier is eligible for any time', () => {
    fc.assert(fc.property(nowAt, fc.integer({ min: 0, max: 400 }), fc.integer({ min: 0, max: 1439 }), (n, back, m) => {
      const t: Treatment = { id: 'a', name: 'x', description: '', startDate: isoOf(addDays(n, -back)), frequency: 'x', observations: '', demo: false, times: [hmOf(m)] };
      expect(nextDose([t], n)?.treatment).toBe(t);
    }), cfg(504));
  });
  it('invalid or empty startDate counts as started', () => {
    fc.assert(fc.property(nowAt, badStart, fc.integer({ min: 0, max: 1439 }), (n, start, m) => {
      const t: Treatment = { id: 'a', name: 'x', description: '', startDate: start, frequency: 'x', observations: '', demo: false, times: [hmOf(m)] };
      const r = nextDose([t], n);
      expect(r?.treatment).toBe(t);
      expect(r!.inMinutes).toBe(m >= n.getHours() * 60 + n.getMinutes() ? m - (n.getHours() * 60 + n.getMinutes()) : m + 1440 - (n.getHours() * 60 + n.getMinutes()));
    }), cfg(505));
  });
  it('the same treatment listed with the same time twice is returned once; distinct treatments tied are all returned in order', () => {
    fc.assert(fc.property(nowAt, fc.integer({ min: 0, max: 1439 }), fc.integer({ min: 1, max: 5 }), (n, m, k) => {
      const mk = (i: number, times: string[]): Treatment => ({ id: `t${i}`, name: 'x', description: '', startDate: '2000-01-01', frequency: 'x', observations: '', demo: false, times });
      const ts = Array.from({ length: k }, (_, i) => mk(i, [hmOf(m), hmOf(m)]));
      const r = nextDose(ts, n)!;
      expect(r.treatments).toEqual(ts);
      expect(r.treatment).toBe(ts[0]);
    }), cfg(506));
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
      expect(validateTreatment({ name: 'a', startDate: '2000-01-01', frequency: 'x', times: [...times, bad] }).times).toBeTruthy();
    }), cfg(315));
    fc.assert(fc.property(ws, (f) => {
      expect(validateTreatment({ name: 'a', startDate: '2000-01-01', frequency: f, times: [] }).frequency).toBeTruthy();
    }), cfg(316));
  });
  it('an empty/garbled procedure date errors', () => {
    fc.assert(fc.property(fc.constantFrom('', 'nope', 'xx-yy'), (date) => {
      expect(validateProcedure({ name: 'a', date }).date).toBeTruthy();
    }), cfg(317, 50));
  });
});

// Regression (found by the property writer): an impossible date used to block the treatment forever.
describe('care: hasStarted with impossible dates', () => {
  it('an impossible YYYY-MM-DD start date counts as started', () => {
    fc.assert(fc.property(fc.constantFrom('2026-13-45', '9999-99-99', '2026-02-30', '2026-00-10'), now, (startDate, n) => {
      const t = { id: 'a', name: 'x', description: '', startDate, frequency: 'x', observations: '', demo: false, times: ['08:00'] };
      expect(nextDose([t], n)).not.toBeNull();
    }), cfg(540, 100));
  });
});
