import { useEffect, useState, type CSSProperties } from 'react';
import { HeartPulse, MessageSquareHeart, Pencil, Sprout, Activity, Heart, Wind } from 'lucide-react';
import type { MoodValue } from '../../types';
import { useAppData } from '../../hooks/useAppData';
import { useUI } from '../../hooks/useUI';
import { useNow } from '../../hooks/useNow';
import { MOODS, isoDay, lastDays, moodTrend, upsertMood, validateVitals, TREND_TEXT, moodLabel, simulateVitalsStep } from '../../services/wellbeing';
import type { Vitals } from '../../types';
import { timeAgo, clock } from '../../services/time';
import { MoodChart } from '../../components/MoodChart';
import { DemoTag } from '../../components/Media';
import { Confirm, Sheet } from '../../components/Sheet';
import { useCaregiver } from '../../hooks/useCaregiver';
import { Field } from '../../components/Form';

/** Hand-drawn face whose mouth curve follows the mood (5 = smile, 1 = frown). */
export function MoodFace({ value }: { value: MoodValue }) {
  const curve = (value - 3) * 4.5;
  return (
    <svg viewBox="0 0 48 48" className="mood-face" aria-hidden="true">
      <circle cx="24" cy="24" r="22" className="mood-face-disc" />
      <circle cx="17" cy="20" r="2.6" fill="currentColor" />
      <circle cx="31" cy="20" r="2.6" fill="currentColor" />
      <path d={`M15 ${31 - curve / 3} Q24 ${31 + curve} 33 ${31 - curve / 3}`} stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function CareNoteCard() {
  const { data, update } = useAppData();
  const { toast } = useUI();
  const { guard } = useCaregiver();
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState(data.careNote.text);
  const note = data.careNote;
  return (
    <article className="care-note-card">
      <span className="care-check"><MessageSquareHeart strokeWidth={1.8} /></span>
      <div className="care-note-text">
        <h2>Mensaje de tu equipo de salud</h2>
        <p>{note.text}</p>
        <small className="muted">
          Escrito por el personal · {note.updatedAt > 0 ? timeAgo(note.updatedAt, Date.now()).toLowerCase() : 'sin fecha'} {note.demo && <DemoTag label="Ejemplo" />}
        </small>
      </div>
      <button className="icon-btn icon-btn-soft" onClick={() => guard(() => { setText(note.text); setEdit(true); })} aria-label="Editar el mensaje del equipo de salud">
        <Pencil size={22} />
      </button>
      <svg className="care-flowers" viewBox="0 0 120 90" aria-hidden="true">
        {[[30, 40, 1], [70, 26, 0.8], [95, 55, 0.7]].map(([x, y, s], k) => (
          <g key={k} transform={`translate(${x} ${y}) scale(${s})`}>
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="0" cy="-11" rx="7" ry="11" transform={`rotate(${a})`} fill="#c7b2ff" opacity="0.75" />
            ))}
            <circle r="4" fill="#f4e7ff" />
          </g>
        ))}
      </svg>
      {edit && (
        <Sheet
          title="Nota del equipo de salud"
          onClose={() => setEdit(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setEdit(false)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!text.trim()) return toast('Escribe la nota antes de guardar.', 'error');
                  update((d) => ({ ...d, careNote: { text: text.trim(), updatedAt: Date.now(), demo: false } }));
                  setEdit(false);
                  toast('Nota actualizada', 'ok');
                }}
              >
                Guardar
              </button>
            </>
          }
        >
          <p className="muted">Para uso del personal de salud. Escribe en palabras sencillas y tranquilizadoras.</p>
          <Field label="Nota">{(id) => <textarea id={id} rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={280} />}</Field>
        </Sheet>
      )}
    </article>
  );
}

export function MoodCard() {
  const { data, update } = useAppData();
  const { toast } = useUI();
  const now = useNow();
  const today = isoDay(now);
  const current = data.moods.find((m) => m.date === today)?.value;
  return (
    <article className="mood-card glass">
      <h2>
        <MoodFace value={current ?? 4} /> ¿Cómo te sientes hoy?
      </h2>
      <div className="mood-options" role="radiogroup" aria-label="Cómo te sientes hoy">
        {MOODS.map((m) => (
          <button
            key={m.value}
            role="radio"
            aria-checked={current === m.value}
            className={`mood-opt ${current === m.value ? 'is-on' : ''}`}
            onClick={() => {
              update((d) => ({ ...d, moods: upsertMood(d.moods, today, m.value) }));
              toast(`Gracias. Hoy te sientes: ${m.label.toLowerCase()}.`, 'ok');
            }}
          >
            <MoodFace value={m.value} />
            <span>{m.label}</span>
          </button>
        ))}
      </div>
    </article>
  );
}

/** Every few seconds, demo vitals take one small plausible step. Real (staff-entered) vitals never change. */
function useSimulatedVitals(v: Vitals | null): Vitals | null {
  const [live, setLive] = useState(v);
  useEffect(() => {
    setLive(v);
    if (!v?.demo) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      setLive((cur) => (cur ? { ...cur, ...simulateVitalsStep(cur) } : cur));
    }, 4000);
    return () => window.clearInterval(id);
  }, [v]);
  return live;
}

