import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatHM, clock, parseHM, hmToLabel, mmss, speechSeconds, partOfDay, relativeDay, timeAgo } from '../../src/services/time';

const cfg = (seed: number, numRuns = 300) => ({ seed, numRuns });
const hour = fc.integer({ min: 0, max: 23 });
const minute = fc.integer({ min: 0, max: 59 });
const p2 = (n: number) => String(n).padStart(2, '0');
const date = fc.date({ min: new Date(2000, 0, 2), max: new Date(2060, 0, 1), noInvalidDate: true });

describe('time: formatHM / clock', () => {
  it('invariant: hour 1-12, two-digit minutes, a.m. iff h<12', () => {
    fc.assert(fc.property(hour, minute, (h, m) => {
      const { time, period } = formatHM(h, m);
      const [hh, mm] = time.split(':');
      expect(Number(hh)).toBeGreaterThanOrEqual(1);
      expect(Number(hh)).toBeLessThanOrEqual(12);
      expect(hh).toBe(String(Number(hh)));
      expect(mm).toMatch(/^\d{2}$/);
      expect(Number(mm)).toBe(m);
      expect(period).toBe(h < 12 ? 'a.m.' : 'p.m.');
    }), cfg(201));
  });
  it('invariant: clock(d) equals formatHM of its local hours/minutes', () => {
    fc.assert(fc.property(date, (d) => { expect(clock(d)).toEqual(formatHM(d.getHours(), d.getMinutes())); }), cfg(202));
  });
});

describe('time: parseHM / hmToLabel', () => {
  it('round-trip: parseHM("HH:MM") = h*60+m, and back', () => {
    fc.assert(fc.property(hour, minute, (h, m) => {
      const v = parseHM(`${p2(h)}:${p2(m)}`);
      expect(v).toBe(h * 60 + m);
      expect(p2(Math.floor(v! / 60)) + ':' + p2(v! % 60)).toBe(`${p2(h)}:${p2(m)}`);
    }), cfg(203));
  });
  it('accepts a single-digit hour and surrounding whitespace', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 9 }), minute, fc.constantFrom('', ' ', '  '), (h, m, ws) => {
      expect(parseHM(`${ws}${h}:${p2(m)}${ws}`)).toBe(h * 60 + m);
    }), cfg(204));
  });
  it('rejects out-of-range hours and minutes', () => {
    fc.assert(fc.property(fc.integer({ min: 24, max: 99 }), minute, (h, m) => { expect(parseHM(`${p2(h)}:${p2(m)}`)).toBeNull(); }), cfg(205));
    fc.assert(fc.property(hour, fc.integer({ min: 60, max: 99 }), (h, m) => { expect(parseHM(`${p2(h)}:${p2(m)}`)).toBeNull(); }), cfg(206));
  });
  it('invariant: parseHM result is null or an integer in [0,1439] for any string', () => {
    fc.assert(fc.property(fc.string(), (s) => {
      const v = parseHM(s);
      if (v !== null) { expect(Number.isInteger(v)).toBe(true); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1439); }
    }), cfg(207, 500));
  });
  it('hmToLabel: valid input matches formatHM; invalid input is returned unchanged', () => {
    fc.assert(fc.property(hour, minute, (h, m) => {
      const f = formatHM(h, m);
      expect(hmToLabel(`${p2(h)}:${p2(m)}`)).toBe(`${f.time} ${f.period}`);
    }), cfg(208));
    fc.assert(fc.property(fc.string(), (s) => {
      if (parseHM(s) === null) expect(hmToLabel(s)).toBe(s);
    }), cfg(209));
  });
});

describe('time: mmss', () => {
  it('invariant: format m:ss, never negative, value matches floor(seconds)', () => {
    fc.assert(fc.property(fc.double({ noNaN: true, min: -1e6, max: 1e7 }), (x) => {
      const out = mmss(x);
      expect(out).toMatch(/^\d+:\d{2}$/);
      const [m, s] = out.split(':').map(Number);
      expect(s).toBeLessThan(60);
      expect(m * 60 + s).toBe(Math.max(0, Math.floor(x)));
    }), cfg(210));
  });
  it('non-finite input gives 0:00', () => {
    for (const x of [NaN, Infinity, -Infinity]) expect(mmss(x)).toBe('0:00');
  });
  it('monotone: larger input never gives a smaller duration', () => {
    const secs = (s: string) => { const [m, r] = s.split(':').map(Number); return m * 60 + r; };
    fc.assert(fc.property(fc.double({ noNaN: true, min: -1e5, max: 1e6 }), fc.double({ noNaN: true, min: 0, max: 1e5 }), (a, d) => {
      expect(secs(mmss(a + d))).toBeGreaterThanOrEqual(secs(mmss(a)));
    }), cfg(211));
  });
});

