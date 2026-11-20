import { useState } from 'react';
import type { Procedure, ProcedureStatus, Treatment } from '../../types';
import { Sheet } from '../../components/Sheet';
import { Field } from '../../components/Form';
import { STATUS_LABEL, splitTimes, validateProcedure, validateTreatment, type FieldErrors } from '../../services/care';

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function FormSheet({ title, onClose, onSave, children }: { title: string; onClose: () => void; onSave: () => void; children: React.ReactNode }) {
  return (
    <Sheet
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={onSave}>
            Guardar
          </button>
        </>
      }
    >
      <div className="form-grid">{children}</div>
    </Sheet>
  );
}

export function TreatmentForm({ initial, onSave, onClose }: { initial?: Treatment; onSave: (t: Omit<Treatment, 'id'>) => void; onClose: () => void }) {
  const [v, setV] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    startDate: initial?.startDate ?? todayISO(),
    frequency: initial?.frequency ?? '',
    times: initial?.times.join(', ') ?? '',
    observations: initial?.observations ?? '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });

  const save = () => {
    const t = { ...v, name: v.name.trim(), description: v.description.trim(), frequency: v.frequency.trim(), observations: v.observations.trim(), times: splitTimes(v.times) };
    const e = validateTreatment(t);
    setErrors(e);
    if (!Object.keys(e).length) onSave(t);
  };

  return (
    <FormSheet title={initial ? 'Editar tratamiento' : 'Registrar tratamiento'} onClose={onClose} onSave={save}>
      <Field label="Nombre" error={errors.name}>
        {(id, by) => <input id={id} aria-describedby={by} value={v.name} onChange={set('name')} maxLength={60} />}
      </Field>
      <Field label="Descripción" hint="En palabras sencillas: para qué sirve.">
        {(id, by) => <textarea id={id} aria-describedby={by} rows={2} value={v.description} onChange={set('description')} maxLength={200} />}
      </Field>
      <div className="form-row">
        <Field label="Fecha de inicio" error={errors.startDate}>
          {(id, by) => <input id={id} aria-describedby={by} type="date" value={v.startDate} onChange={set('startDate')} />}
        </Field>
        <Field label="Frecuencia" error={errors.frequency}>
          {(id, by) => <input id={id} aria-describedby={by} value={v.frequency} onChange={set('frequency')} placeholder="Ej.: cada 8 horas" maxLength={40} />}
        </Field>
      </div>
      <Field label="Horas para recordar (opcional)" error={errors.times} hint="Separadas por comas, por ejemplo 08:00, 20:00.">
        {(id, by) => <input id={id} aria-describedby={by} value={v.times} onChange={set('times')} inputMode="numeric" />}
      </Field>
      <Field label="Observaciones">
        {(id) => <textarea id={id} rows={2} value={v.observations} onChange={set('observations')} maxLength={240} />}
      </Field>
    </FormSheet>
  );
}

const STATUSES = Object.keys(STATUS_LABEL) as ProcedureStatus[];

export function ProcedureForm({ initial, onSave, onClose }: { initial?: Procedure; onSave: (p: Omit<Procedure, 'id'>) => void; onClose: () => void }) {
  const [v, setV] = useState({
    name: initial?.name ?? '',
    date: initial?.date ?? `${todayISO()}T09:00`,
    description: initial?.description ?? '',
    status: initial?.status ?? ('programado' as ProcedureStatus),
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });

  const save = () => {
    const p = { ...v, name: v.name.trim(), description: v.description.trim() };
    const e = validateProcedure(p);
    setErrors(e);
    if (!Object.keys(e).length) onSave(p);
  };

  return (
    <FormSheet title={initial ? 'Editar procedimiento' : 'Agregar procedimiento'} onClose={onClose} onSave={save}>
      <Field label="Nombre" error={errors.name}>
        {(id, by) => <input id={id} aria-describedby={by} value={v.name} onChange={set('name')} maxLength={60} />}
      </Field>
      <div className="form-row">
        <Field label="Fecha y hora" error={errors.date}>
          {(id, by) => <input id={id} aria-describedby={by} type="datetime-local" value={v.date} onChange={set('date')} />}
        </Field>
        <Field label="Estado">
          {(id) => (
            <select id={id} value={v.status} onChange={set('status')}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <Field label="Descripción" hint="Qué es y qué esperar.">
        {(id, by) => <textarea id={id} aria-describedby={by} rows={3} value={v.description} onChange={set('description')} maxLength={240} />}
      </Field>
    </FormSheet>
  );
}
