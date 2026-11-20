import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Video, Type, Trash2 } from 'lucide-react';
import type { FamilyMessage, MessageKind } from '../../types';
import { Sheet } from '../../components/Sheet';
import { Video as NexoVideo } from '../../components/Media';
import { Field, Segmented } from '../../components/Form';
import { putMedia } from '../../services/mediaStore';
import { mmss } from '../../services/time';
import { uid } from '../../services/id';
import { audioEngine } from '../../services/audioEngine';

interface Props {
  contactId: string;
  contactName: string;
  onSave: (m: FamilyMessage) => void;
  onClose: () => void;
}

const MAX_SECONDS = 180;
const MAX_VIDEO_MB = 60;

/** Lets a family member leave a recorded voice note, a video or a written message on the device. */
export function MessageComposer({ contactId, contactName, onSave, onClose }: Props) {
  const [kind, setKind] = useState<MessageKind>('audio');
  const [text, setText] = useState('');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const canRecord = typeof window !== 'undefined' && 'MediaRecorder' in window && !!navigator.mediaDevices?.getUserMedia;

  useEffect(() => () => {
    window.clearInterval(timer.current);
    rec.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const reset = () => {
    setBlob(null);
    setPreview(null);
    setDuration(0);
    setError('');
  };

  const start = async () => {
    reset();
    audioEngine.stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (rec.current !== r) return; // discarded (type changed while recording)
        const b = new Blob(chunks, { type: r.mimeType || 'audio/mp4' });
        setBlob(b);
        setPreview(URL.createObjectURL(b));
      };
      rec.current = r;
      r.start();
      setRecording(true);
      const t0 = Date.now();
      timer.current = window.setInterval(() => {
        const s = Math.floor((Date.now() - t0) / 1000);
        setDuration(s);
        if (s >= MAX_SECONDS) stop();
      }, 250);
    } catch {
      setError('No se pudo usar el micrófono. Revisa el permiso del micrófono en Ajustes de Safari.');
    }
  };

  const stop = () => {
    window.clearInterval(timer.current);
    if (rec.current?.state === 'recording') rec.current.stop();
    setRecording(false);
  };

  const pickVideo = (f?: File) => {
    reset();
    if (!f) return;
    if (f.size > MAX_VIDEO_MB * 1024 * 1024) return setError(`El video es muy pesado (máximo ${MAX_VIDEO_MB} MB). Graba uno más corto.`);
    setBlob(f);
    setPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    setError('');
    if (kind === 'texto' && !text.trim()) return setError('Escribe el mensaje.');
    if (kind !== 'texto' && !blob) return setError(kind === 'audio' ? 'Primero graba el mensaje de voz.' : 'Primero elige o graba un video.');
    setSaving(true);
    try {
      const media = blob && kind !== 'texto' ? await putMedia(blob) : undefined;
      onSave({ id: uid('msg'), contactId, kind, text: text.trim(), media, duration: kind === 'audio' ? Math.max(1, duration) : undefined, createdAt: Date.now(), read: false, demo: false });
    } catch {
      setError('No hay espacio para guardar este archivo en el dispositivo.');
      setSaving(false);
    }
  };

  return (
    <Sheet
      title={`Mensaje de ${contactName}`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving || recording}>
            {saving ? 'Guardando…' : 'Guardar mensaje'}
          </button>
        </>
      }
    >
      <p className="muted">Deja un mensaje para que lo escuche o lo vea en NEXO.</p>
      <Segmented
        label="Tipo de mensaje"
        value={kind}
        onChange={(k) => {
          stop();
          rec.current = null;
          reset();
          setKind(k);
        }}
        options={[
          { value: 'audio', label: 'Voz' },
          { value: 'video', label: 'Video' },
          { value: 'texto', label: 'Escrito' },
        ]}
      />

      {kind === 'audio' && (
        <div className="composer-box">
          {!canRecord ? (
            <p className="field-error">Este navegador no permite grabar audio. Usa Safari actualizado en el iPad.</p>
          ) : recording ? (
            <button className="rec-btn is-recording" onClick={stop}>
              <Square fill="currentColor" strokeWidth={0} /> Detener · <span className="num">{mmss(duration)}</span>
            </button>
          ) : (
            <button className="rec-btn" onClick={start}>
              <Mic /> {blob ? 'Grabar de nuevo' : 'Grabar mensaje de voz'}
            </button>
          )}
          {preview && !recording && (
            <div className="composer-preview">
              <audio src={preview} controls />
              <button className="icon-btn" onClick={reset} aria-label="Descartar grabación">
                <Trash2 />
              </button>
            </div>
          )}
          <small className="muted">Máximo {MAX_SECONDS / 60} minutos.</small>
        </div>
      )}

      {kind === 'video' && (
        <div className="composer-box">
          <label className="rec-btn">
            <Video /> {blob ? 'Elegir otro video' : 'Grabar o elegir un video'}
            <input type="file" accept="video/*" capture="user" className="sr-only" onChange={(e) => pickVideo(e.target.files?.[0])} />
          </label>
          {preview && <NexoVideo className="composer-video" src={preview} controls playsInline />}
        </div>
      )}

      <Field label={kind === 'texto' ? 'Mensaje' : 'Texto que acompaña (opcional)'}>
        {(id) => (
          <div className="textarea-wrap">
            {kind === 'texto' && <Type className="textarea-icon" size={20} />}
            <textarea id={id} rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder={kind === 'texto' ? 'NEXO lo leerá en voz alta si se lo piden.' : ''} />
          </div>
        )}
      </Field>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </Sheet>
  );
}
