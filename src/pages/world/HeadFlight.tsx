import { useEffect, useRef, useState } from 'react';
import { Camera, ExternalLink, Hand, Pause, Play, RotateCcw, ScanFace, Trophy } from 'lucide-react';
import { Sheet } from '../../components/Sheet';
import { useAppData } from '../../hooks/useAppData';
import { audioEngine } from '../../services/audioEngine';
import { loadFaceTracker, type FaceTracker } from '../../services/faceTracker';
import { rangeLabel, summarizeFace, type FaceSample, type FaceSummary } from '../../services/faceAnalysis';
import { BIRD_R, BIRD_X, COL_W, GAP_H, headToTarget, initialFlight, stepFlight, type FlightState } from '../../services/flight';

type Mode = 'cabeza' | 'dedo';
type CamState = 'apagada' | 'pidiendo' | 'calibrando' | 'lista' | 'sin-cara' | 'error';

const CALIBRATION_MS = 1800;

/** Draws one frame: violet sky, clouds, flower arches and an original hummingbird. */
function draw(ctx: CanvasRenderingContext2D, w: number, h: number, s: FlightState, t: number, overCamera: boolean) {
  ctx.clearRect(0, 0, w, h);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  if (overCamera) {
    // The person's own camera image is the background: only a soft violet veil over it.
    sky.addColorStop(0, 'rgb(58 58 168 / 0.32)');
    sky.addColorStop(1, 'rgb(201 167 240 / 0.12)');
  } else {
    sky.addColorStop(0, '#3a3aa8');
    sky.addColorStop(0.6, '#6f63d8');
    sky.addColorStop(1, '#c9a7f0');
  }
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

/** Plain-language reason why the camera could not start, and what to do. */
function cameraProblem(e: unknown): string {
  const name = e instanceof DOMException ? e.name : e instanceof Error ? e.message : '';
  if (inFrame && (name === 'NotAllowedError' || name === 'SecurityError')) return 'Esta vista previa no deja usar la cámara. Toca «Abrir SYNK con cámara» para jugar con la cabeza en la app completa.';
  if (!window.isSecureContext) return 'La cámara solo funciona en una dirección segura (https).';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'No hay permiso para la cámara. En el iPad: Ajustes → Safari → Cámara → Permitir (o «Preguntar»), y toca «Activar cámara» otra vez.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No se encontró una cámara en este dispositivo.';
  if (name === 'NotReadableError') return 'Otra app está usando la cámara. Ciérrala y vuelve a intentarlo.';
  if (name === 'modelo') return 'No se pudo cargar el detector de caras. Revisa la conexión y vuelve a intentarlo.';
  return 'No se pudo encender la cámara. Vuelve a intentarlo.';
}

/** Asks the browser to show the game on the whole screen; quietly does nothing where it is not allowed. */
function enterFullscreen(el: HTMLElement | null) {
  const node = el as (HTMLElement & { webkitRequestFullscreen?: () => void }) | null;
  if (!node || document.fullscreenElement) return;
  try {
    const p = node.requestFullscreen?.() ?? node.webkitRequestFullscreen?.();
    if (p instanceof Promise) p.catch(() => undefined);
  } catch {
    /* not allowed here (e.g. inside a preview) */
  }
}

function exitFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
}

/** The published app, where the camera always works (the preview frame may not allow it). */
const APP_URL = 'https://isatrujill0.github.io/Delirio/';
const inFrame = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

/**
 * Face-movement game: the hummingbird follows the patient's head (up and down) through flower arches.
 * Uses the front camera on the device only; without a camera it is played with a finger.
 */
