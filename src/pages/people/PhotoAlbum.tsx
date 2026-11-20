import { useState } from 'react';
import { ChevronLeft, ChevronRight, ImagePlus, Trash2 } from 'lucide-react';
import type { Photo } from '../../types';
import { MediaImage, DemoTag } from '../../components/Media';
import { Sheet, Confirm } from '../../components/Sheet';
import { useAppData } from '../../hooks/useAppData';
import { useUI } from '../../hooks/useUI';
import { putMedia, shrinkImage, deleteMedia } from '../../services/mediaStore';
import { uid } from '../../services/id';

/** Photo grid with a full-screen viewer; family can add photos from the camera or the library. */
export function PhotoAlbum({ contactId }: { contactId?: string }) {
  const { data, update } = useAppData();
  const { toast } = useUI();
  const photos = contactId ? data.photos.filter((p) => p.contactId === contactId) : data.photos;
  const [index, setIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<Photo | null>(null);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const added: Photo[] = [];
      for (const f of Array.from(files).slice(0, 10)) {
        const src = await putMedia(await shrinkImage(f));
        added.push({ id: uid('p'), src, caption: '', contactId, demo: false });
      }
      update((d) => ({ ...d, photos: [...added, ...d.photos] }));
      toast(added.length === 1 ? 'Foto agregada' : `${added.length} fotos agregadas`, 'ok');
    } catch {
      toast('No se pudo agregar la foto. Puede que no haya espacio.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: Photo) => {
    update((d) => ({ ...d, photos: d.photos.filter((x) => x.id !== p.id) }));
    await deleteMedia(p.src);
    setConfirm(null);
    setIndex(null);
    toast('Foto eliminada', 'ok');
  };

  const current = index !== null ? photos[index] : null;

  return (
    <div className="album">
      <ul className="album-grid">
        <li>
          <label className={`album-add ${busy ? 'is-busy' : ''}`}>
            <ImagePlus size={34} strokeWidth={1.5} />
            <span>{busy ? 'Guardando…' : 'Agregar fotos'}</span>
            <input type="file" accept="image/*" multiple className="sr-only" disabled={busy} onChange={(e) => add(e.target.files)} />
          </label>
        </li>
        {photos.map((p, i) => (
          <li key={p.id}>
            <button className="album-item" onClick={() => setIndex(i)} aria-label={p.caption || `Foto ${i + 1}`}>
              <MediaImage src={p.src} alt={p.caption || `Foto ${i + 1}`} />
            </button>
          </li>
        ))}
      </ul>
      {photos.length === 0 && <p className="muted center">Todavía no hay fotos. Agrega la primera.</p>}

      {current && index !== null && (
        <Sheet title={current.caption || 'Foto'} onClose={() => setIndex(null)} size="full" bare>
          <div className="viewer">
            <MediaImage src={current.src} alt={current.caption || 'Foto'} className="viewer-img" />
            <div className="viewer-bar">
              <button className="round-btn" onClick={() => setIndex((index - 1 + photos.length) % photos.length)} aria-label="Foto anterior">
                <ChevronLeft />
              </button>
              <p>
                {current.caption || 'Foto'} <span className="muted num">· {index + 1} de {photos.length}</span> {current.demo && <DemoTag />}
              </p>
              <button className="round-btn" onClick={() => setIndex((index + 1) % photos.length)} aria-label="Foto siguiente">
                <ChevronRight />
              </button>
              <button className="icon-btn" onClick={() => setConfirm(current)} aria-label="Eliminar foto">
                <Trash2 />
              </button>
            </div>
          </div>
        </Sheet>
      )}
      {confirm && <Confirm title="¿Eliminar esta foto?" message="La foto se borrará de este dispositivo." confirmLabel="Eliminar" danger onConfirm={() => remove(confirm)} onCancel={() => setConfirm(null)} />}
    </div>
  );
}
