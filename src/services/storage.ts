import type { AppData, MoodEntry, MoodValue, Preferences, TextSize, Vitals } from '../types';
import { createDemoData } from '../data/demo';

export const STORAGE_KEY = 'nexo:data:v1';

export type StorageError = 'quota' | 'unavailable' | 'corrupt';

export interface LoadResult {
  data: AppData;
  error?: StorageError;
}

const TEXT_SIZES: TextSize[] = ['normal', 'grande', 'muy-grande'];
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const arr = <T>(v: unknown, fallback: T[]): T[] => (Array.isArray(v) ? (v as T[]) : fallback);
const str = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback);
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

function sanitizeMoods(v: unknown, fallback: MoodEntry[]): MoodEntry[] {
  if (!Array.isArray(v)) return fallback;
  const byDate = new Map<string, MoodEntry>();
  for (const m of v) {
    if (!isObj(m) || typeof m.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(m.date)) continue;
    const value = Math.round(num(m.value, 0));
    if (value >= 1 && value <= 5) byDate.set(m.date, { date: m.date, value: value as MoodValue });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-60);
}

function sanitizeVitals(v: unknown, fallback: Vitals | null): Vitals | null {
  if (!isObj(v)) return fallback;
  return {
    heartRate: clamp(Math.round(num(v.heartRate, 0)), 0, 250),
    respRate: clamp(Math.round(num(v.respRate, 0)), 0, 80),
    spo2: clamp(Math.round(num(v.spo2, 0)), 0, 100),
    recordedAt: num(v.recordedAt, Date.now()),
    demo: bool(v.demo, false),
  };
}

/**
 * Normalises anything read from storage into a valid AppData, filling gaps from `defaults`.
 * Unknown fields are dropped; out-of-range values are clamped. Never throws.
 */
export function sanitize(raw: unknown, defaults: AppData): AppData {
  if (!isObj(raw)) return defaults;
  const p = isObj(raw.prefs) ? raw.prefs : {};
  const n = isObj(p.notifications) ? p.notifications : {};
  const dn = defaults.prefs.notifications;
  const vol = typeof p.volume === 'number' && Number.isFinite(p.volume) ? clamp(Math.round(p.volume), 0, 100) : defaults.prefs.volume;
  const prefs: Preferences = {
    volume: vol,
    muted: bool(p.muted, defaults.prefs.muted),
    textSize: TEXT_SIZES.includes(p.textSize as TextSize) ? (p.textSize as TextSize) : defaults.prefs.textSize,
    reduceMotion: bool(p.reduceMotion, defaults.prefs.reduceMotion),
    notifications: {
      enabled: bool(n.enabled, dn.enabled),
      sound: bool(n.sound, dn.sound),
      treatments: bool(n.treatments, dn.treatments),
      procedures: bool(n.procedures, dn.procedures),
      messages: bool(n.messages, dn.messages),
    },
  };
  const w = isObj(raw.weather) ? raw.weather : {};
  const temp = typeof w.tempC === 'number' && Number.isFinite(w.tempC) ? Math.round(w.tempC) : defaults.weather.tempC;
  const withId = <T>(list: T[]) => list.filter((x) => isObj(x) && typeof (x as { id?: unknown }).id === 'string');
  return {
    version: 1,
    userName: str(raw.userName, defaults.userName).slice(0, 40),
    location: str(raw.location, defaults.location),
    weather: { city: str(w.city, defaults.weather.city), tempC: clamp(temp, -40, 60), condition: str(w.condition, defaults.weather.condition) },
    prefs,
    contacts: withId(arr(raw.contacts, defaults.contacts)),
    messages: withId(arr(raw.messages, defaults.messages)),
    photos: withId(arr(raw.photos, defaults.photos)),
    treatments: withId(arr(raw.treatments, defaults.treatments)).map((t) => ({ ...t, times: arr<string>(t.times, []).filter((x) => typeof x === 'string') })),
    procedures: withId(arr(raw.procedures, defaults.procedures)),
    recommendations: withId(arr(raw.recommendations, defaults.recommendations)),
    favorites: arr<unknown>(raw.favorites, []).filter((x): x is string => typeof x === 'string'),
    moods: sanitizeMoods(raw.moods, defaults.moods),
    vitals: raw.vitals === null ? null : sanitizeVitals(raw.vitals, defaults.vitals),
    careNote: isObj(raw.careNote) && typeof raw.careNote.text === 'string'
      ? { text: raw.careNote.text.slice(0, 280), updatedAt: num(raw.careNote.updatedAt, Date.now()), demo: bool(raw.careNote.demo, false) }
      : defaults.careNote,
    scores: isObj(raw.scores)
      ? Object.fromEntries(Object.entries(raw.scores).filter(([, v]) => typeof v === 'number' && Number.isFinite(v) && v >= 0).map(([k, v]) => [k, Math.floor(v as number)]))
      : {},
    dismissedNotifications: arr<unknown>(raw.dismissedNotifications, []).filter((x): x is string => typeof x === 'string').slice(-200),
  };
}

export function serialize(data: AppData): string {
  return JSON.stringify(data);
}

/** Parse a stored string. Missing → demo data; malformed → demo data plus a `corrupt` error. */
export function parse(json: string | null, defaults: AppData): LoadResult {
  if (json === null) return { data: defaults };
  try {
    return { data: sanitize(JSON.parse(json), defaults) };
  } catch {
    return { data: defaults, error: 'corrupt' };
  }
}

export function loadData(): LoadResult {
  const defaults = createDemoData();
  try {
    return parse(localStorage.getItem(STORAGE_KEY), defaults);
  } catch {
    return { data: defaults, error: 'unavailable' };
  }
}

/** Returns an error code instead of throwing, so the UI can explain what happened. */
export function saveData(data: AppData): StorageError | null {
  try {
    localStorage.setItem(STORAGE_KEY, serialize(data));
    return null;
  } catch (e) {
    const name = e instanceof DOMException ? e.name : '';
    return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' ? 'quota' : 'unavailable';
  }
}

export function clearData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage blocked: nothing to clear */
  }
}