export function VitalsCard() {
  const { data, update } = useAppData();
  const { toast } = useUI();
  const { guard } = useCaregiver();
  const [edit, setEdit] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const v = data.vitals;
  const shown = useSimulatedVitals(v);
  const simulated = !!v?.demo;
  const [form, setForm] = useState({ heartRate: '', respRate: '', spo2: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const at = v ? clock(new Date(v.recordedAt)) : null;

  const open = () => guard(() => {
    setForm({ heartRate: String(v?.heartRate ?? ''), respRate: String(v?.respRate ?? ''), spo2: String(v?.spo2 ?? '') });
    setErrors({});
    setEdit(true);
  });
  const save = () => {
    const vals = { heartRate: Number(form.heartRate), respRate: Number(form.respRate), spo2: Number(form.spo2) };
    const e = validateVitals(vals);
    setErrors(e);
    if (Object.keys(e).length) return;
    update((d) => ({ ...d, vitals: { ...vals, recordedAt: Date.now(), demo: false } }));
    setEdit(false);
    toast('Signos registrados', 'ok');
  };

  return (
    <article className="vitals-card glass">
      <button className="vitals-head" onClick={open} aria-label="Registrar signos vitales">
        <Activity className="vitals-icon" strokeWidth={1.6} />
        <span>
          <h2>Tu salud</h2>
          <small className="muted vitals-meta">
            {simulated
              ? 'Valores simulados: no vienen de un monitor'
              : v
                ? `Registrado ${timeAgo(v.recordedAt, Date.now()).toLowerCase()} · ${at!.time} ${at!.period}`
                : 'Aún no hay signos registrados'}
            {simulated && <DemoTag label="Simulación" />}
          </small>
        </span>
        <span
          className={`vitals-heart ${simulated ? 'is-live' : ''}`}
          style={shown ? ({ ['--beat' as string]: `${(60 / shown.heartRate).toFixed(2)}s` } as CSSProperties) : undefined}
          aria-hidden="true"
        >
          <HeartPulse strokeWidth={1.8} />
        </span>
      </button>
      {shown ? (
        <ul className="vitals">
          <li><Heart strokeWidth={1.6} /><span><small>Ritmo cardíaco</small><strong className="num">{shown.heartRate} <em>lpm</em></strong></span></li>
          <li><Wind strokeWidth={1.6} /><span><small>Respiración</small><strong className="num">{shown.respRate} <em>rpm</em></strong></span></li>
          <li><span className="o2" aria-hidden="true">O<sub>2</sub></span><span><small>Oxigenación</small><strong className="num">{shown.spo2} <em>%</em></strong></span></li>
        </ul>
      ) : (
        <button className="btn btn-ghost" onClick={open}>Registrar signos</button>
      )}
      {edit && (
        <Sheet
          title="Registrar signos vitales"
          onClose={() => setEdit(false)}
          footer={<><button className="btn btn-ghost" onClick={() => setEdit(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Guardar</button></>}
        >
          <p className="muted">Para el personal de salud. NEXO no está conectado a los monitores: los valores se escriben a mano y se muestran tal cual, sin interpretarlos.</p>
          <div className="form-row three">
            <Field label="Ritmo cardíaco (lpm)" error={errors.heartRate}>{(id, by) => <input id={id} aria-describedby={by} inputMode="numeric" value={form.heartRate} onChange={(e) => setForm({ ...form, heartRate: e.target.value })} />}</Field>
            <Field label="Respiración (rpm)" error={errors.respRate}>{(id, by) => <input id={id} aria-describedby={by} inputMode="numeric" value={form.respRate} onChange={(e) => setForm({ ...form, respRate: e.target.value })} />}</Field>
            <Field label="Oxigenación (%)" error={errors.spo2}>{(id, by) => <input id={id} aria-describedby={by} inputMode="numeric" value={form.spo2} onChange={(e) => setForm({ ...form, spo2: e.target.value })} />}</Field>
          </div>
          {v && (
            <button className="btn btn-ghost btn-danger-text" onClick={() => setConfirmDel(true)}>
              Borrar el registro actual
            </button>
          )}
        </Sheet>
      )}
      {confirmDel && (
        <Confirm
          title="¿Borrar los signos registrados?"
          message="Se borrará el último registro de signos vitales de este dispositivo."
          confirmLabel="Borrar"
          danger
          onCancel={() => setConfirmDel(false)}
          onConfirm={() => { update((d) => ({ ...d, vitals: null })); setConfirmDel(false); setEdit(false); toast('Registro eliminado', 'ok'); }}
        />
      )}
    </article>
  );
}

export function MoodHistoryCard() {
  const { data } = useAppData();
  const now = useNow();
  const days = lastDays(data.moods, now, 7);
  const shownDemo = data.moods.some((m) => m.demo && days.some((d) => d.date === m.date));
  const trend = TREND_TEXT[moodTrend(days.map((d) => d.value))];
  const last = [...days].reverse().find((d) => d.value !== null);
  return (
    <article className="evolution-card glass">
      <div className="evolution-main">
        <h2>Tu ánimo {shownDemo && <DemoTag label="Ejemplo" />}</h2>
        <p className="muted">Lo que registraste los últimos 7 días{last?.value ? ` · último: ${moodLabel(last.value).toLowerCase()}` : ''}.</p>
        <MoodChart points={days} />
      </div>
      <div className="evolution-badge">
        <Sprout strokeWidth={1.6} />
        <strong>{trend.title}</strong>
        <small>{trend.body}</small>
      </div>
    </article>
  );
}
