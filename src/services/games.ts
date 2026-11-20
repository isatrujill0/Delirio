/** Pure game logic, kept apart from the UI so it can be tested. */

export const PROVERBS: { start: string; end: string }[] = [
  { start: 'Al que madruga…', end: 'Dios le ayuda' },
  { start: 'Más vale tarde…', end: 'que nunca' },
  { start: 'Camarón que se duerme…', end: 'se lo lleva la corriente' },
  { start: 'No por mucho madrugar…', end: 'amanece más temprano' },
  { start: 'A caballo regalado…', end: 'no se le mira el colmillo' },
  { start: 'Más vale pájaro en mano…', end: 'que cien volando' },
  { start: 'Del dicho al hecho…', end: 'hay mucho trecho' },
  { start: 'Perro que ladra…', end: 'no muerde' },
  { start: 'Dime con quién andas…', end: 'y te diré quién eres' },
  { start: 'En boca cerrada…', end: 'no entran moscas' },
];

/** Three distinct options for proverb `i`, the correct ending among them, in shuffled order. */
export function proverbOptions(i: number, rand: () => number = Math.random): string[] {
  const n = PROVERBS.length;
  const idx = ((i % n) + n) % n;
  const correct = PROVERBS[idx].end;
  const others = PROVERBS.map((p) => p.end).filter((e) => e !== correct);
  const pick: string[] = [];
  while (pick.length < 2) {
    const c = others[Math.floor(rand() * others.length) % others.length];
    if (!pick.includes(c)) pick.push(c);
  }
  const opts = [correct, ...pick];
  for (let k = opts.length - 1; k > 0; k--) {
    const j = Math.floor(rand() * (k + 1)) % (k + 1);
    [opts[k], opts[j]] = [opts[j], opts[k]];
  }
  return opts;
}

/** Echo of lights: sequence grows by one random pad (0–3) per round. */
export function extendSequence(seq: number[], rand: () => number = Math.random): number[] {
  return [...seq, Math.floor(rand() * 4) % 4];
}

export type EchoResult = 'continue' | 'round-complete' | 'mistake';

/** Checks the player's taps so far against the sequence. */
export function checkEcho(seq: number[], taps: number[]): EchoResult {
  for (let i = 0; i < taps.length; i++) if (taps[i] !== seq[i]) return 'mistake';
  return taps.length === seq.length ? 'round-complete' : 'continue';
}

/** Landscape awakening: fraction revealed after `taps` gentle touches (never more than 1). */
export function revealFraction(taps: number, needed = 7): number {
  if (taps <= 0) return 0;
  return Math.min(1, taps / needed);
}
