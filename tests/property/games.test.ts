import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { PROVERBS, proverbOptions, extendSequence, checkEcho, revealFraction, matchSpokenAnswer } from '../../src/services/games';

const cfg = (seed: number, numRuns = 300) => ({ seed, numRuns });
const endings = PROVERBS.map((p) => p.end);
const rand01 = fc.double({ min: 0, max: 1, maxExcluded: true, noNaN: true });
/** Deterministic, well-mixed rand() in [0,1) (mulberry32). */
const mulberry32 = (a: number) => () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const randSource = fc.integer();

describe('games: proverbOptions', () => {
  it('3 distinct options, includes the correct ending, all real endings (any integer i, any rand)', () => {
    fc.assert(fc.property(fc.integer(), randSource, (i, vals) => {
      const opts = proverbOptions(i, mulberry32(vals));
      expect(opts).toHaveLength(3);
      expect(new Set(opts).size).toBe(3);
      const n = PROVERBS.length;
      expect(opts).toContain(PROVERBS[((i % n) + n) % n].end);
      for (const o of opts) expect(endings).toContain(o);
    }), cfg(401, 500));
  });
  // Regression: a constant rand() used to loop forever (fixed with a partial Fisher–Yates pick).
  it('terminates with 3 distinct options for any constant rand in [0,1)', () => {
    fc.assert(fc.property(fc.integer(), rand01, (i, c) => {
      const opts = proverbOptions(i, () => c);
      expect(new Set(opts).size).toBe(3);
      const n = PROVERBS.length;
      expect(opts).toContain(PROVERBS[((i % n) + n) % n].end);
    }), cfg(404));
  });
  it('index is periodic: i and i+10 share the correct answer', () => {
    fc.assert(fc.property(fc.integer({ min: -1e6, max: 1e6 }), (i) => {
      const n = PROVERBS.length;
      const ok = PROVERBS[((i % n) + n) % n].end;
      expect(proverbOptions(i + n, mulberry32(i))).toContain(ok);
    }), cfg(402));
  });
});

describe('games: extendSequence', () => {
  it('grows by exactly one value in 0-3 and keeps the prefix; input not mutated', () => {
    fc.assert(fc.property(fc.array(fc.integer({ min: 0, max: 3 }), { maxLength: 30 }), rand01, (seq, r) => {
      const copy = [...seq];
      const out = extendSequence(seq, () => r);
      expect(out).toHaveLength(seq.length + 1);
      expect(out.slice(0, -1)).toEqual(copy);
      expect(seq).toEqual(copy);
      const last = out[out.length - 1];
      expect([0, 1, 2, 3]).toContain(last);
    }), cfg(403));
  });
});

describe('games: checkEcho', () => {
  const seq = fc.array(fc.integer({ min: 0, max: 3 }), { maxLength: 12 });
  const taps = fc.array(fc.integer({ min: 0, max: 3 }), { maxLength: 14 });
  it('matches an oracle: mistake iff some tap differs; round-complete iff equal; else continue', () => {
    fc.assert(fc.property(seq, taps, (s, t) => {
      const mistake = t.some((x, i) => x !== s[i]);
      const expected = mistake ? 'mistake' : t.length === s.length ? 'round-complete' : 'continue';
      expect(checkEcho(s, t)).toBe(expected);
    }), cfg(404, 500));
  });
  it('every proper prefix of the sequence is "continue", the full sequence is "round-complete"', () => {
    fc.assert(fc.property(seq.filter((s) => s.length > 0), (s) => {
      for (let k = 0; k < s.length; k++) expect(checkEcho(s, s.slice(0, k))).toBe('continue');
      expect(checkEcho(s, s)).toBe('round-complete');
    }), cfg(405));
  });
  it('replaying a grown sequence: tapping the old one is only "continue"', () => {
    fc.assert(fc.property(seq, rand01, (s, r) => {
      expect(checkEcho(extendSequence(s, () => r), s)).toBe('continue');
    }), cfg(406));
  });
});

describe('games: revealFraction', () => {
  it('always in [0,1]', () => {
    fc.assert(fc.property(fc.integer({ min: -100, max: 1000 }), fc.integer({ min: 1, max: 50 }), (t, n) => {
      const f = revealFraction(t, n);
      expect(f).toBeGreaterThanOrEqual(0); expect(f).toBeLessThanOrEqual(1);
    }), cfg(407));
  });
  it('monotone non-decreasing in taps', () => {
    fc.assert(fc.property(fc.integer({ min: -50, max: 500 }), fc.integer({ min: 0, max: 50 }), fc.integer({ min: 1, max: 50 }), (t, d, n) => {
      expect(revealFraction(t + d, n)).toBeGreaterThanOrEqual(revealFraction(t, n));
    }), cfg(408));
  });
  it('reaches 1 at `needed` (and beyond); 0 at no taps', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 100 }), fc.integer({ min: 0, max: 100 }), (n, extra) => {
      expect(revealFraction(n, n)).toBe(1);
      expect(revealFraction(n + extra, n)).toBe(1);
      expect(revealFraction(0, n)).toBe(0);
    }), cfg(409));
    expect(revealFraction(7)).toBe(1);
  });
});

describe('games: matchSpokenAnswer (answering the proverb by voice)', () => {
  const optionSets = fc.integer({ min: 0, max: PROVERBS.length - 1 }).chain((i) => fc.integer().map((seed) => proverbOptions(i, mulberry32(seed))));
  const filler = fc.constantFrom('', 'eh ', 'creo que ', 'mmm pues ', 'es ');
  const shout = (s: string) => s.toUpperCase().replace(/a/g, 'á').replace(/e/g, 'é');
  it('saying an option (with filler words, any case or accents) picks exactly that option', () => {
    fc.assert(fc.property(optionSets, fc.integer({ min: 0, max: 2 }), filler, fc.boolean(), (opts, k, pre, loud) => {
      const said = `${pre}${loud ? shout(opts[k]) : opts[k]}`;
      expect(matchSpokenAnswer([said], opts)).toBe(k);
    }), cfg(650, 500));
  });
  it('saying the option number picks it ("la dos", "tercera", "1")', () => {
    const forms = [['uno', 'la primera', '1'], ['dos', 'la segunda', 'opción 2'], ['tres', 'la tercera', '3']];
    fc.assert(fc.property(optionSets, fc.integer({ min: 0, max: 2 }), fc.integer({ min: 0, max: 2 }), (opts, k, f) => {
      expect(matchSpokenAnswer([forms[k][f]], opts)).toBe(k);
    }), cfg(651, 300));
  });
  it('silence or unrelated words never pick an option (it asks again instead of guessing)', () => {
    fc.assert(fc.property(optionSets, fc.constantFrom('', 'hola', 'no sé', 'tengo sed', 'qué hora es', 'enfermera por favor'), (opts, said) => {
      expect(matchSpokenAnswer([said], opts)).toBeNull();
    }), cfg(652, 300));
  });
  it('falls back to the next alternative when the first one does not match', () => {
    fc.assert(fc.property(optionSets, fc.integer({ min: 0, max: 2 }), (opts, k) => {
      expect(matchSpokenAnswer(['hola', opts[k]], opts)).toBe(k);
    }), cfg(653, 200));
  });
});
