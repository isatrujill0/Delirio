import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { deriveNotifications } from '../../src/services/notifications';
import { createDemoData } from '../../src/data/demo';
import type { AppData, FamilyMessage, Treatment } from '../../src/types';

const cfg = (seed: number, numRuns = 300) => ({ seed, numRuns });
const base = createDemoData(new Date(2026, 10, 18, 10, 30));
const p2 = (n: number) => String(n).padStart(2, '0');
const now = fc.integer({ min: 0, max: 3 * 1440 }).map((n) => new Date(2026, 10, 17, 0, n));
const hm = fc.tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 })).map(([h, m]) => `${p2(h)}:${p2(m)}`);

const message: fc.Arbitrary<FamilyMessage> = fc.record({
  id: fc.uuid(), contactId: fc.constantFrom('c-mama', 'c-papa', 'nobody'), kind: fc.constantFrom('texto', 'audio', 'video') as fc.Arbitrary<FamilyMessage['kind']>,
  text: fc.string({ maxLength: 200 }), createdAt: fc.constant(0), read: fc.boolean(),
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
  it('dose notification only for a dose within the next hour today', () => {
    fc.assert(fc.property(dataArb, now, ({ data }, n) => {
      const out = deriveNotifications(data, n).filter((x) => x.kind === 'tratamiento');
      expect(out.length).toBeLessThanOrEqual(1);
      for (const x of out) expect(x.id.startsWith('dose:')).toBe(true);
    }), cfg(606));
  });
});
