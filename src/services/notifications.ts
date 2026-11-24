import type { AppData, AppNotification } from '../types';
import { hmToLabel } from './time';
import { nextDose, procTime } from './care';
import { unreadFromFamily } from './messages';

const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

/**
 * Derives the notification list from the current data. Ids are stable per event
 * (per dose per day, per procedure, per message) so dismissals stick.
 */
export function deriveNotifications(data: AppData, now: Date): AppNotification[] {
  const cfg = data.prefs.notifications;
  if (!cfg.enabled) return [];
  const out: AppNotification[] = [];
  const contact = (id: string) => data.contacts.find((c) => c.id === id);

  if (cfg.messages) {
    for (const m of unreadFromFamily(data.messages)) {
      const who = contact(m.contactId)?.name ?? 'Tu familia';
      // Demo "audio" messages are text read aloud by NEXO, not a recorded voice.
      const what = m.kind === 'video' ? 'un video' : m.kind === 'imagen' ? 'una foto' : m.kind === 'audio' && m.media ? 'un mensaje de voz' : 'un mensaje';
      out.push({ id: `msg:${m.id}`, kind: 'mensaje', title: `${who} te envió ${what}`, body: `${m.demo ? 'Ejemplo · ' : ''}${m.text.slice(0, 90)}`, section: 'gente' });
    }
  }

  if (cfg.treatments) {
    const next = nextDose(data.treatments, now);
    if (next && !next.tomorrow && next.inMinutes <= 60) {
      for (const t of next.treatments) {
        out.push({
          id: `dose:${t.id}:${next.time}:${dayKey(now)}`,
          kind: 'tratamiento',
          title: `${t.name} a las ${hmToLabel(next.time)}`,
          body: `${t.demo ? 'Ejemplo · ' : ''}${next.inMinutes === 0 ? 'Es la hora de tu tratamiento. Tu enfermera te acompañará.' : `En ${next.inMinutes} minutos. Tu enfermera te acompañará.`}`,
          section: 'cuidado',
        });
      }
    }
  }

  if (cfg.procedures) {
    const t = now.getTime();
    for (const p of data.procedures) {
      if (p.status === 'realizado' || p.status === 'cancelado') continue;
      const when = procTime(p);
      if (when >= t && when - t <= 24 * 3_600_000) {
        const d = new Date(when);
        const label = hmToLabel(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
        const today = d.toDateString() === now.toDateString();
        out.push({ id: `proc:${p.id}:${p.date}`, kind: 'procedimiento', title: `${p.name}`, body: `${p.demo ? 'Ejemplo · ' : ''}${today ? 'Hoy' : 'Mañana'} a las ${label}.`, section: 'cuidado' });
      }
    }
  }

  const dismissed = new Set(data.dismissedNotifications);
  return out.filter((n) => !dismissed.has(n.id));
}

/**
 * Dismissed ids worth keeping: only those that would still be derived now.
 * Finished events drop out, so the list cannot grow without bound and push out live dismissals.
 */
export function pruneDismissed(data: AppData, now: Date, add: string[] = []): string[] {
  // Derive with every category on, so turning one off in settings does not forget its dismissals.
  const all = { enabled: true, sound: false, treatments: true, procedures: true, messages: true };
  const live = new Set(deriveNotifications({ ...data, prefs: { ...data.prefs, notifications: all }, dismissedNotifications: [] }, now).map((n) => n.id));
  return [...new Set([...data.dismissedNotifications, ...add])].filter((id) => live.has(id));
}
