import type { Procedure, ProcedureStatus, Treatment } from '../types';
import { parseHM } from './time';

export const STATUS_LABEL: Record<ProcedureStatus, string> = {
  programado: 'Programado',
  confirmado: 'Confirmado',
  realizado: 'Realizado',
  reprogramado: 'Reprogramado',
  cancelado: 'Cancelado',
};

export interface NextDose {
  treatment: Treatment;
  time: string;
  /** Minutes from now until the dose (always ≥ 0). */
  inMinutes: number;
  tomorrow: boolean;
}

/** Next reminder time across all treatments, wrapping to tomorrow. Null when no valid times. */
export function nextDose(treatments: Treatment[], now: Date): NextDose | null {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let best: NextDose | null = null;
  for (const treatment of treatments) {
    for (const time of treatment.times) {
      const m = parseHM(time);
      if (m === null) continue;
      const tomorrow = m < nowMin;
      const inMinutes = tomorrow ? m + 1440 - nowMin : m - nowMin;
      if (!best || inMinutes < best.inMinutes) best = { treatment, time, inMinutes, tomorrow };
    }
  }
  return best;
}

export const procTime = (p: Procedure) => new Date(p.date).getTime();

/** Pending procedures soonest first, then finished/cancelled ones most recent first. */
export function orderProcedures(list: Procedure[]): { pending: Procedure[]; past: Procedure[] } {
  const done = (p: Procedure) => p.status === 'realizado' || p.status === 'cancelado';
  const valid = list.filter((p) => Number.isFinite(procTime(p)));
  return {
    pending: valid.filter((p) => !done(p)).sort((a, b) => procTime(a) - procTime(b)),
    past: valid.filter(done).sort((a, b) => procTime(b) - procTime(a)),
  };
}

export interface FieldErrors {
  [field: string]: string;
}

export function validateTreatment(t: Pick<Treatment, 'name' | 'startDate' | 'frequency' | 'times'>): FieldErrors {
  const e: FieldErrors = {};
  if (!t.name.trim()) e.name = 'Escribe el nombre del tratamiento.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.startDate) || Number.isNaN(Date.parse(t.startDate))) e.startDate = 'Elige una fecha de inicio válida.';
  if (!t.frequency.trim()) e.frequency = 'Indica cada cuánto se aplica.';
  if (t.times.some((x) => parseHM(x) === null)) e.times = 'Usa horas como 08:00, separadas por comas.';
  return e;
}

export function validateProcedure(p: Pick<Procedure, 'name' | 'date'>): FieldErrors {
  const e: FieldErrors = {};
  if (!p.name.trim()) e.name = 'Escribe el nombre del procedimiento.';
  if (!p.date || Number.isNaN(new Date(p.date).getTime())) e.date = 'Elige fecha y hora.';
  return e;
}

/** "08:00, 14:00 ,x" → ["08:00","14:00","x"] (validation happens separately). */
export function splitTimes(s: string): string[] {
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}
