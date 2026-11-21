import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { deriveNotifications, pruneDismissed } from '../../src/services/notifications';
import { createDemoData } from '../../src/data/demo';
import type { AppData, FamilyMessage, Procedure, Treatment } from '../../src/types';

const cfg = (seed: number, numRuns = 300) => ({ seed, numRuns });
const base = createDemoData(new Date(2026, 10, 18, 10, 30));
const p2 = (n: number) => String(n).padStart(2, '0');
const now = fc.integer({ min: 0, max: 3 * 1440 }).map((n) => new Date(2026, 10, 17, 0, n));
const hm = fc.tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 })).map(([h, m]) => `${p2(h)}:${p2(m)}`);

const message: fc.Arbitrary<FamilyMessage> = fc.record({
  id: fc.uuid(), contactId: fc.constantFrom('c-mama', 'c-papa', 'nobody'), kind: fc.constantFrom('texto', 'audio', 'video') as fc.Arbitrary<FamilyMessage['kind']>,
  text: fc.string({ maxLength: 200 }), createdAt: fc.constant(0), read: fc.boolean(), from: fc.constant<FamilyMessage['from']>('contacto'),
}) as fc.Arbitrary<FamilyMessage>;
const treatment: fc.Arbitrary<Treatment> = fc.record({
  id: fc.uuid(), name: fc.string({ minLength: 1 }), description: fc.constant(''), startDate: fc.constant('2026-01-01'),
  frequency: fc.constant('x'), observations: fc.constant(''), times: fc.array(hm, { maxLength: 4 }), demo: fc.boolean(),
});
const flags = fc.record({ enabled: fc.boolean(), sound: fc.boolean(), treatments: fc.boolean(), procedures: fc.boolean(), messages: fc.boolean() });

const dataArb = fc.record({
  notifications: flags,
  messages: fc.array(message, { maxLength: 8 }),
  treatments: fc.array(treatment, { maxLength: 4 }),
  dismissedPicks: fc.array(fc.nat(), { maxLength: 6 }),
  useDismissAll: fc.boolean(),
}).map((r): { data: AppData; clean: AppData } => {
  const data: AppData = { ...base, prefs: { ...base.prefs, notifications: r.notifications }, messages: r.messages, treatments: r.treatments, dismissedNotifications: [] };
  return { data, clean: data };
});

