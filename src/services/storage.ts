import type { AppData, Contact, FamilyMessage, MessageKind, MoodEntry, MoodValue, Photo, Preferences, Procedure, ProcedureStatus, Recommendation, RecommendationCategory, TextSize, Treatment, Vitals } from '../types';
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

const optStr = (v: unknown) => (typeof v === 'string' ? v : undefined);
const reqStr = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v : null);
const KINDS: MessageKind[] = ['audio', 'video', 'texto'];
const STATUSES: ProcedureStatus[] = ['programado', 'confirmado', 'realizado', 'reprogramado', 'cancelado'];
const CATEGORIES: RecommendationCategory[] = ['Descanso', 'Alimentación', 'Movimiento', 'Emociones', 'Visitas'];

/**
 * Keeps only list items whose required fields are present and well-typed, rebuilt field by field.
 * A single damaged record is dropped instead of crashing every screen that reads it.
 */
function list<T>(v: unknown, fallback: T[], fix: (x: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(v)) return fallback;
  const out: T[] = [];
  const ids = new Set<string>();
  for (const x of v) {
    if (!isObj(x) || typeof x.id !== 'string' || ids.has(x.id)) continue;
    const item = fix(x);
    if (item) {
      ids.add(x.id);
      out.push(item);
    }
  }
  return out;
}

/**
 * Migration from data saved before the `demo` flag existed on care items and moods (≤ 3a1b536):
 * a record without the flag is demo when its id is one of the built-in demo ids.
 */
const LEGACY_DEMO_IDS = (() => {
  const d = createDemoData(new Date(0));
  return new Set([...d.treatments, ...d.procedures, ...d.recommendations].map((x) => x.id));
})();
const demoFlag = (x: Record<string, unknown>) => (typeof x.demo === 'boolean' ? x.demo : LEGACY_DEMO_IDS.has(x.id as string));
/** The demo care note of earlier versions read as a clinical assessment ("estable"); it is replaced on load. */
const LEGACY_DEMO_NOTE = 'Te encuentras estable y recibiendo el cuidado que necesitas.';

const fixContact = (x: Record<string, unknown>): Contact | null => {
  const name = reqStr(x.name);
  if (!name) return null;
  const c: Contact = { id: x.id as string, name, relation: str(x.relation, ''), phone: str(x.phone, ''), about: str(x.about, ''), demo: bool(x.demo, false) };
  const photo = optStr(x.photo);
  if (photo) c.photo = photo;
  return c;
};

const fixMessage = (x: Record<string, unknown>): FamilyMessage | null => {
  const contactId = reqStr(x.contactId);
  if (!contactId || !KINDS.includes(x.kind as MessageKind) || typeof x.createdAt !== 'number' || !Number.isFinite(x.createdAt)) return null;
  const m: FamilyMessage = { id: x.id as string, contactId, kind: x.kind as MessageKind, text: str(x.text, ''), createdAt: x.createdAt, read: bool(x.read, false), demo: bool(x.demo, false) };
  const media = optStr(x.media);
  if (media) m.media = media;
  if (typeof x.duration === 'number' && Number.isFinite(x.duration) && x.duration >= 0) m.duration = x.duration;
  if (m.kind !== 'texto' && !m.media && !m.text) return null; // nothing to play
  return m;
};

const fixPhoto = (x: Record<string, unknown>): Photo | null => {
  const src = reqStr(x.src);
  if (!src) return null;
  const p: Photo = { id: x.id as string, src, caption: str(x.caption, ''), demo: bool(x.demo, false) };
  const contactId = optStr(x.contactId);
  if (contactId) p.contactId = contactId;
  return p;
};

const fixTreatment = (x: Record<string, unknown>): Treatment | null => {
  const name = reqStr(x.name);
  if (!name) return null;
  return {
    id: x.id as string,
    name,
    description: str(x.description, ''),
    startDate: str(x.startDate, ''),
    frequency: str(x.frequency, ''),
    times: arr<unknown>(x.times, []).filter((t): t is string => typeof t === 'string'),
    observations: str(x.observations, ''),
    demo: demoFlag(x),
  };
};

const fixProcedure = (x: Record<string, unknown>): Procedure | null => {
  const name = reqStr(x.name);
  const date = reqStr(x.date);
  if (!name || !date) return null;
  const status = STATUSES.includes(x.status as ProcedureStatus) ? (x.status as ProcedureStatus) : 'programado';
  return { id: x.id as string, name, date, description: str(x.description, ''), status, demo: demoFlag(x) };
};

