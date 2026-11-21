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
  // Partial Fisher–Yates: always two distinct picks in two steps, whatever `rand` returns.
  for (let k = 0; k < 2; k++) {
    const j = k + (Math.floor(rand() * (others.length - k)) % (others.length - k));
    [others[k], others[j]] = [others[j], others[k]];
  }
  const opts = [correct, others[0], others[1]];
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

/** Lowercase, no accents, no punctuation, single spaces: "¡Dios LE ayúda!" → "dios le ayuda". */
export function normalizeSpeech(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS = new Set(['que', 'no', 'se', 'le', 'lo', 'el', 'la', 'los', 'las', 'de', 'del', 'en', 'y', 'a', 'al', 'mas', 'un', 'una', 'te', 'y']);
const NUMBER_WORDS: string[][] = [
  ['1', 'uno', 'una', 'primera', 'primero'],
  ['2', 'dos', 'segunda', 'segundo'],
  ['3', 'tres', 'tercera', 'tercero'],
];

const keyWords = (s: string) => {
  const all = normalizeSpeech(s).split(' ').filter(Boolean);
  const content = all.filter((w) => !STOPWORDS.has(w));
  return content.length ? content : all;
};

/**
 * Which option the person said, from the recogniser's alternatives (best first). Accepts the ending
 * itself (with extra words, any accents or case) or the option number ("la dos", "tercera").
 * Returns null when nothing matches clearly, so the game can ask again instead of guessing.
 */
export function matchSpokenAnswer(heard: string[], options: string[]): number | null {
  for (const raw of heard) {
    const words = normalizeSpeech(raw).split(' ').filter(Boolean);
    if (!words.length) continue;
    const said = new Set(words);
    // Content words of each option that were said.
    const scores = options.map((o) => {
      const kw = keyWords(o);
      return kw.filter((w) => said.has(w)).length / kw.length;
    });
    const ranked = scores.map((sc, i) => ({ sc, i })).sort((a, b) => b.sc - a.sc);
    if (ranked[0] && ranked[0].sc >= 0.6 && ranked[0].sc - (ranked[1]?.sc ?? 0) >= 0.25) return ranked[0].i;
    // A short answer naming the option number.
    if (words.length <= 4) {
      const hits = NUMBER_WORDS.slice(0, options.length)
        .map((ws, i) => (ws.some((w) => said.has(w)) ? i : -1))
        .filter((i) => i >= 0);
      if (hits.length === 1) return hits[0];
    }
  }
  return null;
}
