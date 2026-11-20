import { useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarClock, Heart, Pencil, Pill, Plus, Lightbulb, Trash2, Volume2, Info, Clock } from 'lucide-react';
import type { Procedure, Recommendation, RecommendationCategory, Treatment } from '../types';
import { useAppData } from '../hooks/useAppData';
import { useUI } from '../hooks/useUI';
import { useNow } from '../hooks/useNow';
import { useCaregiver } from '../hooks/useCaregiver';
import { DemoTag } from '../components/Media';
import { STATUS_LABEL, nextDose, orderProcedures } from '../services/care';
import { hmToLabel, relativeDay } from '../services/time';
import { uid } from '../services/id';
import { audioEngine } from '../services/audioEngine';
import { Confirm, Sheet } from '../components/Sheet';
import { Segmented } from '../components/Form';
import { TreatmentForm, ProcedureForm } from './care/CareForms';
import { CareNoteCard, MoodHistoryCard, MoodCard, VitalsCard } from './care/Wellbeing';

const DISCLAIMER = 'Información de consulta. NEXO no diagnostica ni cambia tratamientos: sigue siempre las indicaciones de tu equipo de salud.';

const longDay = (iso: string) => {
  const d = new Date(`${iso}T12:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
};
const whenLabel = (p: Procedure, now: Date) => {
  const d = new Date(p.date);
  return `${relativeDay(d, now)} · ${hmToLabel(p.date.slice(11, 16))}`;
};

function Treatments() {
  const { data, update } = useAppData();
  const { toast } = useUI();
  const { guard } = useCaregiver();
  const now = useNow();
  const [form, setForm] = useState<Treatment | 'new' | null>(null);
  const [del, setDel] = useState<Treatment | null>(null);
  const next = nextDose(data.treatments, now);

  return (
    <>
      <div className="sub-actions">
        {next && (
          <p className="next-dose">
            <Clock size={20} /> Próxima toma: <strong>{next.treatments.map((t) => t.name).join(' y ')}</strong> {next.tomorrow ? 'mañana' : 'hoy'} a las {hmToLabel(next.time)}
          </p>
        )}
        <button className="pill-btn" onClick={() => guard(() => setForm('new'))}>
          <Plus size={20} /> Registrar
        </button>
      </div>
      {data.treatments.length === 0 ? (
        <div className="empty">
          <Pill size={40} strokeWidth={1.5} />
          <p>No hay tratamientos registrados.</p>
        </div>
      ) : (
        <ul className="care-cards">
          {data.treatments.map((t) => (
            <li key={t.id} className={`care-card ${next?.treatments.includes(t) ? 'is-next' : ''}`}>
              <header>
                <span className="care-card-icon"><Pill strokeWidth={1.6} /></span>
                <div>
                  <h3>{t.name} {t.demo && <DemoTag label="Ejemplo" />}</h3>
                  <p className="muted">{t.description}</p>
                </div>
              </header>
              <dl className="care-facts">
                <div><dt>Desde</dt><dd>{longDay(t.startDate)}</dd></div>
                <div><dt>Frecuencia</dt><dd>{t.frequency}</dd></div>
                {t.times.length > 0 && <div><dt>Horario</dt><dd className="num">{t.times.map(hmToLabel).join(' · ')}</dd></div>}
              </dl>
              {t.observations && <p className="care-note"><Info size={18} /> {t.observations}</p>}
              <div className="care-card-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => guard(() => setForm(t))} aria-label={`Editar ${t.name}`}><Pencil size={18} /> Editar</button>
                <button className="btn btn-ghost btn-sm btn-danger-text" onClick={() => guard(() => setDel(t))} aria-label={`Eliminar ${t.name}`}><Trash2 size={18} /> Eliminar</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {form && (
        <TreatmentForm
          initial={form === 'new' ? undefined : form}
          onClose={() => setForm(null)}
          onSave={(t) => {
            update((d) => ({ ...d, treatments: form === 'new' ? [...d.treatments, { ...t, id: uid('t') }] : d.treatments.map((x) => (x.id === form.id ? { ...t, id: x.id } : x)) }));
            toast(form === 'new' ? 'Tratamiento registrado' : 'Cambios guardados', 'ok');
            setForm(null);
          }}
        />
      )}
      {del && (
        <Confirm title={`¿Eliminar “${del.name}”?`} message="Se borrará este registro del dispositivo. No cambia lo que indique tu equipo de salud." confirmLabel="Eliminar" danger onCancel={() => setDel(null)}
          onConfirm={() => { update((d) => ({ ...d, treatments: d.treatments.filter((x) => x.id !== del.id) })); toast('Tratamiento eliminado', 'ok'); setDel(null); }} />
      )}
    </>
  );
}

function Procedures() {
  const { data, update } = useAppData();
  const { toast } = useUI();
  const { guard } = useCaregiver();
  const now = useNow();
  const [form, setForm] = useState<Procedure | 'new' | null>(null);
  const [del, setDel] = useState<Procedure | null>(null);
  const { pending, past } = orderProcedures(data.procedures);

  const card = (p: Procedure) => (
    <li key={p.id} className={`care-card proc s-${p.status}`}>
      <header>
        <span className="care-card-icon"><CalendarClock strokeWidth={1.6} /></span>
        <div>
          <h3>{p.name} {p.demo && <DemoTag label="Ejemplo" />}</h3>
          <p className="proc-when num">{whenLabel(p, now)}</p>
        </div>
        <span className={`status status-${p.status}`}>{STATUS_LABEL[p.status]}</span>
      </header>
      {p.description && <p className="muted">{p.description}</p>}
      <div className="care-card-actions">
        <button className="btn btn-ghost btn-sm" onClick={() => guard(() => setForm(p))} aria-label={`Editar ${p.name}`}><Pencil size={18} /> Editar</button>
        <button className="btn btn-ghost btn-sm btn-danger-text" onClick={() => guard(() => setDel(p))} aria-label={`Eliminar ${p.name}`}><Trash2 size={18} /> Eliminar</button>
      </div>
    </li>
  );

  return (
    <>
      <div className="sub-actions">
        <p className="muted">{pending.length ? `${pending.length} programados` : 'No hay procedimientos pendientes.'}</p>
        <button className="pill-btn" onClick={() => guard(() => setForm('new'))}>
          <Plus size={20} /> Agregar
        </button>
      </div>
      <ul className="care-cards">{pending.map(card)}</ul>
      {past.length > 0 && (
        <>
          <h2 className="list-title">Realizados o cancelados</h2>
          <ul className="care-cards is-past">{past.map(card)}</ul>
        </>
      )}
      {form && (
        <ProcedureForm
          initial={form === 'new' ? undefined : form}
          onClose={() => setForm(null)}
          onSave={(p) => {
            update((d) => ({ ...d, procedures: form === 'new' ? [...d.procedures, { ...p, id: uid('pr') }] : d.procedures.map((x) => (x.id === form.id ? { ...p, id: x.id } : x)) }));
            toast(form === 'new' ? 'Procedimiento agregado' : 'Cambios guardados', 'ok');
            setForm(null);
          }}
        />
      )}
      {del && (
        <Confirm title={`¿Eliminar “${del.name}”?`} message="Se borrará este registro del dispositivo." confirmLabel="Eliminar" danger onCancel={() => setDel(null)}
          onConfirm={() => { update((d) => ({ ...d, procedures: d.procedures.filter((x) => x.id !== del.id) })); toast('Procedimiento eliminado', 'ok'); setDel(null); }} />
      )}
    </>
  );
}

const CATS: ('Todas' | RecommendationCategory)[] = ['Todas', 'Emociones', 'Descanso', 'Alimentación', 'Movimiento', 'Visitas'];

function Recommendations() {
  const { data } = useAppData();
  const [cat, setCat] = useState<(typeof CATS)[number]>('Todas');
  const [open, setOpen] = useState<Recommendation | null>(null);
  const list = data.recommendations.filter((r) => cat === 'Todas' || r.category === cat);
  return (
    <>
      <Segmented label="Categoría" value={cat} onChange={setCat} options={CATS.map((c) => ({ value: c, label: c }))} />
      <ul className="reco-grid">
        {list.map((r) => (
          <li key={r.id}>
            <button className="reco" onClick={() => setOpen(r)}>
              <span className="reco-cat">{r.category}{r.demo && ' · Ejemplo'}</span>
              <strong>{r.title}</strong>
              <small>{r.summary}</small>
              <ArrowRight className="reco-arrow" />
            </button>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="muted center">No hay recomendaciones en esta categoría.</p>}
      {open && (
        <Sheet title={open.title} onClose={() => { audioEngine.stop(); setOpen(null); }}>
          <div className="info-sheet left">
            <span className="reco-cat">{open.category}</span>
            <p className="lead">{open.body}</p>
            <button className="btn btn-ghost" onClick={() => audioEngine.playSpeech({ id: open.id, title: open.title, subtitle: 'Recomendación', text: `${open.title}. ${open.body}` })}>
              <Volume2 size={20} /> Escuchar
            </button>
            <p className="fine-print">{DISCLAIMER}</p>
          </div>
        </Sheet>
      )}
    </>
  );
}

const VIEWS = {
  tratamiento: { title: 'Mi tratamiento', Icon: Pill, View: Treatments },
  procedimientos: { title: 'Próximos procedimientos', Icon: CalendarClock, View: Procedures },
  recomendaciones: { title: 'Recomendaciones', Icon: Lightbulb, View: Recommendations },
} as const;
type ViewId = keyof typeof VIEWS;

export function CarePage() {
  const { data } = useAppData();
  const { sub, go } = useUI();
  const now = useNow();

  if (sub && sub in VIEWS) {
    const { title, View } = VIEWS[sub as ViewId];
    return (
      <div className="page subpage">
        <header className="sub-head">
          <button className="pill-btn" onClick={() => go('cuidado')}>
            <ArrowLeft size={20} /> Mi cuidado
          </button>
          <h1>{title}</h1>
        </header>
        <div className="sub-body scroll">
          <View />
          <p className="fine-print">{DISCLAIMER}</p>
        </div>
      </div>
    );
  }

  const next = nextDose(data.treatments, now);
  const proc = orderProcedures(data.procedures).pending[0];
  const demoShown: Record<ViewId, boolean> = {
    tratamiento: next ? next.treatments.some((t) => t.demo) : data.treatments.some((t) => t.demo),
    procedimientos: proc ? proc.demo : false,
    recomendaciones: data.recommendations.some((r) => r.demo),
  };
  const status: Record<ViewId, string> = {
    tratamiento: next ? `${next.treatments.map((t) => t.name).join(' y ')} · ${hmToLabel(next.time)}` : `${data.treatments.length} registrados`,
    procedimientos: proc ? `${proc.name} · ${whenLabel(proc, now).toLowerCase()}` : 'Sin pendientes',
    recomendaciones: `${data.recommendations.length} consejos`,
  };

  return (
    <div className="page care">
      <header className="section-head care-head">
        <Heart className="section-icon" strokeWidth={1.4} />
        <div>
          <h1>Mi cuidado</h1>
          <p className="section-sub accent">Conoce cómo te sientes, cuida tu bienestar y sigue tu avance.</p>
          <p className="care-head-note">Solo informativo: no reemplaza las indicaciones de tu equipo de salud.</p>
        </div>
      </header>
      <CareNoteCard />
      <MoodCard />
      <VitalsCard />
      <article className="plan-card glass">
        <h2>
          <Pill strokeWidth={1.5} /> Tu plan de cuidado
        </h2>
        <ul className="plan-list">
          {(Object.keys(VIEWS) as ViewId[]).map((id) => {
            const { title, Icon } = VIEWS[id];
            return (
              <li key={id}>
                <button className="plan-row" onClick={() => go('cuidado', id)}>
                  <Icon strokeWidth={1.6} />
                  <span className="plan-row-text">
                    <strong>{title} {demoShown[id] && <DemoTag label="Ejemplo" />}</strong>
                    <small>{status[id]}</small>
                  </span>
                  <ArrowRight className="plan-arrow" />
                </button>
              </li>
            );
          })}
        </ul>
      </article>
      <MoodHistoryCard />
    </div>
  );
}
