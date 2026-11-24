import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Video as VideoIcon, VideoOff } from 'lucide-react';
import type { Contact } from '../../types';
import { Sheet } from '../../components/Sheet';
import { Avatar, DemoTag } from '../../components/Media';
import { audioEngine } from '../../services/audioEngine';
import { mmss } from '../../services/time';

/**
 * Video call screen. In this prototype the call is simulated: it rings, "connects" after a few seconds
 * and shows the family member's photo, with the patient's own camera in the corner when available.
 * NEXO is not connected to any calling service yet, and the screen says so.
 */
export function VideoCall({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const [phase, setPhase] = useState<'llamando' | 'en-llamada'>('llamando');
  const [seconds, setSeconds] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [camError, setCamError] = useState(false);
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

  // The patient's own camera (front), if the device allows it.
  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        if (self.current) self.current.srcObject = s;
      })
      .catch(() => setCamError(true));
    if (!navigator.mediaDevices?.getUserMedia) setCamError(true);
    return () => {
      cancelled = true;
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
    };
  }, []);

  useEffect(() => {
    stream.current?.getVideoTracks().forEach((t) => (t.enabled = camOn));
  }, [camOn]);

  return (
    <Sheet title={`Videollamada con ${contact.name}`} onClose={onClose} size="full" bare>
      <div className={`call ${phase === 'llamando' ? 'is-ringing' : ''}`}>
        <div className="call-remote">
          <Avatar contact={contact} className="call-avatar" />
          <h2>{contact.name}</h2>
          <p className="call-status num" role="status">
            {phase === 'llamando' ? 'Llamando…' : `En llamada · ${mmss(seconds)}`}
          </p>
          <DemoTag label="Demo: llamada simulada" />
        </div>

        <div className="call-self" aria-label="Tu cámara">
          {!camError && <video ref={self} autoPlay playsInline muted hidden={!camOn} />}
          {(camError || !camOn) && <span className="call-self-off">{camError ? 'Cámara no disponible' : 'Cámara apagada'}</span>}
        </div>

        <div className="call-controls">
          <button className={`call-btn ${micOn ? '' : 'is-off'}`} onClick={() => setMicOn((v) => !v)} aria-pressed={!micOn} aria-label={micOn ? 'Silenciar micrófono' : 'Activar micrófono'}>
            {micOn ? <Mic /> : <MicOff />}
          </button>
          <button className={`call-btn ${camOn ? '' : 'is-off'}`} onClick={() => setCamOn((v) => !v)} aria-pressed={!camOn} aria-label={camOn ? 'Apagar cámara' : 'Encender cámara'} disabled={camError}>
            {camOn ? <VideoIcon /> : <VideoOff />}
          </button>
          <button className="call-btn call-hangup" onClick={onClose} aria-label="Colgar">
            <PhoneOff />
          </button>
        </div>
        <p className="call-note">Simulación: en esta versión NEXO todavía no se conecta con el teléfono de tu familia.</p>
      </div>
    </Sheet>
  );
}
