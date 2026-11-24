import { useEffect, useState, type CSSProperties } from 'react';
import { HeartPulse, MessageSquareHeart, Pencil, Sprout, Activity, Heart, Wind, Gauge } from 'lucide-react';
import type { MoodValue } from '../../types';
import { useAppData } from '../../hooks/useAppData';
import { useUI } from '../../hooks/useUI';
import { useNow } from '../../hooks/useNow';
import { MOODS, isoDay, lastDays, moodTrend, upsertMood, validateVitals, TREND_TEXT, moodLabel, simulateVitalsStep, SIM_RANGES, REFERENCE_RANGES, STATUS_TEXT, TREND_TOLERANCE, VITAL_RANGES, VITAL_TREND_TEXT, vitalStatus, vitalTrend, type VitalKey } from '../../services/wellbeing';
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
        <p>{note.text}</p>
        <small className="muted">
          Tu equipo de salud · {note.updatedAt > 0 ? timeAgo(note.updatedAt, Date.now()).toLowerCase() : 'sin fecha'} {note.demo && <DemoTag label="Ejemplo" />}
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

const VITAL_KEYS: VitalKey[] = ['heartRate', 'respRate', 'spo2', 'systolic', 'diastolic'];
/** Tiles on screen: blood pressure shows systolic/diastolic together in one tile. */
type Tile = 'heartRate' | 'respRate' | 'spo2' | 'presion';
const TILES: Tile[] = ['heartRate', 'respRate', 'spo2', 'presion'];
const HISTORY = 40; // readings kept for the mini charts (2 minutes at one every 3 s)
type History = Record<VitalKey, number[]>;

/**
 * Feed of the integrated monitor. In this demo it is simulated: every 3 s each value takes one small,
 * plausible step. Values typed by the care team (`demo: false`) are shown as they are and never move.
 */
function useMonitorFeed(v: Vitals | null): { shown: Vitals | null; history: History | null } {
  const [state, setState] = useState<{ shown: Vitals | null; history: History | null }>({ shown: v, history: null });
  useEffect(() => {
    if (!v?.demo) {
      setState({ shown: v, history: null });
      return;
    }
    // Warm up so the charts have the last couple of minutes from the start.
    let cur: Vitals = v;
    const history: History = { heartRate: [], respRate: [], spo2: [], systolic: [], diastolic: [] };
    for (let i = 0; i < HISTORY; i++) {
      cur = { ...cur, ...simulateVitalsStep(cur) };
      VITAL_KEYS.forEach((k) => history[k].push(cur[k]));
    }
    setState({ shown: cur, history });
    const id = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      setState((st) => {
        if (!st.shown || !st.history) return st;
        const next = { ...st.shown, ...simulateVitalsStep(st.shown) };
        const h = {} as History;
        VITAL_KEYS.forEach((k) => (h[k] = [...st.history![k], next[k]].slice(-HISTORY)));
        return { shown: next, history: h };
      });
    }, 3000);
    return () => window.clearInterval(id);
  }, [v]);
  return state;
}

/** Tiny line of the recent readings, drawn behind the value. */
function Spark({ values, min, max }: { values: number[]; min: number; max: number }) {
  if (values.length < 2) return null;
  const span = Math.max(1, max - min);
  const pts = values.map((x, i) => `${((i / (values.length - 1)) * 100).toFixed(1)},${(28 - ((x - min) / span) * 24).toFixed(1)}`).join(' ');
  return (
    <svg className="vital-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} />
    </svg>
  );
}

const TREND_ICON = { estable: '→', sube: '↗', baja: '↘' } as const;
const UNIT: Record<VitalKey, string> = { heartRate: 'lpm', respRate: 'rpm', spo2: '%', systolic: 'mmHg', diastolic: 'mmHg' };