describe('notifications: deriveNotifications', () => {
  it('returns [] when notifications are disabled', () => {
    fc.assert(fc.property(dataArb, now, ({ data }, n) => {
      const d = { ...data, prefs: { ...data.prefs, notifications: { ...data.prefs.notifications, enabled: false } } };
      expect(deriveNotifications(d, n)).toEqual([]);
    }), cfg(601));
  });
  it('ids are unique', () => {
    fc.assert(fc.property(dataArb, now, ({ data }, n) => {
      const ids = deriveNotifications(data, n).map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }), cfg(602, 500));
  });
  it('never returns a dismissed id; dismissing exactly the derived ids empties the list', () => {
    fc.assert(fc.property(dataArb, now, fc.array(fc.nat(), { maxLength: 5 }), ({ data }, n, picks) => {
      const all = deriveNotifications(data, n).map((x) => x.id);
      const dismissed = picks.length && all.length ? picks.map((p) => all[p % all.length]) : [];
      const out = deriveNotifications({ ...data, dismissedNotifications: dismissed }, n).map((x) => x.id);
      for (const id of dismissed) expect(out).not.toContain(id);
      expect(out).toEqual(all.filter((id) => !dismissed.includes(id)));
      expect(deriveNotifications({ ...data, dismissedNotifications: all }, n)).toEqual([]);
    }), cfg(603, 500));
  });
  it('message notifications appear exactly for unread messages when enabled', () => {
    fc.assert(fc.property(dataArb, now, ({ data }, n) => {
      const out = deriveNotifications(data, n).filter((x) => x.kind === 'mensaje').map((x) => x.id).sort();
      const cfgN = data.prefs.notifications;
      const expected = cfgN.enabled && cfgN.messages ? data.messages.filter((m) => !m.read).map((m) => `msg:${m.id}`).sort() : [];
      expect(out).toEqual(expected);
    }), cfg(604, 500));
  });
  it('turning off a category removes only that category; body is capped for messages', () => {
    fc.assert(fc.property(dataArb, now, ({ data }, n) => {
      const on = { ...data, prefs: { ...data.prefs, notifications: { ...data.prefs.notifications, enabled: true, messages: true, treatments: true, procedures: true } } };
      const off = { ...on, prefs: { ...on.prefs, notifications: { ...on.prefs.notifications, messages: false } } };
      const a = deriveNotifications(on, n);
      expect(deriveNotifications(off, n)).toEqual(a.filter((x) => x.kind !== 'mensaje'));
      for (const x of a) if (x.kind === 'mensaje') expect(x.body.length).toBeLessThanOrEqual(90);
    }), cfg(605));
  });
  it('dose notifications only for doses within the next hour today; all share one time', () => {
    fc.assert(fc.property(dataArb, now, ({ data }, n) => {
      const out = deriveNotifications(data, n).filter((x) => x.kind === 'tratamiento');
      // Several treatments may be due at the same minute (one notification each), never more than the list holds.
      expect(out.length).toBeLessThanOrEqual(data.treatments.length);
      for (const x of out) expect(x.id.startsWith('dose:')).toBe(true);
      expect(new Set(out.map((x) => x.id.split(':').slice(2, 4).join(':'))).size).toBeLessThanOrEqual(1);
    }), cfg(606));
  });
});

