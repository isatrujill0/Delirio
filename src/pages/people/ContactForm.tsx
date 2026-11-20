import { useState } from 'react';
import { Camera } from 'lucide-react';
import type { Contact } from '../../types';
import { Sheet } from '../../components/Sheet';
import { Field } from '../../components/Form';
import { Avatar } from '../../components/Media';
import { putMedia, shrinkImage, deleteMedia } from '../../services/mediaStore';

export interface ContactDraft {
  name: string;
  relation: string;
  phone: string;
  about: string;
  photo?: string;
}

export function validateContact(d: ContactDraft): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.name.trim()) e.name = 'Escribe cómo se llama.';
  else if (d.name.trim().length > 30) e.name = 'Usa un nombre corto (máximo 30 letras).';
  if (d.phone.trim() && !/^[+\d][\d\s-]{6,}$/.test(d.phone.trim())) e.phone = 'Escribe solo números, por ejemplo 300 123 4567.';
  return e;
}

interface Props {
  initial?: Contact;
  onSave: (d: ContactDraft) => void;
  onClose: () => void;
}

export function ContactForm({ initial, onSave, onClose }: Props) {
  const [d, setD] = useState<ContactDraft>({ name: initial?.name ?? '', relation: initial?.relation ?? '', phone: initial?.phone ?? '', about: initial?.about ?? '', photo: initial?.photo });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const set = (k: keyof ContactDraft) => (e: { target: { value: string } }) => setD({ ...d, [k]: e.target.value });

  const pickPhoto = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      if (newPhoto) await deleteMedia(newPhoto);
      const ref = await putMedia(await shrinkImage(file, 640));
      setNewPhoto(ref);
      setD((x) => ({ ...x, photo: ref }));
    } catch {
      setErrors((x) => ({ ...x, photo: 'No se pudo cargar la foto. Prueba con otra imagen.' }));
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    const e = validateContact(d);
    setErrors(e);
    if (Object.keys(e).length) return;
    onSave({ ...d, name: d.name.trim(), relation: d.relation.trim(), phone: d.phone.trim(), about: d.about.trim() });
  };

  const cancel = () => {
    if (newPhoto) void deleteMedia(newPhoto);
    onClose();
  };

  return (
    <Sheet
      title={initial ? `Editar a ${initial.name}` : 'Agregar a alguien'}
      onClose={cancel}
      footer={
        <>
          <button className="btn btn-ghost" onClick={cancel}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Cargando foto…' : 'Guardar'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="photo-pick">
          <Avatar contact={{ name: d.name || '?', photo: d.photo }} className="avatar-lg" />
          <label className="btn btn-ghost">
            <Camera size={20} /> {d.photo ? 'Cambiar foto' : 'Agregar foto'}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickPhoto(e.target.files?.[0])} />
          </label>
          {errors.photo && <p className="field-error">{errors.photo}</p>}
        </div>
        <Field label="Nombre" error={errors.name}>
          {(id, by) => <input id={id} aria-describedby={by} value={d.name} onChange={set('name')} placeholder="Ej.: Mamá" maxLength={40} />}
        </Field>
        <Field label="Quién es" hint="Ej.: tu hermana, tu vecino">
          {(id, by) => <input id={id} aria-describedby={by} value={d.relation} onChange={set('relation')} maxLength={50} />}
        </Field>
        <Field label="Teléfono" error={errors.phone}>
          {(id, by) => <input id={id} aria-describedby={by} value={d.phone} onChange={set('phone')} inputMode="tel" maxLength={20} />}
        </Field>
        <Field label="Algo sobre esta persona">
          {(id) => <textarea id={id} rows={3} value={d.about} onChange={set('about')} maxLength={240} />}
        </Field>
      </div>
    </Sheet>
  );
}