export function VitalsCard() {
  const { data, update } = useAppData();
  const { toast } = useUI();
  const { guard } = useCaregiver();
  const [edit, setEdit] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const v = data.vitals;
  const { shown, history } = useMonitorFeed(v);
  const live = !!v?.demo;
  // Values not yet recorded (0, e.g. blood pressure in older saves) are not flagged.
  const outOfRange = shown ? VITAL_KEYS.filter((k) => !!shown[k] && vitalStatus(k, shown[k]) !== 'en-rango') : [];
  const [form, setForm] = useState({ heartRate: '', respRate: '', spo2: '', systolic: '', diastolic: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const at = v ? clock(new Date(v.recordedAt)) : null;

  const open = () => guard(() => {
    setForm({ heartRate: String(v?.heartRate ?? ''), respRate: String(v?.respRate ?? ''), spo2: String(v?.spo2 ?? ''), systolic: v?.systolic ? String(v.systolic) : '', diastolic: v?.diastolic ? String(v.diastolic) : '' });
    setErrors({});
    setEdit(true);
  });
  const save = () => {
    const vals = { heartRate: Number(form.heartRate), respRate: Number(form.respRate), spo2: Number(form.spo2), systolic: Number(form.systolic), diastolic: Number(form.diastolic) };
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
          <h2>Tu salud {live && <DemoTag label="Demo: datos simulados" />}</h2>
          <small className="muted vitals-meta">
            {live ? (
              <span className="monitor-live">
                <i aria-hidden="true" /> Monitor integrado · en vivo
              </span>
            ) : v ? (
              `Registrado por el personal ${timeAgo(v.recordedAt, Date.now()).toLowerCase()} · ${at!.time} ${at!.period}`
            ) : (
              'Aún no hay signos registrados'
            )}
            {shown && (
              <span className={`vitals-summary ${outOfRange.length ? 'is-out' : ''}`}>
                {outOfRange.length === 0 ? 'Todo en rango' : `Revisa: ${[...new Set(outOfRange.map((k) => VITAL_RANGES[k].label.toLowerCase()))].join(', ')}`}
              </span>
            )}
          </small>
        </span>
        <span
          className={`vitals-heart ${live ? 'is-live' : ''}`}
          style={shown ? ({ ['--beat' as string]: `${(60 / shown.heartRate).toFixed(2)}s` } as CSSProperties) : undefined}
          aria-hidden="true"
        >
          <HeartPulse strokeWidth={1.8} />
        </span>
      </button>
      {shown ? (
        <>
          <ul className="vitals">
            {TILES.map((t) => {
              const keys: VitalKey[] = t === 'presion' ? ['systolic', 'diastolic'] : [t];
              const k = keys[0];
              const statuses = keys.map((x) => vitalStatus(x, shown[x]));
              const status = statuses.find((x) => x !== 'en-rango') ?? 'en-rango';
              const trend = history ? vitalTrend(history[k], TREND_TOLERANCE[k]) : null;
              const r = SIM_RANGES[k];
              const missing = keys.some((x) => !shown[x]);
              return (
                <li key={t} className={`vital s-${missing ? 'en-rango' : status}`}>
                  {history && <Spark values={history[k]} min={Math.min(r.min, REFERENCE_RANGES[k].min)} max={r.max} />}
                  {t === 'heartRate' ? <Heart strokeWidth={1.6} /> : t === 'respRate' ? <Wind strokeWidth={1.6} /> : t === 'spo2' ? <span className="o2" aria-hidden="true">O<sub>2</sub></span> : <Gauge strokeWidth={1.6} />}
                  <span>
                    <small>{VITAL_RANGES[k].label}</small>
                    <strong className="num">
                      {missing ? '—' : t === 'presion' ? `${shown.systolic}/${shown.diastolic}` : shown[k]} <em>{UNIT[k]}</em>
                      {trend && !missing && (
                        <span className="vital-trend" title={VITAL_TREND_TEXT[trend]}>
                          <span aria-hidden="true">{TREND_ICON[trend]}</span>
                          <span className="sr-only">{VITAL_TREND_TEXT[trend]}</span>
                        </span>
                      )}
                    </strong>
                    {!missing && (
                      <span className="vital-state">
                        <i aria-hidden="true" /> <span className="vital-state-text">{STATUS_TEXT[status]}</span>
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          {outOfRange.length > 0 && <p className="vitals-note">Fuera del rango de referencia. Si te sientes mal, avisa a tu enfermera.</p>}
        </>
      ) : (
        <button className="btn btn-ghost" onClick={open}>Registrar signos</button>
      )}
      {edit && (
        <Sheet
          title="Registrar signos vitales"
          onClose={() => setEdit(false)}
          footer={<><button className="btn btn-ghost" onClick={() => setEdit(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Guardar</button></>}
        >
          <p className="muted">Para el personal de salud, cuando el monitor integrado no está disponible. Los valores escritos a mano se muestran tal cual y reemplazan la lectura del monitor; NEXO solo indica si están dentro del rango de referencia.</p>
          <div className="form-row three">
            <Field label="Ritmo cardíaco (lpm)" error={errors.heartRate}>{(id, by) => <input id={id} aria-describedby={by} inputMode="numeric" value={form.heartRate} onChange={(e) => setForm({ ...form, heartRate: e.target.value })} />}</Field>
            <Field label="Respiración (rpm)" error={errors.respRate}>{(id, by) => <input id={id} aria-describedby={by} inputMode="numeric" value={form.respRate} onChange={(e) => setForm({ ...form, respRate: e.target.value })} />}</Field>
            <Field label="Oxigenación (%)" error={errors.spo2}>{(id, by) => <input id={id} aria-describedby={by} inputMode="numeric" value={form.spo2} onChange={(e) => setForm({ ...form, spo2: e.target.value })} />}</Field>
          </div>
          <div className="form-row three">
            <Field label="Presión máxima (mmHg)" error={errors.systolic}>{(id, by) => <input id={id} aria-describedby={by} inputMode="numeric" value={form.systolic} onChange={(e) => setForm({ ...form, systolic: e.target.value })} />}</Field>
            <Field label="Presión mínima (mmHg)" error={errors.diastolic}>{(id, by) => <input id={id} aria-describedby={by} inputMode="numeric" value={form.diastolic} onChange={(e) => setForm({ ...form, diastolic: e.target.value })} />}</Field>
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
        <h2>
          Tu ánimo <span className="trend-chip" title={trend.body}>
            <Sprout size={16} strokeWidth={1.8} aria-hidden="true" /> {trend.title}
          </span>{' '}
          {shownDemo && <DemoTag label="Ejemplo" />}
        </h2>
        <p className="muted">Últimos 7 días{last?.value ? ` · último: ${moodLabel(last.value).toLowerCase()}` : ''}</p>
        <MoodChart points={days} />
      </div>
    </article>
  );
}
