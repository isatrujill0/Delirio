const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export type PartOfDay = 'madrugada' | 'mañana' | 'tarde' | 'noche';

export function partOfDay(hour: number): PartOfDay {
  if (hour < 5) return 'madrugada';
  if (hour < 12) return 'mañana';
  if (hour < 19) return 'tarde';
  return 'noche';
}

/** "miércoles" / "18 de noviembre de 2026" */
export function longDate(d: Date): { weekday: string; day: string } {
  return {
    weekday: DAYS[d.getDay()],
    day: `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`,
  };
}

/** 12-hour clock in Colombian style: { time: "10:30", period: "a.m." } */
export function clock(d: Date): { time: string; period: 'a.m.' | 'p.m.' } {
  return formatHM(d.getHours(), d.getMinutes());
}

export function formatHM(h: number, m: number): { time: string; period: 'a.m.' | 'p.m.' } {
  const hh = ((h + 11) % 12) + 1;
  return { time: `${hh}:${String(m).padStart(2, '0')}`, period: h < 12 ? 'a.m.' : 'p.m.' };
}

/** "08:30" -> minutes since midnight, or null if malformed. */
export function parseHM(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function hmToLabel(s: string): string {
  const mins = parseHM(s);
  if (mins === null) return s;
  const { time, period } = formatHM(Math.floor(mins / 60), mins % 60);
  return `${time} ${period}`;
}

/** "Hoy", "Mañana", "Ayer" or "viernes 20 de noviembre". */
export function relativeDay(target: Date, now: Date): string {
  const a = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = Math.round((a - b) / 86_400_000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  return `${DAYS[target.getDay()]} ${target.getDate()} de ${MONTHS[target.getMonth()]}`;
}

/** "Hace 2 horas", "Hace un momento"… */
export function timeAgo(ts: number, now: number): string {
  const min = Math.floor((now - ts) / 60_000);
  if (min < 2) return 'Hace un momento';
  if (min < 60) return `Hace ${min} minutos`;
  const h = Math.floor(min / 60);
  if (h < 24) return h === 1 ? 'Hace 1 hora' : `Hace ${h} horas`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'Ayer' : `Hace ${d} días`;
}

/** Seconds as "m:ss". Negative and non-finite input clamps to 0:00. */
export function mmss(totalSeconds: number): string {
  const s = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Spoken-length estimate for a message read aloud (~2.3 words per second, 3s minimum). */
export function speechSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round(words / 2.3));
}
