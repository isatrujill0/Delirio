import type { MoodEntry, MoodValue, Vitals } from '../types';

export const MOODS: { value: MoodValue; label: string }[] = [
  { value: 5, label: 'Bien' },
  { value: 4, label: 'En calma' },
  { value: 3, label: 'Neutral' },
  { value: 2, label: 'Con cansancio' },
  { value: 1, label: 'Sin ánimo' },
];
export const moodLabel = (v: MoodValue) => MOODS.find((m) => m.value === v)!.label;

const pad = (n: number) => String(n).padStart(2, '0');
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Insert or replace the entry for `date`; result stays sorted and one-per-day. */
export function upsertMood(list: MoodEntry[], date: string, value: MoodValue): MoodEntry[] {
  // Logged by the patient: never sample data.
  return [...list.filter((m) => m.date !== date), { date, value, demo: false }].sort((a, b) => a.date.localeCompare(b.date));
}

/** The last `n` calendar days ending today, with the mood logged that day (or null). */
export function lastDays(list: MoodEntry[], now: Date, n = 7): { date: string; value: MoodValue | null }[] {
  const map = new Map(list.map((m) => [m.date, m.value]));
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (n - 1 - i));
    const key = isoDay(d);
    return { date: key, value: map.get(key) ?? null };
  });
}

export type Trend = 'mejora' | 'estable' | 'baja' | 'pocos-datos';

/** Compares the average of the most recent half of logged days with the earlier half. */
export function moodTrend(values: (number | null)[]): Trend {
  const v = values.filter((x): x is number => x !== null);
  if (v.length < 3) return 'pocos-datos';
  const half = Math.floor(v.length / 2);
  const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  const diff = avg(v.slice(-half)) - avg(v.slice(0, half));
  if (diff >= 0.4) return 'mejora';
  if (diff <= -0.4) return 'baja';
  return 'estable';
}

export const TREND_TEXT: Record<Trend, { title: string; body: string }> = {
  // Self-reported mood only: never phrased as a clinical assessment.
  mejora: { title: 'Te sientes mejor', body: 'Según lo que registraste, estos días te has sentido mejor que antes.' },
  estable: { title: 'Ánimo parejo', body: 'Según lo que registraste, tu ánimo se ha mantenido parecido.' },
  baja: { title: 'Te acompañamos', body: 'Registraste días más difíciles. Cuéntale a tu enfermera o a tu familia cómo te sientes.' },
  'pocos-datos': { title: 'Empecemos', body: 'Registra cada día cómo te sientes para ver aquí tu ánimo.' },
};

export const VITAL_RANGES = {
  heartRate: { min: 20, max: 250, label: 'Ritmo cardíaco' },
  respRate: { min: 4, max: 80, label: 'Respiración' },
  spo2: { min: 50, max: 100, label: 'Oxigenación' },
} as const;

/** Range checks only — these catch typing mistakes, they are not clinical thresholds. */
export function validateVitals(v: Pick<Vitals, 'heartRate' | 'respRate' | 'spo2'>): Record<string, string> {
  const e: Record<string, string> = {};
  for (const k of Object.keys(VITAL_RANGES) as (keyof typeof VITAL_RANGES)[]) {
    const r = VITAL_RANGES[k];
    if (!Number.isFinite(v[k]) || v[k] < r.min || v[k] > r.max) e[k] = `Escribe un valor entre ${r.min} y ${r.max}.`;
  }
  return e;
}
