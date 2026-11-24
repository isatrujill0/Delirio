import { useEffect, useRef, useState } from 'react';
import { Camera, Mic, Play, SendHorizontal, Smile, Square, X } from 'lucide-react';
import type { Contact, FamilyMessage, MessageFrom, MessageKind } from '../../types';
import { useAppData } from '../../hooks/useAppData';
import { useUI } from '../../hooks/useUI';
import { canRecordAudio, useRecorder } from '../../hooks/useRecorder';
import { MediaImage, DemoTag } from '../../components/Media';
import { PlayButton, Waveform } from '../../components/PlayerControls';
import { messageDuration, useMessageControl } from '../../components/MessageViewer';
import { Segmented } from '../../components/Form';
import { putMedia, shrinkImage } from '../../services/mediaStore';
import { clock, mmss, relativeDay } from '../../services/time';
import { uid } from '../../services/id';

const EMOJIS = ['😀', '😂', '🥰', '😍', '😘', '🤗', '😊', '🥹', '😢', '😴', '🙏', '👍', '👏', '💪', '🙌', '❤️', '💜', '💙', '💛', '🌸', '🌻', '☀️', '🌈', '⭐', '🎉', '🎂', '🐶', '☕', '🍓', '🏥', '😷', '🤒'];

const stamp = (ts: number) => {
  const d = new Date(ts);
  const { time, period } = clock(d);
  const day = relativeDay(d, new Date());
  return `${day === 'Hoy' ? '' : `${day} · `}${time} ${period}`;
};

/** One chat bubble. Tapping it opens the message (bigger view, read aloud, delete). */
function Bubble({ m, contact, onOpen }: { m: FamilyMessage; contact: Contact; onOpen: () => void }) {
  const { toast } = useUI();
  const mine = m.from === 'paciente';
  const { player, isThis, playing, toggle } = useMessageControl(m, mine ? 'ti' : contact.name, (e) => toast(e, 'error'));
  const meta = (
    <span className="bubble-meta num">
      {m.demo && <DemoTag label="Ejemplo" />} {stamp(m.createdAt)}
    </span>
  );
  return (
    <li className={`bubble-row ${mine ? 'is-mine' : ''}`}>
      {m.kind === 'audio' ? (
        <div className="bubble bubble-audio">
          <PlayButton playing={playing} loading={isThis && player.status === 'loading'} onClick={toggle} label={`audio de ${mine ? 'ti' : contact.name}, ${stamp(m.createdAt)}`} />
          <button className="bubble-body" onClick={onOpen}>
            <Waveform active={playing} bars={16} />
            <span className="num bubble-dur">{isThis && player.status !== 'idle' ? mmss(player.position) : mmss(messageDuration(m))}</span>
            {!m.media && <small className="bubble-note">Leído por NEXO</small>}
            {meta}
          </button>
        </div>
      ) : (
        <button className={`bubble bubble-${m.kind}`} onClick={onOpen}>
          {m.kind === 'imagen' && <MediaImage src={m.media} alt={m.text || 'Foto'} className="bubble-photo" />}
          {m.kind === 'video' && (
            <span className="bubble-video">
              <Play size={22} fill="currentColor" /> Ver video
            </span>
          )}
          {m.text && <span className="bubble-text">{m.text}</span>}
          {meta}
        </button>
      )}
    </li>
  );
}

/**
 * WhatsApp-style conversation with one person. Both sides can write on this device: choose who is
 * writing (the patient or the family member during a visit), then send text, emojis, photos or a voice note.
 */