const fixRecommendation = (x: Record<string, unknown>): Recommendation | null => {
  const title = reqStr(x.title);
  if (!title || !CATEGORIES.includes(x.category as RecommendationCategory)) return null;
  return { id: x.id as string, category: x.category as RecommendationCategory, title, summary: str(x.summary, ''), body: str(x.body, ''), demo: demoFlag(x) };
};

/** `legacyDemo`: what a mood without a `demo` flag is (true when the stored set is still the demo one). */
function sanitizeMoods(v: unknown, fallback: MoodEntry[], legacyDemo = false): MoodEntry[] {
  if (!Array.isArray(v)) return fallback;
  const byDate = new Map<string, MoodEntry>();
  for (const m of v) {
    if (!isObj(m) || typeof m.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(m.date)) continue;
    const value = Math.round(num(m.value, 0));
    if (value >= 1 && value <= 5) byDate.set(m.date, { date: m.date, value: value as MoodValue, demo: bool(m.demo, legacyDemo) });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-60);
}

function sanitizeVitals(v: unknown, fallback: Vitals | null): Vitals | null {
  if (!isObj(v)) return fallback;
  // Without a real timestamp the reading could look recent when it is not: drop it.
  if (typeof v.recordedAt !== 'number' || !Number.isFinite(v.recordedAt)) return null;
  return {
    heartRate: clamp(Math.round(num(v.heartRate, 0)), 0, 250),
    respRate: clamp(Math.round(num(v.respRate, 0)), 0, 80),
    spo2: clamp(Math.round(num(v.spo2, 0)), 0, 100),
    recordedAt: v.recordedAt,
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
  return {
    version: 1,
    userName: str(raw.userName, defaults.userName).slice(0, 40),
    location: str(raw.location, defaults.location),
    weather: { city: str(w.city, defaults.weather.city), tempC: clamp(temp, -40, 60), condition: str(w.condition, defaults.weather.condition) },
    prefs,
    contacts: list(raw.contacts, defaults.contacts, fixContact),
    messages: list(raw.messages, defaults.messages, fixMessage),
    photos: list(raw.photos, defaults.photos, fixPhoto),
    treatments: list(raw.treatments, defaults.treatments, fixTreatment),
    procedures: list(raw.procedures, defaults.procedures, fixProcedure),
    recommendations: list(raw.recommendations, defaults.recommendations, fixRecommendation),
    favorites: arr<unknown>(raw.favorites, []).filter((x): x is string => typeof x === 'string'),
    // Older saves have unflagged moods; while the care note is still the demo one, they are the demo history.
    moods: sanitizeMoods(raw.moods, defaults.moods, isObj(raw.careNote) && raw.careNote.demo === true),
    vitals: raw.vitals === null ? null : sanitizeVitals(raw.vitals, defaults.vitals),
    careNote: isObj(raw.careNote) && typeof raw.careNote.text === 'string'
      ? // A note without a real date gets updatedAt 0, which the UI shows as "sin fecha" rather than "ahora".
        {
          text: raw.careNote.demo === true && raw.careNote.text === LEGACY_DEMO_NOTE ? defaults.careNote.text : raw.careNote.text.slice(0, 280),
          updatedAt: num(raw.careNote.updatedAt, 0),
          demo: bool(raw.careNote.demo, false),
        }
      : defaults.careNote,
    scores: isObj(raw.scores)
      ? Object.fromEntries(Object.entries(raw.scores).filter(([, v]) => typeof v === 'number' && Number.isFinite(v) && v >= 0).map(([k, v]) => [k, Math.floor(v as number) || 0]))
      : {},
    caregiverPin: typeof raw.caregiverPin === 'string' && /^\d{4,6}$/.test(raw.caregiverPin) ? raw.caregiverPin : defaults.caregiverPin,
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

export const BACKUP_KEY = `${STORAGE_KEY}:respaldo`;

/** Copies the raw stored payload to a backup key before it gets replaced (best effort). */
export function backupRaw(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) localStorage.setItem(BACKUP_KEY, raw);
  } catch {
    /* storage blocked or full: nothing more we can do */
  }
}

export function loadData(): LoadResult {
  const defaults = createDemoData();
  try {
    const result = parse(localStorage.getItem(STORAGE_KEY), defaults);
    // Damaged data is about to be overwritten by the demo set: keep a copy for whoever can recover it.
    if (result.error === 'corrupt') backupRaw();
    return result;
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
