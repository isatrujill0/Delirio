import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import { sanitize, serialize, parse } from '../../src/services/storage';
import { createDemoData } from '../../src/data/demo';
import type { AppData, Contact, FamilyMessage, Photo, Procedure, Recommendation, Treatment } from '../../src/types';

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

const isStr = (v: unknown) => typeof v === 'string';
const nonEmpty = (v: unknown) => typeof v === 'string' && v !== '';
const isBool = (v: unknown) => typeof v === 'boolean';
const KINDS = ['audio', 'video', 'texto'];
const STATUSES = ['programado', 'confirmado', 'realizado', 'reprogramado', 'cancelado'];
const CATS = ['Descanso', 'Alimentación', 'Movimiento', 'Emociones', 'Visitas'];

function assertValid(d: AppData) {
  expect(d.version).toBe(1);
  expect(Number.isInteger(d.prefs.volume)).toBe(true);
  expect(d.prefs.volume).toBeGreaterThanOrEqual(0);
  expect(d.prefs.volume).toBeLessThanOrEqual(100);
  expect(['normal', 'grande', 'muy-grande']).toContain(d.prefs.textSize);
  for (const k of lists) {
    expect(Array.isArray(d[k])).toBe(true);
    const ids = (d[k] as { id: unknown }[]).map((item) => item.id);
    for (const id of ids) expect(typeof id).toBe('string');
    expect(new Set(ids).size).toBe(ids.length);
  }
  for (const c of d.contacts) {
    expect(nonEmpty(c.name) && c.name.trim() !== '').toBe(true);
    expect([c.relation, c.phone, c.about].every(isStr)).toBe(true);
    expect(isBool(c.demo)).toBe(true);
    expect(c.photo === undefined || isStr(c.photo)).toBe(true);
  }
  for (const m of d.messages) {
    expect(nonEmpty(m.contactId)).toBe(true);
    expect(KINDS).toContain(m.kind);
    expect(isStr(m.text)).toBe(true);
    expect(Number.isFinite(m.createdAt)).toBe(true);
    expect(isBool(m.read) && isBool(m.demo)).toBe(true);
    expect(m.media === undefined || isStr(m.media)).toBe(true);
    expect(m.duration === undefined || (Number.isFinite(m.duration) && m.duration >= 0)).toBe(true);
  }
  for (const p of d.photos) {
    expect(nonEmpty(p.src)).toBe(true);
    expect(isStr(p.caption)).toBe(true);
    expect(isBool(p.demo)).toBe(true);
    expect(p.contactId === undefined || isStr(p.contactId)).toBe(true);
  }
  for (const t of d.treatments) {
    expect(nonEmpty(t.name)).toBe(true);
    expect([t.description, t.startDate, t.frequency, t.observations].every(isStr)).toBe(true);
    expect(isBool(t.demo)).toBe(true);
    expect(Array.isArray(t.times)).toBe(true);
    t.times.forEach((x) => expect(typeof x).toBe('string'));
  }
  for (const p of d.procedures) {
    expect(nonEmpty(p.name) && nonEmpty(p.date)).toBe(true);
    expect(isStr(p.description)).toBe(true);
    expect(STATUSES).toContain(p.status);
    expect(isBool(p.demo)).toBe(true);
  }
  for (const r of d.recommendations) {
    expect(nonEmpty(r.title)).toBe(true);
    expect(CATS).toContain(r.category);
    expect([r.summary, r.body].every(isStr)).toBe(true);
    expect(isBool(r.demo)).toBe(true);
  }
  expect(d.caregiverPin).toMatch(/^\d{4,6}$/);
  expect(Array.isArray(d.favorites)).toBe(true);
  const dates = d.moods.map((m) => m.date);
  expect(new Set(dates).size).toBe(dates.length);
  expect([...dates].sort()).toEqual(dates);
  expect(d.moods.length).toBeLessThanOrEqual(60);
  for (const m of d.moods) { expect(Number.isInteger(m.value)).toBe(true); expect(m.value).toBeGreaterThanOrEqual(1); expect(m.value).toBeLessThanOrEqual(5); }
  if (d.vitals !== null) {
    expect(Number.isFinite(d.vitals.recordedAt)).toBe(true);
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

// ---------------------------------------------------------------------------------------------
// Deep, per-record validation: damaged records are dropped, valid ones kept verbatim, first id wins.
// ---------------------------------------------------------------------------------------------
const nonBlank = fc.string({ minLength: 1, maxLength: 12 }).filter((s) => s.trim() !== '');
const text = fc.string({ maxLength: 20 });
const bool = fc.boolean();
const opt = <T>(a: fc.Arbitrary<T>) => fc.option(a, { nil: undefined });
/** Drops undefined-valued keys so toStrictEqual compares against what sanitize emits. */
const clean = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

const contactBody = fc.record({ name: nonBlank, relation: text, phone: text, about: text, demo: bool, photo: opt(nonBlank) }).map((r) => clean(r));
const messageBody = fc.record({
  contactId: nonBlank, kind: fc.constantFrom(...KINDS) as fc.Arbitrary<FamilyMessage['kind']>, text, media: opt(nonBlank),
  duration: opt(fc.integer({ min: 0, max: 5000 })), createdAt: fc.integer({ min: 0, max: 2e12 }), read: bool, demo: bool,
}).filter((m) => m.kind === 'texto' || !!m.media || m.text !== '').map((r) => clean(r));
const photoBody = fc.record({ src: nonBlank, caption: text, contactId: opt(nonBlank), demo: bool }).map((r) => clean(r));
const treatmentBody = fc.record({
  name: nonBlank, description: text, startDate: text, frequency: text, times: fc.array(text, { maxLength: 4 }), observations: text, demo: bool,
});
const procedureBody = fc.record({ name: nonBlank, date: nonBlank, description: text, status: fc.constantFrom(...STATUSES) as fc.Arbitrary<Procedure['status']>, demo: bool });
const recBody = fc.record({ title: nonBlank, category: fc.constantFrom(...CATS) as fc.Arbitrary<Recommendation['category']>, summary: text, body: text, demo: bool });

/** Ways to break a field: remove it or give it the wrong type. */
const wrongValue = fc.constantFrom<unknown>(null, true, {}, [], NaN, Infinity, '   ');
type Rec = Record<string, unknown>;
// Any non-string breaks every field (id included); a blank string breaks every field but id (ids may be any string).
const damage = (required: string[]) => fc.tuple(fc.constantFrom(...required, 'id'), fc.boolean(), wrongValue).map(([field, remove, bad]) => (r: Rec): Rec => {
  const out = { ...r };
  if (remove || (field === 'id' && typeof bad === 'string')) delete out[field]; else out[field] = bad;
  return out;
});

interface Slot<T> { id: string; body: T; broken: ((r: Rec) => Rec) | null }
function slots<T>(body: fc.Arbitrary<T>, required: string[]) {
  return fc.array(fc.record({
    id: fc.integer({ min: 0, max: 6 }).map((n) => `id${n}`), // small pool: duplicate ids are common
    body,
    broken: fc.option(damage(required), { nil: null, freq: 3 }),
  }), { maxLength: 12 }) as fc.Arbitrary<Slot<T>[]>;
}

/** Oracle: the raw list sanitize receives and the exact list it must return. */
function split<T extends { id: string }>(ss: Slot<T>[], extraBreak?: (b: T) => boolean) {
  const raw: Rec[] = [];
  const expected: T[] = [];
  const seen = new Set<string>();
  for (const s of ss) {
    const full = { ...s.body, id: s.id } as unknown as Rec;
    const bad = s.broken !== null;
    // damaging 'id' makes the record invalid regardless of the id value; a damaged field of a duplicated id never claims the id
    raw.push(bad ? s.broken!(full) : full);
    if (!bad && !(extraBreak?.(s.body))) {
      if (!seen.has(s.id)) { seen.add(s.id); expected.push(full as unknown as T); }
    }
  }
  return { raw, expected };
}

describe('storage: per-record validation', () => {
  const run = <T extends { id: string }>(seed: number, key: typeof lists[number], body: fc.Arbitrary<Omit<T, 'id'>>, required: string[]) => {
    fc.assert(fc.property(slots(body, required), (ss) => {
      const { raw, expected } = split(ss as unknown as Slot<T>[]);
      const out = sanitize({ ...defaults, [key]: raw }, defaults);
      expect(out[key]).toEqual(expected);
      assertValid(out);
    }), cfg(seed, 400));
  };
  it('contacts: damaged dropped, valid kept in order, first id wins', () => run<Contact>(501, 'contacts', contactBody, ['name']));
  it('messages: damaged dropped, valid kept in order, first id wins', () => run<FamilyMessage>(502, 'messages', messageBody, ['contactId', 'kind', 'createdAt']));
  it('photos: damaged dropped, valid kept in order, first id wins', () => run<Photo>(503, 'photos', photoBody, ['src']));
  it('treatments: damaged dropped, valid kept in order, first id wins', () => run<Treatment>(504, 'treatments', treatmentBody, ['name']));
  it('procedures: damaged dropped, valid kept in order, first id wins', () => run<Procedure>(505, 'procedures', procedureBody, ['name', 'date']));
  it('recommendations: damaged dropped, valid kept in order, first id wins', () => run<Recommendation>(506, 'recommendations', recBody, ['title', 'category']));

  it('a non-text message with neither media nor text is dropped (nothing to play)', () => {
    fc.assert(fc.property(fc.constantFrom('audio', 'video'), (kind) => {
      const m = { id: 'x', contactId: 'c', kind, text: '', createdAt: 1, read: false, demo: false };
      expect(sanitize({ ...defaults, messages: [m] }, defaults).messages).toEqual([]);
    }), cfg(507, 20));
  });
  it('a procedure with an unknown status is kept as "programado"; a non-array list falls back to the defaults', () => {
    fc.assert(fc.property(fc.oneof(fc.string(), fc.integer(), fc.constant(null)), fc.oneof(fc.string(), fc.integer(), fc.constant(null), fc.constant({})), (status, notList) => {
      fc.pre(!STATUSES.includes(status as string));
      const p = { id: 'p', name: 'n', date: '2026-11-18T10:00', status };
      expect(sanitize({ ...defaults, procedures: [p] }, defaults).procedures[0].status).toBe('programado');
      expect(sanitize({ ...defaults, contacts: notList }, defaults).contacts).toBe(defaults.contacts);
    }), cfg(508));
  });
  it('caregiverPin: only 4-6 digit strings survive, otherwise the default', () => {
    fc.assert(fc.property(fc.oneof(fc.stringMatching(/^\d{0,8}$/), fc.string(), fc.integer(), fc.constant(null)), (pin) => {
      const out = sanitize({ ...defaults, caregiverPin: pin }, defaults).caregiverPin;
      expect(out).toMatch(/^\d{4,6}$/);
      if (typeof pin === 'string' && /^\d{4,6}$/.test(pin)) expect(out).toBe(pin); else expect(out).toBe(defaults.caregiverPin);
    }), cfg(509, 500));
  });
  it('vitals without a finite recordedAt are dropped (null); with one they are kept', () => {
    fc.assert(fc.property(fc.oneof(fc.constant(undefined), fc.constant(null), fc.string(), fc.constant(NaN), fc.constant(Infinity), fc.constant(-Infinity)), fc.integer({ min: 0, max: 2e12 }), (bad, ok) => {
      expect(sanitize({ ...defaults, vitals: { heartRate: 70, respRate: 16, spo2: 97, recordedAt: bad } }, defaults).vitals).toBeNull();
      expect(sanitize({ ...defaults, vitals: { heartRate: 70, respRate: 16, spo2: 97, recordedAt: ok } }, defaults).vitals?.recordedAt).toBe(ok);
    }), cfg(510));
  });
});

// ---------------------------------------------------------------------------------------------
// Round trip of an already valid AppData.
// ---------------------------------------------------------------------------------------------
const uniq = <T>(body: fc.Arbitrary<T>, prefix: string) => fc.array(body, { maxLength: 6 }).map((a) => a.map((b, i) => ({ id: `${prefix}${i}`, ...b })));
const validData: fc.Arbitrary<AppData> = fc.record({
  userName: fc.string({ maxLength: 40 }),
  location: text,
  weather: fc.record({ city: text, tempC: fc.integer({ min: -40, max: 60 }), condition: text }),
  prefs: fc.record({
    volume: fc.integer({ min: 0, max: 100 }), muted: bool, textSize: fc.constantFrom('normal', 'grande', 'muy-grande') as fc.Arbitrary<AppData['prefs']['textSize']>, reduceMotion: bool,
    notifications: fc.record({ enabled: bool, sound: bool, treatments: bool, procedures: bool, messages: bool }),
  }),
  contacts: uniq(contactBody, 'c'),
  messages: uniq(messageBody, 'm'),
  photos: uniq(photoBody, 'p'),
  treatments: uniq(treatmentBody, 't'),
  procedures: uniq(procedureBody, 'pr'),
  recommendations: uniq(recBody, 'r'),
  moods: fc.uniqueArray(fc.tuple(dateStr, fc.integer({ min: 1, max: 5 }), bool), { selector: (x) => x[0], maxLength: 20 })
    .map((a) => a.sort((x, y) => x[0].localeCompare(y[0])).map(([date, value, demo]) => ({ date, value: value as 1 | 2 | 3 | 4 | 5, demo }))),
  vitals: fc.option(fc.record({ heartRate: fc.integer({ min: 0, max: 250 }), respRate: fc.integer({ min: 0, max: 80 }), spo2: fc.integer({ min: 0, max: 100 }), recordedAt: fc.integer({ min: 0, max: 2e12 }), demo: bool }), { nil: null }),
  careNote: fc.record({ text: fc.string({ maxLength: 280 }), updatedAt: fc.integer({ min: 0, max: 2e12 }), demo: bool }),
  favorites: fc.array(text, { maxLength: 5 }),
  scores: fc.dictionary(fc.stringMatching(/^[a-z]{1,8}$/), fc.nat({ max: 1000 }), { maxKeys: 4 }),
  dismissedNotifications: fc.array(text, { maxLength: 30 }),
  caregiverPin: fc.stringMatching(/^\d{4,6}$/),
}).map((r) => ({ ...r, version: 1 as const })) as fc.Arbitrary<AppData>;

describe('storage: round-trip of valid data', () => {
  it('sanitize(valid) deep-equals valid (generated records on top of the demo data)', () => {
    fc.assert(fc.property(validData, (v) => {
      expect(sanitize(v, defaults)).toEqual(v);
      assertValid(v);
    }), cfg(511, 400));
  });
  it('sanitize(valid) with demo lists spliced in is the identity as well', () => {
    fc.assert(fc.property(validData, (v) => {
      const mixed: AppData = { ...v, contacts: [...defaults.contacts, ...v.contacts], treatments: [...defaults.treatments, ...v.treatments] };
      const ids = new Set<string>();
      const dedup = <T extends { id: string }>(a: T[]) => a.filter((x) => !ids.has(x.id) && ids.add(x.id));
      const m2 = { ...mixed, contacts: dedup(mixed.contacts), treatments: (ids.clear(), dedup(mixed.treatments)) };
      expect(sanitize(m2, defaults)).toEqual(m2);
    }), cfg(512, 200));
  });
  it('serialize/parse of valid data is the identity', () => {
    fc.assert(fc.property(validData, (v) => {
      const r = parse(serialize(v), defaults);
      expect(r.error).toBeUndefined();
      expect(r.data).toEqual(v);
    }), cfg(513, 200));
  });
});

describe('storage: migration from data saved before the `demo` flag', () => {
  const LEGACY_NOTE = 'Te encuentras estable y recibiendo el cuidado que necesitas.';
  const strip = <T extends object>(x: T): T => { const { demo: _d, ...rest } = x as T & { demo?: unknown }; return rest as T; };
  const legacyOf = (d: AppData) => ({
    ...d,
    treatments: d.treatments.map(strip),
    procedures: d.procedures.map(strip),
    recommendations: d.recommendations.map(strip),
    moods: d.moods.map(strip),
    careNote: { ...d.careNote, text: LEGACY_NOTE },
  });
  const builtIn = [...defaults.treatments, ...defaults.procedures, ...defaults.recommendations].map((x) => x.id);
  const userId = fc.stringMatching(/^t-[0-9a-f]{8}$/);

  it('built-in demo ids without the flag come back demo === true, moods included', () => {
    fc.assert(fc.property(fc.constant(null), () => {
      const out = sanitize(legacyOf(defaults), defaults);
      for (const k of ['treatments', 'procedures', 'recommendations'] as const) {
        expect(out[k].length).toBe(defaults[k].length);
        for (const x of out[k]) expect(x.demo).toBe(true);
      }
      expect(out.moods.length).toBe(defaults.moods.length);
      for (const m of out.moods) expect(m.demo).toBe(true);
      expect(out.careNote.text).toBe(defaults.careNote.text);
      expect(out.careNote.demo).toBe(true);
    }), cfg(601, 5));
  });

  it('user-created ids (t- + 8 hex) without the flag are demo === false, built-ins stay true', () => {
    fc.assert(fc.property(fc.uniqueArray(userId, { minLength: 1, maxLength: 6 }), fc.array(fc.constantFrom(...defaults.treatments.map((t) => t.id)), { maxLength: 3 }), (ids, keep) => {
      const mine = ids.map((id) => ({ id, name: `Mío ${id}`, description: '', startDate: '2026-11-01', frequency: '', times: [], observations: '' }));
      const kept = defaults.treatments.filter((t) => keep.includes(t.id)).map(strip);
      const out = sanitize({ ...legacyOf(defaults), treatments: [...kept, ...mine] }, defaults);
      for (const t of out.treatments) expect(t.demo).toBe(ids.includes(t.id) ? false : true);
      expect(out.treatments.filter((t) => !t.demo).map((t) => t.id)).toEqual(ids);
      expect(builtIn).toEqual(expect.arrayContaining(kept.map((t) => t.id)));
    }), cfg(602, 200));
  });

  it('an explicit demo flag always wins over the id-based guess', () => {
    fc.assert(fc.property(fc.boolean(), (flag) => {
      const t = { ...strip(defaults.treatments[0]), demo: flag };
      expect(sanitize({ ...legacyOf(defaults), treatments: [t] }, defaults).treatments[0].demo).toBe(flag);
    }), cfg(603, 10));
  });

  it('the legacy note text is replaced only when careNote.demo === true', () => {
    fc.assert(fc.property(fc.oneof(fc.constant(true), fc.constant(false), fc.constant(undefined), fc.constant('true'), fc.constant(1), fc.constant(null)), (flag) => {
      const out = sanitize({ ...legacyOf(defaults), careNote: { text: LEGACY_NOTE, updatedAt: 5, demo: flag } }, defaults);
      if (flag === true) expect(out.careNote.text).toBe(defaults.careNote.text);
      else expect(out.careNote.text).toBe(LEGACY_NOTE);
      expect(out.careNote.updatedAt).toBe(5);
      // moods only count as demo while the stored set is the demo one
      for (const m of out.moods) expect(m.demo).toBe(flag === true);
    }), cfg(604, 30));
  });

  it('is idempotent on legacy input', () => {
    fc.assert(fc.property(fc.uniqueArray(userId, { maxLength: 4 }), fc.boolean(), (ids, demoNote) => {
      const mine = ids.map((id) => ({ id, name: id, description: '', startDate: '', frequency: '', times: [], observations: '' }));
      const legacy = { ...legacyOf(defaults), treatments: [...defaults.treatments.map(strip), ...mine], careNote: { text: LEGACY_NOTE, updatedAt: 1, demo: demoNote } };
      const once = sanitize(legacy, defaults);
      expect(sanitize(once, defaults)).toEqual(once);
      expect(sanitize(JSON.parse(serialize(once)), defaults)).toEqual(once);
    }), cfg(605, 100));
  });
});