export function Chat({ contact, onOpen }: { contact: Contact; onOpen: (m: FamilyMessage) => void }) {
  const { data, update } = useAppData();
  const { toast } = useUI();
  const [who, setWho] = useState<MessageFrom>('paciente');
  const [text, setText] = useState('');
  const [emojis, setEmojis] = useState(false);
  const [busy, setBusy] = useState(false);
  const rec = useRecorder();
  const list = useRef<HTMLOListElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const msgs = data.messages.filter((m) => m.contactId === contact.id).sort((a, b) => a.createdAt - b.createdAt);
  const patient = data.userName || 'Tú';

  // Opening the chat means the family's messages have been seen.
  useEffect(() => {
    if (msgs.some((m) => !m.read && m.from !== 'paciente'))
      update((d) => ({ ...d, messages: d.messages.map((m) => (m.contactId === contact.id && m.from !== 'paciente' ? { ...m, read: true } : m)) }));
  }, [contact.id, msgs, update]);

  // Keep the newest message in view by scrolling the list itself (never the whole screen), also when
  // photos finish loading later, unless the person has scrolled up to read older messages.
  const pinned = useRef(true);
  const toBottom = () => {
    if (list.current && pinned.current) list.current.scrollTop = list.current.scrollHeight;
  };
  useEffect(() => {
    pinned.current = true;
    toBottom();
  }, [msgs.length]);

  const send = (kind: MessageKind, extra: Partial<FamilyMessage> = {}) => {
    const m: FamilyMessage = { id: uid('msg'), contactId: contact.id, kind, from: who, text: '', createdAt: Date.now(), read: true, demo: false, ...extra };
    update((d) => ({ ...d, messages: [...d.messages, m] }));
  };

  const sendText = () => {
    const t = text.trim();
    if (!t) return;
    send('texto', { text: t });
    setText('');
    setEmojis(false);
  };

  const sendPhoto = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const media = await putMedia(await shrinkImage(file));
      send('imagen', { media, text: text.trim() });
      setText('');
    } catch {
      toast('No se pudo enviar la foto. Puede que no haya espacio en el dispositivo.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const finishVoice = async () => {
    const r = await rec.stop();
    if (!r) return;
    try {
      send('audio', { media: await putMedia(r.blob), duration: r.seconds });
    } catch {
      toast('No hay espacio para guardar el audio en el dispositivo.', 'error');
    }
  };

  const addEmoji = (e: string) => {
    setText((t) => t + e);
    input.current?.focus({ preventScroll: true });
  };

  return (
    <div className="chat">
      <ol
        ref={list}
        className="chat-list"
        aria-label={`Conversación con ${contact.name}`}
        onLoadCapture={toBottom}
        onScroll={(e) => {
          const el = e.currentTarget;
          pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
      >
        {msgs.length === 0 && <li className="chat-empty muted">Todavía no hay mensajes. Escribe el primero.</li>}
        {msgs.map((m) => (
          <Bubble key={m.id} m={m} contact={contact} onOpen={() => onOpen(m)} />
        ))}
      </ol>

      <div className="chat-compose">
        <Segmented<MessageFrom>
          label="¿Quién escribe?"
          value={who}
          onChange={setWho}
          options={[
            { value: 'paciente', label: `Escribe ${patient}` },
            { value: 'contacto', label: `Escribe ${contact.name}` },
          ]}
        />
        {emojis && (
          <div className="emoji-grid" role="group" aria-label="Emojis">
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => addEmoji(e)} aria-label={`Agregar ${e}`}>
                {e}
              </button>
            ))}
          </div>
        )}
        {rec.recording ? (
          <div className="chat-bar is-recording" role="status">
            <span className="rec-dot" aria-hidden="true" />
            <span className="num">Grabando {mmss(rec.seconds)}</span>
            <button className="btn btn-ghost" onClick={rec.cancel}>
              <X size={20} /> Cancelar
            </button>
            <button className="btn btn-primary" onClick={finishVoice}>
              <Square size={18} fill="currentColor" /> Enviar audio
            </button>
          </div>
        ) : (
          <div className="chat-bar">
            <button className={`icon-btn icon-btn-soft ${emojis ? 'on' : ''}`} onClick={() => setEmojis((v) => !v)} aria-label="Emojis" aria-pressed={emojis}>
              <Smile />
            </button>
            <label className={`icon-btn icon-btn-soft ${busy ? 'is-busy' : ''}`} aria-label="Enviar una foto">
              <Camera />
              <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(e) => { void sendPhoto(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            <textarea
              ref={input}
              className="chat-input"
              rows={1}
              value={text}
              placeholder={`Mensaje de ${who === 'paciente' ? patient : contact.name}`}
              aria-label="Escribe un mensaje"
              maxLength={1000}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendText();
                }
              }}
            />
            {text.trim() ? (
              <button className="play-btn play-md" onClick={sendText} aria-label="Enviar mensaje">
                <SendHorizontal />
              </button>
            ) : (
              <button className="play-btn play-md" onClick={rec.start} disabled={!canRecordAudio()} aria-label="Grabar un audio">
                <Mic />
              </button>
            )}
          </div>
        )}
        {rec.error && <p className="field-error" role="alert">{rec.error}</p>}
      </div>
    </div>
  );
}
