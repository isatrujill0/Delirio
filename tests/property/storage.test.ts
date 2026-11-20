import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import { sanitize, serialize, parse } from '../../src/services/storage';
import { createDemoData } from '../../src/data/demo';
import type { AppData } from '../../src/types';

const FIXED = new Date(2026, 10, 18, 10, 30);
const defaults: AppData = createDemoData(FIXED);
const cfg = (seed: number, numRuns = 300) => ({ seed, numRuns });

// sanitize falls back to Date.now() for missing timestamps: pin the clock so outputs are comparable.
beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(FIXED); });
afterAll(() => { vi.useRealTimers(); });

const json = fc.jsonValue();
const key = fc.constantFrom('version', 'userName', 'location', 'weather', 'prefs', 'contacts', 'messages', 'photos', 'treatments',
  'procedures', 'recommendations', 'favorites', 'moods', 'vitals', 'careNote', 'scores', 'dismissedNotifications', 'extra');
// Objects with the real top-level keys but arbitrary JSON values: reaches deep branches of sanitize.
const shaped = fc.dictionary(key, json);
const dateStr = fc.integer({ min: 0, max: 400 }).map((n) => new Date(2025, 0, 1 + n)).map((d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
const goodish = fc.record({
  prefs: fc.record({ volume: fc.oneof(fc.double({ noNaN: false }), fc.integer({ min: -500, max: 500 })), textSize: fc.oneof(fc.constantFrom('normal', 'grande', 'muy-grande'), json) }),
  moods: fc.array(fc.record({ date: fc.oneof(dateStr, fc.string()), value: fc.oneof(fc.integer({ min: -3, max: 9 }), fc.double(), json) }), { maxLength: 100 }),
  vitals: fc.oneof(fc.constant(null), fc.record({ heartRate: json, respRate: json, spo2: json }), json),
  dismissedNotifications: fc.array(fc.oneof(fc.string(), fc.integer()), { maxLength: 400 }),
  contacts: fc.array(fc.oneof(fc.record({ id: fc.string() }), json), { maxLength: 10 }),
  treatments: fc.array(fc.oneof(fc.record({ id: fc.string(), times: fc.array(json) }), json), { maxLength: 10 }),
}, { requiredKeys: [] });
const input = fc.oneof(json, shaped, goodish);

const lists = ['contacts', 'messages', 'photos', 'treatments', 'procedures', 'recommendations'] as const;

function assertValid(d: AppData) {
  expect(d.version).toBe(1);
  expect(Number.isInteger(d.prefs.volume)).toBe(true);
  expect(d.prefs.volume).toBeGreaterThanOrEqual(0);
  expect(d.prefs.volume).toBeLessThanOrEqual(100);
  expect(['normal', 'grande', 'muy-grande']).toContain(d.prefs.textSize);
  for (const k of lists) {
    expect(Array.isArray(d[k])).toBe(true);
    for (const item of d[k] as { id: unknown }[]) expect(typeof item.id).toBe('string');
  }
  for (const t of d.treatments) { expect(Array.isArray(t.times)).toBe(true); t.times.forEach((x) => expect(typeof x).toBe('string')); }
  expect(Array.isArray(d.favorites)).toBe(true);
  const dates = d.moods.map((m) => m.date);
  expect(new Set(dates).size).toBe(dates.length);
  expect([...dates].sort()).toEqual(dates);
  expect(d.moods.length).toBeLessThanOrEqual(60);
  for (const m of d.moods) { expect(Number.isInteger(m.value)).toBe(true); expect(m.value).toBeGreaterThanOrEqual(1); expect(m.value).toBeLessThanOrEqual(5); }
  if (d.vitals !== null) {
    expect(d.vitals.heartRate).toBeGreaterThanOrEqual(0); expect(d.vitals.heartRate).toBeLessThanOrEqual(250);
    expect(d.vitals.respRate).toBeGreaterThanOrEqual(0); expect(d.vitals.respRate).toBeLessThanOrEqual(80);
    expect(d.vitals.spo2).toBeGreaterThanOrEqual(0); expect(d.vitals.spo2).toBeLessThanOrEqual(100);
  }
  expect(d.dismissedNotifications.length).toBeLessThanOrEqual(200);
  expect(d.weather.tempC).toBeGreaterThanOrEqual(-40); expect(d.weather.tempC).toBeLessThanOrEqual(60);
  expect(d.userName.length).toBeLessThanOrEqual(40);
  for (const v of Object.values(d.scores)) { expect(Number.isInteger(v)).toBe(true); expect(v).toBeGreaterThanOrEqual(0); }
}

describe('storage: sanitize', () => {
  it('invariant: never throws and always returns a structurally valid AppData', () => {
    fc.assert(fc.property(input, (x) => { assertValid(sanitize(x, defaults)); }), cfg(101, 500));
  });
  it('invariant: sanitize accepts arbitrary (non-JSON) values without throwing', () => {
    fc.assert(fc.property(fc.anything(), (x) => { expect(() => sanitize(x, defaults)).not.toThrow(); }), cfg(102));
  });
  it('idempotence: sanitize(sanitize(x)) equals sanitize(x)', () => {
    fc.assert(fc.property(input, (x) => {
      const once = sanitize(x, defaults);
      expect(sanitize(once, defaults)).toStrictEqual(once);
    }), cfg(103, 500));
  });
  it('round-trip: parse(serialize(sanitize(x))) equals sanitize(x)', () => {
    fc.assert(fc.property(input, (x) => {
      const s = sanitize(x, defaults);
      const r = parse(serialize(s), defaults);
      expect(r.error).toBeUndefined();
      expect(r.data).toEqual(s); // toEqual: fc.jsonValue builds null-prototype objects, JSON.parse does not
    }), cfg(104, 500));
  });
  it('invariant: non-object input yields the defaults', () => {
    fc.assert(fc.property(fc.oneof(fc.string(), fc.double(), fc.boolean(), fc.constant(null), fc.array(json)), (x) => {
      expect(sanitize(x, defaults)).toBe(defaults);
    }), cfg(105));
  });
});

describe('storage: parse', () => {
  it('malformed JSON returns defaults with error corrupt', () => {
    const bad = fc.string().filter((s) => { try { JSON.parse(s); return false; } catch { return true; } });
    fc.assert(fc.property(bad, (s) => {
      const r = parse(s, defaults);
      expect(r.error).toBe('corrupt');
      expect(r.data).toBe(defaults);
    }), cfg(106));
  });
  it('truncated serialized data is corrupt', () => {
    const full = serialize(defaults);
    fc.assert(fc.property(fc.integer({ min: 1, max: full.length - 1 }), (n) => {
      expect(parse(full.slice(0, n), defaults).error).toBe('corrupt');
    }), cfg(107));
  });
  it('null returns defaults without error', () => {
    const r = parse(null, defaults);
    expect(r.data).toBe(defaults);
    expect(r.error).toBeUndefined();
  });
  it('demo data survives a round trip unchanged', () => {
    expect(parse(serialize(defaults), defaults).data).toStrictEqual(defaults);
  });
});
