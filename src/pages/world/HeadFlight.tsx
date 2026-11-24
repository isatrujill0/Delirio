import { useEffect, useRef, useState } from 'react';
import { Hand, Pause, Play, RotateCcw, ScanFace, Trophy } from 'lucide-react';
import { Sheet } from '../../components/Sheet';
import { useAppData } from '../../hooks/useAppData';
import { audioEngine } from '../../services/audioEngine';
import { loadFaceTracker, type FaceTracker } from '../../services/faceTracker';
import { BIRD_R, BIRD_X, COL_W, GAP_H, headToTarget, initialFlight, stepFlight, type FlightState } from '../../services/flight';

type Mode = 'cabeza' | 'dedo';
type CamState = 'apagada' | 'pidiendo' | 'calibrando' | 'lista' | 'sin-cara' | 'no-disponible';

const CALIBRATION_MS = 1800;

/** Draws one frame: violet sky, clouds, flower arches and an original hummingbird. */
function draw(ctx: CanvasRenderingContext2D, w: number, h: number, s: FlightState, t: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#3a3aa8');
  sky.addColorStop(0.6, '#6f63d8');
  sky.addColorStop(1, '#c9a7f0');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Slow clouds
  ctx.fillStyle = 'rgb(255 255 255 / 0.22)';
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 0.27 - t * 0.012) % 1.2 + 1.2) % 1.2 - 0.1;
    const cy = 0.12 + ((i * 0.37) % 0.6);
    ctx.beginPath();
    ctx.ellipse(cx * w, cy * h, w * 0.08, h * 0.035, 0, 0, Math.PI * 2);
    ctx.ellipse((cx + 0.05) * w, (cy - 0.02) * h, w * 0.06, h * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Flower arches: two stems with blossoms around the opening
  for (const a of s.arches) {
    const x = a.x * w;
    const cw = COL_W * w;
    const top = (a.gapY - GAP_H / 2) * h;
    const bottom = (a.gapY + GAP_H / 2) * h;
    ctx.fillStyle = a.bumped ? '#8f7fb8' : '#4f9a7e';
    const r = cw / 2;
    ctx.beginPath();
    ctx.roundRect(x, -r, cw, top + r, r);
    ctx.roundRect(x, bottom, cw, h - bottom + r, r);
    ctx.fill();
    ctx.fillStyle = 'rgb(255 255 255 / 0.18)';
    ctx.fillRect(x + cw * 0.18, 0, cw * 0.12, top);
    ctx.fillRect(x + cw * 0.18, bottom, cw * 0.12, h - bottom);
    for (const fy of [top, bottom]) {
      for (let k = 0; k < 5; k++) {
        const ang = (k / 5) * Math.PI * 2;
        ctx.fillStyle = a.passed && !a.bumped ? '#ffd36e' : '#f7b3d2';
        ctx.beginPath();
        ctx.ellipse(x + cw / 2 + Math.cos(ang) * cw * 0.32, fy + Math.sin(ang) * cw * 0.32, cw * 0.26, cw * 0.18, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(x + cw / 2, fy, cw * 0.17, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Hummingbird
  const bx = BIRD_X * w;
  const by = s.birdY * h;
  const br = BIRD_R * Math.min(w, h) * 1.1;
  const flap = Math.sin(t * 28) * 0.6;
  ctx.save();
  ctx.translate(bx, by);
  ctx.fillStyle = 'rgb(255 255 255 / 0.55)'; // wing (fast flutter)
  ctx.beginPath();
  ctx.ellipse(-br * 0.2, -br * 0.55, br * 0.9, br * 0.32, -0.6 + flap, 0, Math.PI * 2);
  ctx.fill();
  const body = ctx.createLinearGradient(-br, -br, br, br);
  body.addColorStop(0, '#5ee0b8');
  body.addColorStop(1, '#3a7bd5');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, br, br * 0.78, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff7aa8'; // throat
  ctx.beginPath();
  ctx.ellipse(br * 0.45, br * 0.25, br * 0.35, br * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2b2f86'; // long beak
  ctx.lineWidth = Math.max(2, br * 0.12);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(br * 0.85, -br * 0.05);
  ctx.lineTo(br * 1.9, -br * 0.12);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(br * 0.45, -br * 0.25, br * 0.17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1b1d63';
  ctx.beginPath();
  ctx.arc(br * 0.5, -br * 0.25, br * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a7bd5'; // tail
  ctx.beginPath();
  ctx.moveTo(-br * 0.8, 0);
  ctx.lineTo(-br * 1.7, -br * 0.35);
  ctx.lineTo(-br * 1.6, br * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Face-movement game: the hummingbird follows the patient's head (up and down) through flower arches.
 * Uses the front camera on the device only; without a camera it is played with a finger.
 */
export function HeadFlight({ onClose }: { onClose: () => void }) {
  const { data, update } = useAppData();
  const best = data.scores.vuelo ?? 0;
  const [mode, setMode] = useState<Mode>('cabeza');
  const [cam, setCam] = useState<CamState>('apagada');
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const state = useRef<FlightState>(initialFlight());
  const target = useRef(0.5);
  const neutral = useRef<number | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const trackerRef = useRef<FaceTracker | null>(null);

  // Camera + face tracker, only in head mode.
  useEffect(() => {
    if (mode !== 'cabeza') return;
    let cancelled = false;
    let timer: number | undefined;
    const samples: number[] = [];
    let calibStart = 0;
    let missed = 0;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) return setCam('no-disponible');
      setCam('pidiendo');
      try {
        const [s, tracker] = await Promise.all([navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: false }), loadFaceTracker()]);
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        if (!tracker) {
          s.getTracks().forEach((t) => t.stop());
          return setCam('no-disponible');
        }
        trackerRef.current = tracker;
        if (video.current) {
          video.current.srcObject = s;
          await video.current.play().catch(() => undefined);
        }
        neutral.current = null;
        setCam('calibrando');
        const loop = async () => {
          if (cancelled || !video.current) return;
          const face = await tracker.detect(video.current).catch(() => null);
          if (cancelled) return;
          if (face) {
            missed = 0;
            if (neutral.current === null) {
              if (!calibStart) calibStart = performance.now();
              samples.push(face.y);
              if (performance.now() - calibStart > CALIBRATION_MS) {
                neutral.current = samples.reduce((a, b) => a + b, 0) / samples.length;
                setCam('lista');
              }
            } else {
              target.current = headToTarget(face.y, neutral.current);
              setCam('lista');
            }
          } else if (++missed > 8) {
            setCam(neutral.current === null ? 'calibrando' : 'sin-cara');
          }
          timer = window.setTimeout(loop, 90);
        };
        loop();
      } catch {
        if (!cancelled) setCam('no-disponible');
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
    };
  }, [mode]);

  useEffect(() => {
    if (cam === 'no-disponible') setMode('dedo');
  }, [cam]);

  // Game loop
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    let last = performance.now();
    const t0 = last;
    const tick = (now: number) => {
      const dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const dt = (now - last) / 1000;
      last = now;
      if (running) {
        const { state: next, events } = stepFlight(state.current, dt, target.current);
        state.current = next;
        for (const e of events) {
          if (e.type === 'pass') {
            audioEngine.tone(784, 0.35);
            setScore(next.score);
          } else {
            // Touching an arch ends the round: show the result and offer to start again.
            audioEngine.tone(262, 0.4);
            setRunning(false);
            setOver(true);
            if (next.score > (data.scores.vuelo ?? 0)) update((d) => ({ ...d, scores: { ...d.scores, vuelo: next.score } }));
            break;
          }
        }
      }
      draw(ctx, w, h, state.current, (now - t0) / 1000);
      c.dataset.bird = state.current.birdY.toFixed(2); // read by tests
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const restart = () => {
    state.current = initialFlight();
    target.current = 0.5;
    setScore(0);
    setOver(false);
    setRunning(true);
  };

  const close = () => {
    if (score > best) update((d) => ({ ...d, scores: { ...d.scores, vuelo: score } }));
    onClose();
  };

  const pointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== 'dedo') return;
    const r = e.currentTarget.getBoundingClientRect();
    target.current = (e.clientY - r.top) / r.height;
  };

  const status =
    mode === 'dedo'
      ? cam === 'no-disponible'
        ? 'La cámara no está disponible aquí: mueve el colibrí con el dedo.'
        : 'Desliza el dedo para pasar por el hueco de cada arco sin tocarlo.'
      : cam === 'pidiendo'
        ? 'Encendiendo la cámara…'
        : cam === 'calibrando'
          ? 'Mira de frente a la pantalla, quieta, un momento…'
          : cam === 'sin-cara'
            ? 'No veo tu cara. Acércate un poco a la pantalla.'
            : 'Sube o baja la cabeza para pasar por el hueco de cada arco sin tocarlo.';

  return (
    <Sheet title="Vuelo del colibrí" onClose={close} size="full">
      <p className="game-hint" aria-live="polite">
        {over ? `¡Chocaste! Pasaste ${score} ${score === 1 ? 'arco' : 'arcos'}.` : status}
      </p>
      <div className="flight">
        <canvas
          ref={canvas}
          className="flight-canvas"
          onPointerDown={pointer}
          onPointerMove={(e) => (e.buttons || e.pointerType === 'touch') && pointer(e)}
          role="img"
          aria-label={`Colibrí volando entre arcos de flores. Arcos superados: ${score}`}
        />
        {over && (
          <div className="flight-over" role="alert">
            <strong>¡Chocaste!</strong>
            <span className="num">
              Pasaste {score} {score === 1 ? 'arco' : 'arcos'} · Tu mejor: {Math.max(best, score)}
            </span>
            <button className="btn btn-primary" onClick={restart}>
              <RotateCcw size={20} /> Jugar otra vez
            </button>
          </div>
        )}
        {mode === 'cabeza' && (
          <div className={`flight-cam ${cam === 'lista' ? 'is-ok' : ''}`}>
            <video ref={video} playsInline muted autoPlay />
            <span className="flight-cam-label">{cam === 'lista' ? 'Te veo' : cam === 'calibrando' ? 'Calibrando…' : '…'}</span>
          </div>
        )}
      </div>
      <div className="game-foot">
        <span className="muted num">
          <Trophy size={18} /> Arcos: {score} · Mejor: {Math.max(best, score)}
        </span>
        <div className="flight-actions">
          <button className="btn btn-ghost" onClick={() => setMode((m) => (m === 'cabeza' ? 'dedo' : 'cabeza'))} disabled={cam === 'no-disponible' && mode === 'dedo'}>
            {mode === 'cabeza' ? <Hand size={20} /> : <ScanFace size={20} />} {mode === 'cabeza' ? 'Jugar con el dedo' : 'Jugar con la cabeza'}
          </button>
          {!over && (
            <button className="btn btn-primary" onClick={() => setRunning((r) => !r)} disabled={mode === 'cabeza' && cam !== 'lista' && !running}>
              {running ? <Pause size={20} /> : <Play size={20} />} {running ? 'Pausar' : score || state.current.arches.length ? 'Continuar' : 'Empezar'}
            </button>
          )}
        </div>
      </div>
      <p className="fine-print">La cámara solo se usa en este iPad para seguir tu cara; no se graba ni se envía a ningún lugar.</p>
    </Sheet>
  );
}
