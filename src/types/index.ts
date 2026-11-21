/** A media reference: a bundled asset ("asset:<key>"), a blob in IndexedDB ("idb:<id>") or none. */
export type MediaRef = string;

export type SectionId = 'inicio' | 'gente' | 'mundo' | 'cuidado';

export interface Contact {
  id: string;
  name: string;
  relation: string;
  phone: string;
  about: string;
  photo?: MediaRef;
  demo: boolean;
}

export type MessageKind = 'audio' | 'video' | 'texto' | 'imagen';

/** Who wrote the message in the chat: the family member (contact) or the patient. */
export type MessageFrom = 'contacto' | 'paciente';

export interface FamilyMessage {
  id: string;
  contactId: string;
  kind: MessageKind;
  from: MessageFrom;
  /** Text content; for demo voice messages this is read aloud by the device voice. */
  text: string;
  media?: MediaRef;
  /** Known duration in seconds (recorded media) — estimated for text read aloud. */
  duration?: number;
  createdAt: number;
  read: boolean;
  demo: boolean;
}

export interface Photo {
  id: string;
  src: MediaRef;
  caption: string;
  contactId?: string;
  demo: boolean;
}

export interface Treatment {
  id: string;
  name: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  frequency: string;
  /** Optional reminder times "HH:MM". */
  times: string[];
  observations: string;
  demo: boolean;
}

export type ProcedureStatus = 'programado' | 'confirmado' | 'realizado' | 'reprogramado' | 'cancelado';

export interface Procedure {
  id: string;
  name: string;
  date: string; // local "YYYY-MM-DDTHH:MM"
  description: string;
  status: ProcedureStatus;
  demo: boolean;
}

export type RecommendationCategory = 'Descanso' | 'Alimentación' | 'Movimiento' | 'Emociones' | 'Visitas';

export interface Recommendation {
  id: string;
  category: RecommendationCategory;
  title: string;
  summary: string;
  body: string;
  demo: boolean;
}

/** 1 = bajo … 5 = bien */
export type MoodValue = 1 | 2 | 3 | 4 | 5;

export interface MoodEntry {
  date: string; // YYYY-MM-DD
  value: MoodValue;
  /** Sample history shown on first launch. */
  demo?: boolean;
}

/** Vital signs: from the integrated monitor (simulated in the demo, `demo: true`) or typed in by the care team. */
export interface Vitals {
  heartRate: number; // lpm
  respRate: number; // rpm
  spo2: number; // %
  recordedAt: number;
  demo: boolean;
}

export interface CareNote {
  text: string;
  updatedAt: number;
  demo: boolean;
}

export type TextSize = 'normal' | 'grande' | 'muy-grande';

export interface Preferences {
  volume: number; // 0–100
  muted: boolean;
  textSize: TextSize;
  reduceMotion: boolean;
  notifications: {
    enabled: boolean;
    sound: boolean;
    treatments: boolean;
    procedures: boolean;
    messages: boolean;
  };
}

export interface Weather {
  city: string;
  tempC: number;
  condition: string;
}

export interface AppData {
  version: 1;
  userName: string;
  location: string;
  weather: Weather;
  prefs: Preferences;
  contacts: Contact[];
  messages: FamilyMessage[];
  photos: Photo[];
  treatments: Treatment[];
  procedures: Procedure[];
  recommendations: Recommendation[];
  moods: MoodEntry[];
  vitals: Vitals | null;
  careNote: CareNote;
  favorites: string[];
  /** Best score per cognitive game. */
  scores: Record<string, number>;
  dismissedNotifications: string[];
  /** 4–6 digit PIN that unlocks editing for family and staff (a deterrent, not security). */
  caregiverPin: string;
}

export type TrackCategory = 'musica' | 'naturaleza';

export interface Track {
  id: string;
  category: TrackCategory;
  title: string;
  subtitle: string;
  src: string;
  loop: boolean;
}

export interface Landscape {
  id: string;
  title: string;
  place: string;
  /** Nature track that fits the scene. */
  soundId: string;
  palette: [string, string, string, string, string];
  sun: 'sol' | 'luna';
}

export interface AppNotification {
  id: string;
  kind: 'tratamiento' | 'procedimiento' | 'mensaje';
  title: string;
  body: string;
  section: SectionId;
}