export function HeadFlight({ onClose }: { onClose: () => void }) {
  const { data, update } = useAppData();
  const best = data.scores.vuelo ?? 0;
  const [mode, setMode] = useState<Mode>('cabeza');
  const [cam, setCam] = useState<CamState>('apagada');
  const [camError, setCamError] = useState('');
  const [camRequest, setCamRequest] = useState(0);
  const [summary, setSummary] = useState<FaceSummary | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const faceLog = useRef<FaceSample[]>([]);
  const roundStart = useRef(0);
  const runningRef = useRef(false);
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

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  // Camera + face tracker: only in head mode, and only after "Activar cámara".
  useEffect(() => {
    if (mode !== 'cabeza' || camRequest === 0) return;
    let cancelled = false;
    let timer: number | undefined;
    const samples: number[] = [];
    let calibStart = 0;
    let missed = 0;

    (async () => {
      setCamError('');
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamError(cameraProblem(new DOMException('', window.isSecureContext ? 'NotFoundError' : 'SecurityError')));
        return setCam('error');
      }
      setCam('pidiendo');
      try {
        const [s, tracker] = await Promise.all([navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: false }), loadFaceTracker()]);
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        if (!tracker) {
          s.getTracks().forEach((t) => t.stop());
          setCamError(cameraProblem(new Error('modelo')));
          return setCam('error');
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
          const found = await tracker.detect(video.current).catch(() => null);
          if (cancelled) return;
          if (runningRef.current) faceLog.current.push({ t: (performance.now() - roundStart.current) / 1000, y: found ? found.y : null });
          if (found) {
            missed = 0;
            if (neutral.current === null) {
              if (!calibStart) calibStart = performance.now();
              samples.push(found.y);
              if (performance.now() - calibStart > CALIBRATION_MS) {
                neutral.current = samples.reduce((a, b) => a + b, 0) / samples.length;
                setCam('lista');
              }
            } else {
              target.current = headToTarget(found.y, neutral.current);
              setCam('lista');
            }
          } else if (++missed > 8) {
            setCam(neutral.current === null ? 'calibrando' : 'sin-cara');
          }
          timer = window.setTimeout(loop, 90);
        };
        loop();
      } catch (e) {
        if (!cancelled) {
          setCamError(cameraProblem(e));
          setCam('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
    };
  }, [mode, camRequest]);

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
            if (mode === 'cabeza') setSummary(summarizeFace(faceLog.current));
            if (next.score > (data.scores.vuelo ?? 0)) update((d) => ({ ...d, scores: { ...d.scores, vuelo: next.score } }));
            break;
          }
        }
      }
      const v = video.current;
      const live = mode === 'cabeza' && !!v && !!v.videoWidth && !!stream.current;
      draw(ctx, w, h, state.current, (now - t0) / 1000, live);
      c.dataset.bird = state.current.birdY.toFixed(2); // read by tests
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode]);

  useEffect(() => exitFullscreen, []);

  const startRound = () => {
    faceLog.current = [];
    roundStart.current = performance.now();
    setSummary(null);
  };

  const restart = () => {
    startRound();
    state.current = initialFlight();
    target.current = 0.5;
    setScore(0);
    setOver(false);
    setRunning(true);
  };

  const close = () => {
    exitFullscreen();
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
      ? 'Desliza el dedo para pasar por el hueco de cada arco sin tocarlo.'
      : cam === 'apagada'
        ? 'Para jugar con la cabeza, activa la cámara.'
        : cam === 'error'
          ? 'No se pudo usar la cámara.'
          : cam === 'pidiendo'
        ? 'Encendiendo la cámara… Si el iPad pregunta, toca «Permitir».'
        : cam === 'calibrando'
          ? 'Mira de frente a la pantalla, quieta, un momento…'
          : cam === 'sin-cara'
            ? 'No veo tu cara. Acércate un poco a la pantalla.'
            : 'Sube o baja la cabeza para pasar por el hueco de cada arco sin tocarlo.';

  const askCamera = () => {
    enterFullscreen(root.current?.closest<HTMLElement>('.sheet') ?? root.current);
    setCamRequest((n) => n + 1);
  };

  const toggleRun = () => {
    enterFullscreen(root.current?.closest<HTMLElement>('.sheet') ?? root.current);
    if (!running && !score && !state.current.arches.length) startRound();
    setRunning((r) => !r);
  };

  return (
    <Sheet title="Vuelo del colibrí" onClose={close} size="full" bare>
      <div ref={root} className={`flight ${mode === 'cabeza' && (cam === 'lista' || cam === 'calibrando' || cam === 'sin-cara') ? 'is-camera' : ''}`}>
        {mode === 'cabeza' && <video ref={video} className="flight-video" playsInline muted autoPlay aria-hidden="true" />}
        <canvas
          ref={canvas}
          className="flight-canvas"
          onPointerDown={pointer}
          onPointerMove={(e) => (e.buttons || e.pointerType === 'touch') && pointer(e)}
          role="img"
          aria-label={`Colibrí volando entre arcos de flores. Arcos superados: ${score}`}
        />
        <div className="flight-top">
          <p className="game-hint" aria-live="polite">
            {over ? `¡Chocaste! Pasaste ${score} ${score === 1 ? 'arco' : 'arcos'}.` : status}
          </p>
          {mode === 'cabeza' && cam !== 'apagada' && cam !== 'error' && (
            <span className={`flight-cam-label ${cam === 'lista' ? 'is-ok' : ''}`}>
              <ScanFace size={18} aria-hidden="true" /> {cam === 'lista' ? 'Te veo' : cam === 'calibrando' ? 'Calibrando…' : cam === 'sin-cara' ? 'No te veo' : '…'}
            </span>
          )}
        </div>
        {over && (
          <div className="flight-over" role="alert">
            <strong>¡Chocaste!</strong>
            <span className="num">
              Pasaste {score} {score === 1 ? 'arco' : 'arcos'} · Tu mejor: {Math.max(best, score)}
            </span>
            {summary && (
              <div className="face-summary">
                <h3>
                  <ScanFace size={20} aria-hidden="true" /> Análisis de tu cara en esta ronda
                </h3>
                <ul className="num">
                  <li>
                    <strong>{summary.visiblePct} %</strong> del tiempo se vio tu cara
                  </li>
                  <li>
                    <strong>{rangeLabel(summary.rangePct)}</strong> de la cabeza ({summary.rangePct} % de la imagen)
                  </li>
                  <li>
                    <strong>{summary.moves}</strong> {summary.moves === 1 ? 'movimiento' : 'movimientos'} de subir y bajar en {Math.round(summary.seconds)} s
                  </li>
                </ul>
                <small>Es un seguimiento del ejercicio, no una evaluación médica. No se guarda.</small>
              </div>
            )}
            <button className="btn btn-primary" onClick={restart}>
              <RotateCcw size={20} /> Jugar otra vez
            </button>
          </div>
        )}
        {mode === 'cabeza' && (cam === 'apagada' || cam === 'error') && !over && (
          <div className="flight-over flight-camera-ask">
            <Camera size={40} strokeWidth={1.5} aria-hidden="true" />
            {cam === 'error' ? <p role="alert">{camError}</p> : <p>Activa la cámara: te verás en toda la pantalla y el colibrí seguirá tu cabeza. La imagen se usa solo en este dispositivo.</p>}
            <div className="flight-actions">
              {cam === 'error' && inFrame ? (
                <a className="btn btn-primary" href={APP_URL} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={20} /> Abrir SYNK con cámara
                </a>
              ) : null}
              <button className={`btn ${cam === 'error' && inFrame ? 'btn-ghost' : 'btn-primary'}`} onClick={askCamera}>
                <Camera size={20} /> {cam === 'error' ? 'Intentar otra vez' : 'Activar cámara'}
              </button>
              <button className="btn btn-ghost" onClick={() => setMode('dedo')}>
                <Hand size={20} /> Jugar con el dedo
              </button>
            </div>
          </div>
        )}
        <div className="flight-bottom">
          <span className="flight-score num">
            <Trophy size={18} /> Arcos: {score} · Mejor: {Math.max(best, score)}
          </span>
          <div className="flight-actions">
            <button className="btn btn-ghost" onClick={() => setMode((m) => (m === 'cabeza' ? 'dedo' : 'cabeza'))}>
              {mode === 'cabeza' ? <Hand size={20} /> : <ScanFace size={20} />} {mode === 'cabeza' ? 'Jugar con el dedo' : 'Jugar con la cabeza'}
            </button>
            {!over && (
              <button className="btn btn-primary" onClick={toggleRun} disabled={mode === 'cabeza' && cam !== 'lista' && !running}>
                {running ? <Pause size={20} /> : <Play size={20} />} {running ? 'Pausar' : score || state.current.arches.length ? 'Continuar' : 'Empezar'}
              </button>
            )}
          </div>
          <p className="fine-print">La cámara solo se usa en este iPad para seguir tu cara; no se graba ni se envía a ningún lugar.</p>
        </div>
      </div>
    </Sheet>
  );
}