describe('time: speechSeconds', () => {
  const words = (n: number) => Array.from({ length: n }, () => 'palabra').join(' ');
  it('invariant: at least 3 for any text', () => {
    fc.assert(fc.property(fc.string(), (s) => { expect(speechSeconds(s)).toBeGreaterThanOrEqual(3); }), cfg(212));
  });
  it('monotone in word count', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 400 }), fc.integer({ min: 0, max: 100 }), (n, k) => {
      expect(speechSeconds(words(n + k))).toBeGreaterThanOrEqual(speechSeconds(words(n)));
    }), cfg(213));
  });
  it('invariant: whitespace padding does not change the result', () => {
    fc.assert(fc.property(fc.array(fc.stringMatching(/^[a-z]{1,8}$/), { maxLength: 60 }), (w) => {
      expect(speechSeconds(`  ${w.join('   ')} \n`)).toBe(speechSeconds(w.join(' ')));
    }), cfg(214));
  });
});

describe('time: partOfDay', () => {
  it('total over 0-23 and consistent with the documented boundaries', () => {
    fc.assert(fc.property(hour, (h) => {
      const p = partOfDay(h);
      expect(['madrugada', 'mañana', 'tarde', 'noche']).toContain(p);
      const expected = h < 5 ? 'madrugada' : h < 12 ? 'mañana' : h < 19 ? 'tarde' : 'noche';
      expect(p).toBe(expected);
    }), cfg(215, 100));
  });
  it('boundaries', () => {
    expect([4, 5, 11, 12, 18, 19, 0, 23].map(partOfDay)).toEqual(['madrugada', 'mañana', 'mañana', 'tarde', 'tarde', 'noche', 'madrugada', 'noche']);
  });
  it('monotone: the part index never decreases through the day', () => {
    const order = ['madrugada', 'mañana', 'tarde', 'noche'];
    for (let h = 1; h < 24; h++) expect(order.indexOf(partOfDay(h))).toBeGreaterThanOrEqual(order.indexOf(partOfDay(h - 1)));
  });
});

describe('time: relativeDay', () => {
  const offset = (d: Date, n: number, h: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, h, 0);
  it('offset 0 -> Hoy, 1 -> Mañana, -1 -> Ayer, regardless of time of day', () => {
    fc.assert(fc.property(date, hour, (now, h) => {
      expect(relativeDay(offset(now, 0, h), now)).toBe('Hoy');
      expect(relativeDay(offset(now, 1, h), now)).toBe('Mañana');
      expect(relativeDay(offset(now, -1, h), now)).toBe('Ayer');
    }), cfg(216, 500));
  });
  it('other offsets give a "weekday D de month" label', () => {
    fc.assert(fc.property(date, fc.integer({ min: 2, max: 500 }), fc.boolean(), (now, n, neg) => {
      const out = relativeDay(offset(now, neg ? -n : n, 12), now);
      expect(out).toMatch(/^[a-záéíóú]+ \d{1,2} de [a-z]+$/);
    }), cfg(217));
  });
});

describe('time: timeAgo', () => {
  const MIN = 60_000;
  it('invariant: non-empty Spanish phrase for any non-negative gap, buckets by size', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 400 * 24 * 60 }), fc.integer({ min: 0, max: 59 }), (min, sec) => {
      const now = 1_800_000_000_000;
      const out = timeAgo(now - min * MIN - sec * 1000, now);
      if (min < 2) expect(out).toBe('Hace un momento');
      else if (min < 60) expect(out).toBe(`Hace ${min} minutos`);
      else if (min < 1440) expect(out).toMatch(/^Hace (1 hora|\d+ horas)$/);
      else expect(out).toMatch(/^(Ayer|Hace \d+ días)$/);
    }), cfg(218, 500));
  });
  it('future timestamps read as "Hace un momento"', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 1e9 }), (ms) => { expect(timeAgo(1_800_000_000_000 + ms, 1_800_000_000_000)).toBe('Hace un momento'); }), cfg(219));
  });
});