// ---- scenarios with start dates around `now`, doses near `now`, and procedures within a day -----
const isoOf = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const localIso = (d: Date) => `${isoOf(d)}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
const hmOf = (m: number) => `${p2(Math.floor((((m % 1440) + 1440) % 1440) / 60))}:${p2((((m % 1440) + 1440) % 1440) % 60)}`;
const nowMin0 = fc.tuple(fc.integer({ min: 0, max: 5 }), fc.integer({ min: 0, max: 1439 })).map(([d, m]) => new Date(2026, 10, 15 + d, Math.floor(m / 60), m % 60, 0));
const PROC_STATUS = ['programado', 'confirmado', 'realizado', 'reprogramado', 'cancelado'] as const;

const scenario = nowMin0.chain((n) => {
  const nm = n.getHours() * 60 + n.getMinutes();
  const tr = fc.record({
    name: fc.string({ minLength: 1 }), description: fc.constant(''), frequency: fc.constant('x'), observations: fc.constant(''), demo: fc.boolean(),
    startDate: fc.integer({ min: -3, max: 3 }).map((k) => isoOf(new Date(n.getFullYear(), n.getMonth(), n.getDate() + k))),
    times: fc.array(fc.oneof(fc.integer({ min: -2, max: 70 }).map((d) => hmOf(nm + d)), hm), { maxLength: 3 }),
  });
  const pr = fc.record({
    name: fc.string({ minLength: 1 }), description: fc.constant(''), demo: fc.boolean(), status: fc.constantFrom(...PROC_STATUS),
    date: fc.integer({ min: -90, max: 1600 }).map((k) => localIso(new Date(n.getTime() + k * 60_000))),
  });
  return fc.record({
    messages: fc.array(message.map((m) => ({ ...m, demo: m.id.charCodeAt(0) % 2 === 0 })), { maxLength: 4 }),
    treatments: fc.array(tr, { maxLength: 4 }),
    procedures: fc.array(pr, { maxLength: 4 }),
    flags,
    junk: fc.array(fc.constantFrom('dose:zz:08:00:20200101', 'msg:gone', 'proc:old:2020-01-01T00:00', 'x'), { maxLength: 3 }),
    picks: fc.array(fc.nat(), { maxLength: 6 }),
    addPicks: fc.array(fc.nat(), { maxLength: 4 }),
  }).map((r) => {
    const data: AppData = {
      ...base,
      prefs: { ...base.prefs, notifications: r.flags },
      messages: r.messages,
      treatments: r.treatments.map((t, i) => ({ id: `t${i}`, ...t })) as Treatment[],
      procedures: r.procedures.map((p, i) => ({ id: `p${i}`, ...p })) as Procedure[],
      dismissedNotifications: [],
    };
    return { n, data, junk: r.junk, picks: r.picks, addPicks: r.addPicks };
  });
});
const allOn = (d: AppData): AppData => ({ ...d, prefs: { ...d.prefs, notifications: { enabled: true, sound: false, treatments: true, procedures: true, messages: true } }, dismissedNotifications: [] });
const pickFrom = (pool: string[], picks: number[]) => (pool.length ? picks.map((k) => pool[k % pool.length]) : []);

describe('notifications: doses shared by several treatments', () => {
  const group = fc.tuple(fc.integer({ min: 0, max: 1379 }), fc.integer({ min: 0, max: 60 }), fc.integer({ min: 1, max: 6 }), fc.integer({ min: 0, max: 3 }), fc.boolean())
    .map(([nm, d, count, day, demo]) => ({ nm, d, count, day, demo }));
  it('N treatments due at the same time within 60 minutes give N notifications with distinct ids', () => {
    fc.assert(fc.property(group, ({ nm, d, count, day, demo }) => {
      const n = new Date(2026, 10, 15 + day, Math.floor(nm / 60), nm % 60, 0);
      const ts: Treatment[] = Array.from({ length: count }, (_, i) => ({ id: `t${i}`, name: `Med ${i}`, description: '', startDate: '2026-01-01', frequency: 'x', observations: '', times: [hmOf(nm + d)], demo }));
      const data: AppData = { ...allOn(base), treatments: ts, messages: [], procedures: [] };
      const out = deriveNotifications(data, n);
      expect(out).toHaveLength(count);
      expect(new Set(out.map((x) => x.id)).size).toBe(count);
      ts.forEach((t, i) => { expect(out[i].id).toContain(`dose:${t.id}:`); expect(out[i].title).toContain(t.name); expect(out[i].kind).toBe('tratamiento'); });
      for (const x of out) expect(x.body.startsWith('Ejemplo · ')).toBe(demo);
    }), cfg(510));
  });
  it('the same group 61+ minutes away produces nothing', () => {
    fc.assert(fc.property(group, fc.integer({ min: 61, max: 300 }), ({ nm, count }, d) => {
      fc.pre(nm + d < 1440);
      const n = new Date(2026, 10, 16, Math.floor(nm / 60), nm % 60, 0);
      const ts: Treatment[] = Array.from({ length: count }, (_, i) => ({ id: `t${i}`, name: 'M', description: '', startDate: '2026-01-01', frequency: 'x', observations: '', times: [hmOf(nm + d)], demo: false }));
      expect(deriveNotifications({ ...allOn(base), treatments: ts, messages: [], procedures: [] }, n).filter((x) => x.kind === 'tratamiento')).toEqual([]);
    }), cfg(511));
  });
});

describe('notifications: demo label', () => {
  it('body starts with "Ejemplo · " exactly when the source message, treatment or procedure is demo', () => {
    let seen = 0;
    fc.assert(fc.property(scenario, ({ n, data }) => {
      const out = deriveNotifications(allOn(data), n);
      for (const x of out) {
        const [kind, id] = x.id.split(':');
        const src = kind === 'msg' ? data.messages.find((m) => m.id === id) : kind === 'dose' ? data.treatments.find((t) => t.id === id) : data.procedures.find((p) => p.id === id);
        expect(src).toBeDefined();
        expect(x.body.startsWith('Ejemplo · ')).toBe(src!.demo);
        seen++;
      }
    }), cfg(512, 500));
    expect(seen).toBeGreaterThan(200);
  });
});

describe('notifications: pruneDismissed', () => {
  it('result = live ids ∩ (dismissed ∪ add): subset of live, keeps every live input id, no duplicates', () => {
    let kept = 0;
    fc.assert(fc.property(scenario, ({ n, data, junk, picks, addPicks }) => {
      const live = deriveNotifications(allOn(data), n).map((x) => x.id);
      const dismissed = [...pickFrom(live, picks), ...junk];
      const add = [...pickFrom(live, addPicks), ...junk];
      const out = pruneDismissed({ ...data, dismissedNotifications: dismissed }, n, add);
      expect(new Set(out).size).toBe(out.length);
      for (const id of out) expect(live).toContain(id);
      for (const id of [...dismissed, ...add]) if (live.includes(id)) expect(out).toContain(id);
      expect([...out].sort()).toEqual([...new Set([...dismissed, ...add])].filter((id) => live.includes(id)).sort());
      kept += out.length;
    }), cfg(513, 600));
    expect(kept).toBeGreaterThan(100);
  });
  it('does not depend on the notification toggles (turning a category off keeps its dismissals)', () => {
    fc.assert(fc.property(scenario, ({ n, data, picks }) => {
      const live = deriveNotifications(allOn(data), n).map((x) => x.id);
      const dismissed = pickFrom(live, picks);
      const a = pruneDismissed({ ...data, dismissedNotifications: dismissed }, n);
      const b = pruneDismissed({ ...data, prefs: { ...data.prefs, notifications: { ...data.prefs.notifications, enabled: false } }, dismissedNotifications: dismissed }, n);
      expect(b).toEqual(a);
    }), cfg(514));
  });
  it('idempotent: pruning its own output with add=[] gives the same list', () => {
    fc.assert(fc.property(scenario, ({ n, data, junk, picks, addPicks }) => {
      const live = deriveNotifications(allOn(data), n).map((x) => x.id);
      const once = pruneDismissed({ ...data, dismissedNotifications: [...pickFrom(live, picks), ...junk] }, n, pickFrom(live, addPicks));
      expect(pruneDismissed({ ...data, dismissedNotifications: once }, n, [])).toEqual(once);
    }), cfg(515, 500));
  });
  it('dismissed live ids are filtered from deriveNotifications; the rest keep their order', () => {
    fc.assert(fc.property(scenario, ({ n, data, junk, picks }) => {
      const d = { ...data, prefs: { ...data.prefs, notifications: { ...data.prefs.notifications, enabled: true } } };
      const base0 = deriveNotifications(d, n).map((x) => x.id);
      const dismissed = [...pickFrom(base0, picks), ...junk];
      const out = deriveNotifications({ ...d, dismissedNotifications: dismissed }, n).map((x) => x.id);
      expect(out).toEqual(base0.filter((id) => !dismissed.includes(id)));
      // and what pruneDismissed keeps is still suppressed after pruning
      const pruned = pruneDismissed({ ...d, dismissedNotifications: dismissed }, n);
      expect(deriveNotifications({ ...d, dismissedNotifications: pruned }, n).map((x) => x.id)).toEqual(out);
    }), cfg(516, 500));
  });
});

describe('notifications: the patient\'s own chat messages', () => {
  it('a message written by the patient never produces a notification, read or not', () => {
    fc.assert(fc.property(message, fc.boolean(), (m, read) => {
      const base = createDemoData(new Date(2026, 10, 21, 10));
      const data = { ...base, messages: [{ ...m, from: 'paciente' as const, read }], treatments: [], procedures: [] };
      expect(deriveNotifications(data, new Date(2026, 10, 21, 10)).filter((n) => n.kind === 'mensaje')).toHaveLength(0);
    }), cfg(640, 200));
  });
});
