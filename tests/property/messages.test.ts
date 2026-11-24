import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { unreadFromFamily, lastMessage } from '../../src/services/messages';
import { createDemoData } from '../../src/data/demo';
import type { FamilyMessage } from '../../src/types';

const cfg = (seed: number, numRuns = 300) => ({ seed, numRuns });
const msg = fc.record({
  id: fc.uuid(),
  contactId: fc.constantFrom('c-mama', 'c-bryan', 'c-karen'),
  kind: fc.constant<FamilyMessage['kind']>('texto'),
  from: fc.constantFrom<FamilyMessage['from']>('contacto', 'paciente'),
  text: fc.string({ maxLength: 20 }),
  createdAt: fc.integer({ min: 0, max: 1e6 }),
  read: fc.boolean(),
  demo: fc.boolean(),
});

describe('messages: unreadFromFamily (the "new messages" badge)', () => {
  it('oracle: a family message is new iff unread and sent after the patient\'s last reply in that chat', () => {
    fc.assert(fc.property(fc.array(msg, { maxLength: 30 }), (ms) => {
      const out = unreadFromFamily(ms);
      for (const m of ms) {
        const lastReply = Math.max(-Infinity, ...ms.filter((x) => x.contactId === m.contactId && x.from === 'paciente').map((x) => x.createdAt));
        const expected = m.from === 'contacto' && !m.read && m.createdAt > lastReply;
        expect(out.includes(m)).toBe(expected);
      }
    }), cfg(670, 500));
  });
  it('the patient\'s own messages are never new, and filtering by person matches the whole list', () => {
    fc.assert(fc.property(fc.array(msg, { maxLength: 30 }), fc.constantFrom('c-mama', 'c-bryan', 'c-karen'), (ms, c) => {
      expect(unreadFromFamily(ms).every((m) => m.from === 'contacto')).toBe(true);
      expect(unreadFromFamily(ms, c)).toEqual(unreadFromFamily(ms).filter((m) => m.contactId === c));
    }), cfg(671));
  });
  it('replying makes every earlier message of that person count as seen', () => {
    fc.assert(fc.property(fc.array(msg, { maxLength: 30 }), (ms) => {
      const t = Math.max(0, ...ms.map((m) => m.createdAt)) + 1;
      const reply: FamilyMessage = { id: 'r', contactId: 'c-bryan', kind: 'texto', from: 'paciente', text: 'ok', createdAt: t, read: true, demo: false };
      expect(unreadFromFamily([...ms, reply], 'c-bryan')).toEqual([]);
    }), cfg(672));
  });
  it('lastMessage is the newest message of that chat, whoever wrote it', () => {
    fc.assert(fc.property(fc.array(msg, { maxLength: 30 }), fc.constantFrom('c-mama', 'c-bryan'), (ms, c) => {
      const mine = ms.filter((m) => m.contactId === c);
      const last = lastMessage(ms, c);
      if (!mine.length) {
        expect(last).toBeUndefined();
        return;
      }
      expect(last!.createdAt).toBe(Math.max(...mine.map((m) => m.createdAt)));
    }), cfg(673));
  });
  it('demo data: Bryan and Karen have no "new" messages (Leslie already answered); Mamá and Papá do', () => {
    const d = createDemoData(new Date(2026, 10, 24, 15));
    const people = new Set(unreadFromFamily(d.messages).map((m) => m.contactId));
    expect(people.has('c-bryan')).toBe(false);
    expect(people.has('c-karen')).toBe(false);
    expect(people.has('c-mama')).toBe(true);
    expect(people.has('c-papa')).toBe(true);
  });
});
