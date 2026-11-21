import { useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import type { Contact, FamilyMessage } from '../types';
import { Sheet } from './Sheet';
import { Avatar, DemoTag, MediaImage, Video } from './Media';
import { PlayButton, Progress, StopButton, Waveform } from './PlayerControls';
import { useMediaUrl } from '../hooks/useMediaUrl';
import { usePlayer, audioEngine } from '../hooks/usePlayer';
import { useAppData } from '../hooks/useAppData';
import { resolveMedia } from '../services/mediaStore';
import { speechSeconds, timeAgo } from '../services/time';

export const messageDuration = (m: FamilyMessage) => m.duration ?? speechSeconds(m.text);

export function kindLabel(m: FamilyMessage): string {
  if (m.kind === 'video') return 'Video';
  if (m.kind === 'imagen') return 'Foto';
  if (m.kind === 'audio') return m.media ? 'Mensaje de voz' : 'Mensaje leído por NEXO';
  return 'Mensaje escrito';
}

/** Plays an audio/text message through the shared player. Video plays in its own element. */
export async function playMessage(m: FamilyMessage, from: string): Promise<void> {
  const subtitle = `De ${from}`;
  if (m.kind === 'audio' && m.media) {
    const url = await resolveMedia(m.media);
    if (!url) throw new Error('missing');
    audioEngine.playMedia({ id: m.id, title: 'Mensaje de voz', subtitle, src: url }, url.startsWith('blob:'));
  } else {
    audioEngine.playSpeech({ id: m.id, title: m.kind === 'audio' ? 'Mensaje leído por NEXO' : 'Mensaje escrito', subtitle, text: m.text });
  }
}

/** Play/pause control bound to one message. */
export function useMessageControl(m: FamilyMessage | undefined, from: string, onError: (msg: string) => void) {
  const player = usePlayer();
  const { update } = useAppData();
  const isThis = !!m && player.id === m.id;
  const playing = isThis && (player.status === 'playing' || player.status === 'loading');
  const toggle = () => {
    if (!m) return;
    if (isThis && player.status !== 'idle') return audioEngine.toggle();
    playMessage(m, from).catch(() => onError('No se encontró el audio de este mensaje.'));
    if (!m.read) update((d) => ({ ...d, messages: d.messages.map((x) => (x.id === m.id ? { ...x, read: true } : x)) }));
  };
  return { player, isThis, playing, toggle };
}

interface Props {
  message: FamilyMessage;
  contact?: Contact;
  onClose: () => void;
  onDelete?: () => void;
  onError: (msg: string) => void;
}

export function MessageViewer({ message: m, contact, onClose, onDelete, onError }: Props) {
  const { data } = useAppData();
  const mine = m.from === 'paciente';
  const from = mine ? data.userName || 'Tú' : contact?.name ?? 'Tu familia';
  const { update } = useAppData();
  const { player, isThis, playing, toggle } = useMessageControl(m, from, onError);
  const video = useMediaUrl(m.kind === 'video' ? m.media : undefined);

  useEffect(() => {
    if (!m.read) update((d) => ({ ...d, messages: d.messages.map((x) => (x.id === m.id ? { ...x, read: true } : x)) }));
  }, [m.id, m.read, update]);

  return (
    <Sheet title={`${kindLabel(m)} de ${from}`} onClose={onClose} size="lg">
      <div className="msg-view">
        <header className="msg-view-head">
          {contact && !mine && <Avatar contact={contact} className="avatar-md" />}
          <div>
            <h3>{from}</h3>
            <p className="muted">
              {kindLabel(m)} · {timeAgo(m.createdAt, Date.now())}
            </p>
          </div>
          {m.demo && <DemoTag />}
        </header>

        {m.kind === 'imagen' ? (
          <MediaImage src={m.media} alt={m.text || 'Foto del mensaje'} className="msg-image-full" />
        ) : m.kind === 'video' ? (
          video.url ? (
            <Video
              className="msg-video"
              src={video.url}
              controls
              playsInline
              preload="metadata"
              onError={() => onError('No se pudo reproducir el video.')}
            />
          ) : (
            <div className="media-ph msg-video">{video.loading ? 'Cargando video…' : 'Video no disponible'}</div>
          )
        ) : (
          <div className="msg-audio">
            <PlayButton playing={playing} loading={isThis && player.status === 'loading'} onClick={toggle} label="mensaje" size="lg" />
            <div className="msg-audio-main">
              <Waveform active={playing} bars={28} />
              {isThis && player.status !== 'idle' ? <Progress state={player} /> : <p className="muted num">Duración aprox. {Math.ceil(messageDuration(m) / 60) <= 1 ? `${messageDuration(m)} s` : `${Math.round(messageDuration(m) / 60)} min`}</p>}
            </div>
            {isThis && player.status !== 'idle' && <StopButton label="mensaje" />}
          </div>
        )}

        {m.text && <blockquote className="msg-text">“{m.text}”</blockquote>}
        {m.demo && m.kind === 'audio' && !m.media && (
          <p className="fine-print">Mensaje de demostración: no hay una grabación real; NEXO lee el texto en voz alta con la voz del sistema.</p>
        )}
        {onDelete && (
          <button className="btn btn-ghost btn-danger-text" onClick={onDelete}>
            <Trash2 size={20} /> Eliminar mensaje
          </button>
        )}
      </div>
    </Sheet>
  );
}
