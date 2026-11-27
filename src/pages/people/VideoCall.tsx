import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, RefreshCw, Video as VideoIcon, VideoOff } from 'lucide-react';
import type { Contact } from '../../types';
import { Sheet } from '../../components/Sheet';
import { Avatar, DemoTag, MediaImage } from '../../components/Media';
import { audioEngine } from '../../services/audioEngine';
import { mmss } from '../../services/time';

type Feed = 'remote' | 'self';

/**
 * Video call screen, laid out like a real call: the other person fills the screen and your own camera
 * sits in a small window you can tap to swap them. In this prototype the call is simulated: it rings,
 * "answers" after a few seconds, and the family member's camera is their photo with gentle movement.
 * Your camera is real when the device allows it. The screen says it is a simulation.
 */
export function VideoCall({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const [phase, setPhase] = useState<'llamando' | 'en-llamada'>('llamando');
  const [seconds, setSeconds] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [camState, setCamState] = useState<'pidiendo' | 'lista' | 'no-disponible'>('pidiendo');
  const [big, setBig] = useState<Feed>('remote');
  const self = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);

  // Ring until the (simulated) answer, then count the call time.
  useEffect(() => {
    audioEngine.stop();
    if (phase === 'llamando') {
      const ring = () => {
        audioEngine.tone(440, 0.35);
        window.setTimeout(() => audioEngine.tone(523, 0.35), 380);
      };
      ring();
      const r = window.setInterval(ring, 2000);
      const answer = window.setTimeout(() => setPhase('en-llamada'), 4000);
      return () => {
        window.clearInterval(r);
        window.clearTimeout(answer);
      };
    }
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [phase]);

  // Your own front camera, when the device and the browser allow it.
  useEffect(() => {
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamState('no-disponible');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        setCamState('lista');
      })
      .catch(() => !cancelled && setCamState('no-disponible'));
    return () => {
      cancelled = true;
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
    };
  }, []);

  // (Re)attach the stream whenever the video element changes place (swap) or the camera turns back on.
  useEffect(() => {
    if (self.current && stream.current && self.current.srcObject !== stream.current) self.current.srcObject = stream.current;
    stream.current?.getVideoTracks().forEach((t) => (t.enabled = camOn));
  });

  const remote = (
    <div className={`feed feed-remote ${phase === 'en-llamada' ? 'is-live' : ''}`}>
      {phase === 'en-llamada' && contact.photo ? (
        <MediaImage src={contact.photo} alt={`Cámara de ${contact.name}`} className="feed-img" />
      ) : (
        <Avatar contact={contact} className="call-avatar" />
      )}
      {phase === 'llamando' && <span className="feed-ringing">Llamando a {contact.name}…</span>}
    </div>
  );

  const mine = (
    <div className="feed feed-self">
      {camState === 'lista' && <video ref={self} autoPlay playsInline muted hidden={!camOn} />}
      {(camState !== 'lista' || !camOn) && (
        <span className="feed-off">
          <VideoOff size={28} aria-hidden="true" />
          {!camOn ? 'Tu cámara está apagada' : camState === 'pidiendo' ? 'Encendiendo tu cámara…' : 'Tu cámara no está disponible aquí'}
        </span>
      )}
    </div>
  );

  return (
    <Sheet title={`Videollamada con ${contact.name}`} onClose={onClose} size="full" bare>
      <div className={`call call-v2 ${phase === 'llamando' ? 'is-ringing' : ''}`}>
        <div className="call-main" aria-label={big === 'remote' ? `Cámara de ${contact.name}` : 'Tu cámara'}>
          {big === 'remote' ? remote : mine}
        </div>

        <header className="call-top">
          <span className="call-who">
            {phase === 'en-llamada' && <i className="call-live-dot" aria-hidden="true" />}
            <strong>{contact.name}</strong>
            <span className="num" role="status">{phase === 'llamando' ? 'Llamando…' : mmss(seconds)}</span>
          </span>
          <DemoTag label="Demo: llamada simulada" />
        </header>

        <button className="call-pip" onClick={() => setBig((b) => (b === 'remote' ? 'self' : 'remote'))} aria-label="Cambiar las vistas de la llamada">
          {big === 'remote' ? mine : remote}
          <span className="call-pip-swap" aria-hidden="true">
            <RefreshCw size={16} />
          </span>
        </button>

        <div className="call-controls">
          <button className={`call-btn ${micOn ? '' : 'is-off'}`} onClick={() => setMicOn((v) => !v)} aria-pressed={!micOn} aria-label={micOn ? 'Silenciar micrófono' : 'Activar micrófono'}>
            {micOn ? <Mic /> : <MicOff />}
          </button>
          <button className={`call-btn ${camOn ? '' : 'is-off'}`} onClick={() => setCamOn((v) => !v)} aria-pressed={!camOn} aria-label={camOn ? 'Apagar cámara' : 'Encender cámara'} disabled={camState !== 'lista'}>
            {camOn ? <VideoIcon /> : <VideoOff />}
          </button>
          <button className="call-btn call-hangup" onClick={onClose} aria-label="Colgar">
            <PhoneOff />
          </button>
        </div>
        <p className="call-note">Simulación: la cámara de {contact.name} se muestra con su foto; SYNK todavía no se conecta con su teléfono.</p>
      </div>
    </Sheet>
  );
}
