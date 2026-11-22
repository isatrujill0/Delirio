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
  systolic: { min: 50, max: 250, label: 'Presión arterial' },
  diastolic: { min: 30, max: 150, label: 'Presión arterial' },
} as const;

/** Range checks only — these catch typing mistakes, they are not clinical thresholds. */
export function validateVitals(v: Pick<Vitals, 'heartRate' | 'respRate' | 'spo2' | 'systolic' | 'diastolic'>): Record<string, string> {
  const e: Record<string, string> = {};
  for (const k of Object.keys(VITAL_RANGES) as (keyof typeof VITAL_RANGES)[]) {
    const r = VITAL_RANGES[k];
    if (!Number.isFinite(v[k]) || v[k] < r.min || v[k] > r.max) e[k] = `Escribe un valor entre ${r.min} y ${r.max}.`;
  }
  return e;
}

/**
 * Plausible ranges for the simulated feed of the integrated monitor (demo): a person resting in bed,
 * fairly stable. The real device would read these values from its monitor instead.
 */
export const SIM_RANGES = {
  heartRate: { min: 68, max: 92, step: 2 },
  respRate: { min: 14, max: 20, step: 1 },
  spo2: { min: 94, max: 98, step: 1 },
  systolic: { min: 108, max: 128, step: 2 },
  diastolic: { min: 68, max: 82, step: 2 },
} as const;

type SimVitals = Pick<Vitals, 'heartRate' | 'respRate' | 'spo2' | 'systolic' | 'diastolic'>;

/**
 * One gentle step of a bounded random walk: each value moves by at most its `step`,
 * leans back toward the middle of its range, and never leaves the range.
 */
export function simulateVitalsStep(cur: SimVitals, rand: () => number = Math.random): SimVitals {
  const next = {} as SimVitals;
  for (const k of Object.keys(SIM_RANGES) as (keyof typeof SIM_RANGES)[]) {
    const { min, max, step } = SIM_RANGES[k];
    const start = Math.min(max, Math.max(min, Math.round(Number.isFinite(cur[k]) ? cur[k] : (min + max) / 2)));
    const mid = (min + max) / 2;
    const pull = (mid - start) / (max - min); // −0.5 … 0.5: drift back toward the middle
    const delta = Math.round((rand() * 2 - 1 + pull) * step);
    next[k] = Math.min(max, Math.max(min, start + Math.max(-step, Math.min(step, delta))));
  }
  return next;
}

export type VitalKey = keyof typeof SIM_RANGES;

/**
 * Reference ranges the monitor view compares against (adult at rest). In a real deployment the
 * care team sets them; NEXO only says "inside / outside the reference range" — it never diagnoses.
 */
export const REFERENCE_RANGES: Record<VitalKey, { min: number; max: number }> = {
  heartRate: { min: 60, max: 100 },
  respRate: { min: 12, max: 20 },
  spo2: { min: 94, max: 100 },
  systolic: { min: 90, max: 130 },
  diastolic: { min: 60, max: 85 },
};

export type VitalStatus = 'en-rango' | 'bajo' | 'alto';

export function vitalStatus(key: VitalKey, value: number): VitalStatus {
  const r = REFERENCE_RANGES[key];
  return value < r.min ? 'bajo' : value > r.max ? 'alto' : 'en-rango';
}

export const STATUS_TEXT: Record<VitalStatus, string> = {
  'en-rango': 'En rango',
  bajo: 'Por debajo del rango',
  alto: 'Por encima del rango',
};

export type VitalTrend = 'estable' | 'sube' | 'baja';

/**
 * Direction of the recent readings: compares the mean of the newest third with the oldest third.
 * Changes smaller than `tolerance` (per vital) count as stable, so normal jitter reads as "estable".
 */
export function vitalTrend(samples: number[], tolerance: number): VitalTrend {
  const v = samples.filter((x) => Number.isFinite(x));
  if (v.length < 6) return 'estable';
  const third = Math.floor(v.length / 3);
  const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  const diff = avg(v.slice(-third)) - avg(v.slice(0, third));
  return diff > tolerance ? 'sube' : diff < -tolerance ? 'baja' : 'estable';
}

export const TREND_TOLERANCE: Record<VitalKey, number> = { heartRate: 4, respRate: 1.5, spo2: 1, systolic: 4, diastolic: 3 };
// "Sin cambios", not "Estable": a direction of change, never a statement about the person's health.
export const VITAL_TREND_TEXT: Record<VitalTrend, string> = { estable: 'Sin cambios', sube: 'Subiendo', baja: 'Bajando' };
