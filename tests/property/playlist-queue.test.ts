import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

// playlist.ts only talks to the engine through getState/playMedia/onEnded: a tiny fake is enough, no src changes needed.
interface FakeEngine { id: string | null; played: string[]; onEnded: ((id: string | null) => void) | null; getState(): { id: string | null }; playMedia(item: { id: string }): void }
const eng = vi.hoisted(() => {
  const e: FakeEngine = {
    id: null,
    played: [],
    onEnded: null,
    getState() { return { id: e.id }; },
    playMedia(item) { e.id = item.id; e.played.push(item.id); },
  };
  return e;
});
vi.mock('../../src/services/audioEngine', () => ({ audioEngine: eng }));

import { playQueue, step } from '../../src/services/playlist';
import { TRACKS } from '../../src/data/media';

const cfg = (seed: number, numRuns = 300) => ({ seed, numRuns });
const ALL = TRACKS.map((t) => t.id);
const queueIds = fc.uniqueArray(fc.constantFrom(...ALL), { minLength: 1, maxLength: ALL.length });
const queueAndStart = fc.tuple(queueIds, fc.integer({ min: 0, max: ALL.length - 1 }));
const wrap = (i: number, n: number) => ((i % n) + n) % n;

beforeEach(() => { eng.id = null; eng.played = []; });

describe('playlist: playQueue / step / onEnded (engine mocked)', () => {
  it('playQueue starts the requested track (start clamped into the queue)', () => {
    fc.assert(fc.property(queueIds, fc.integer({ min: -5, max: 20 }), (ids, start) => {
      playQueue(ids, start);
      expect(eng.id).toBe(ids[Math.min(Math.max(0, start), ids.length - 1)]);
    }), cfg(530));
  });
  it('unknown ids are filtered out; an all-unknown queue plays nothing', () => {
    fc.assert(fc.property(fc.array(fc.string().filter((s) => !ALL.includes(s)), { maxLength: 4 }), (junk) => {
      eng.id = null; eng.played = [];
      playQueue(junk);
      expect(eng.played).toEqual([]);
    }), cfg(531));
    fc.assert(fc.property(queueIds, (ids) => {
      playQueue(['nope', ...ids, 'nada'], 0);
      expect(eng.id).toBe(ids[0]);
      for (let i = 1; i < ids.length; i++) { step(1); expect(eng.id).toBe(ids[i]); }
    }), cfg(532));
  });
  it('step(1) n times returns to the start, visiting the queue in order; step(-1) n times too', () => {
    fc.assert(fc.property(queueAndStart, ([ids, s0]) => {
      const s = s0 % ids.length;
      playQueue(ids, s);
      for (let k = 1; k <= ids.length; k++) { expect(step(1)).toBe(true); expect(eng.id).toBe(ids[wrap(s + k, ids.length)]); }
      expect(eng.id).toBe(ids[s]);
      for (let k = 1; k <= ids.length; k++) { expect(step(-1)).toBe(true); expect(eng.id).toBe(ids[wrap(s - k, ids.length)]); }
      expect(eng.id).toBe(ids[s]);
    }), cfg(533, 400));
  });
  it('step(d) then step(-d) is the identity, from anywhere in the queue, after any number of prior steps', () => {
    fc.assert(fc.property(queueAndStart, fc.integer({ min: 0, max: 15 }), fc.constantFrom<1 | -1>(1, -1), ([ids, s0], pre, d) => {
      playQueue(ids, s0 % ids.length);
      for (let k = 0; k < pre; k++) step(1);
      const before = eng.id;
      step(d);
      step(d === 1 ? -1 : 1);
      expect(eng.id).toBe(before);
    }), cfg(534, 400));
  });
  it('onEnded of the current track advances by one (wrapping); a one-track queue stays put; foreign ids are ignored', () => {
    fc.assert(fc.property(queueAndStart, ([ids, s0]) => {
      const s = s0 % ids.length;
      playQueue(ids, s);
      const n0 = eng.played.length;
      eng.onEnded!('not-in-queue');
      expect(eng.played).toHaveLength(n0);
      eng.onEnded!(null);
      expect(eng.played).toHaveLength(n0);
      eng.onEnded!(ids[s]);
      if (ids.length > 1) { expect(eng.id).toBe(ids[wrap(s + 1, ids.length)]); expect(eng.played).toHaveLength(n0 + 1); }
      else expect(eng.played).toHaveLength(n0);
    }), cfg(535, 400));
  });
  it('a chain of onEnded events walks the queue like step(1)', () => {
    fc.assert(fc.property(queueIds, fc.integer({ min: 0, max: 20 }), (ids, k) => {
      playQueue(ids, 0);
      for (let i = 0; i < k; i++) eng.onEnded!(eng.id);
      expect(eng.id).toBe(ids.length > 1 ? ids[k % ids.length] : ids[0]);
    }), cfg(536));
  });
  it('step returns false and does nothing when the playing track is not in the queue', () => {
    fc.assert(fc.property(queueIds, (ids) => {
      playQueue(ids, 0);
      eng.id = null;
      const n0 = eng.played.length;
      expect(step(1)).toBe(false);
      eng.id = 'something-else';
      expect(step(-1)).toBe(false);
      expect(eng.played).toHaveLength(n0);
    }), cfg(537));
  });
});
