import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { Sheet } from '../../components/Sheet';
import { audioEngine } from '../../services/audioEngine';
import { trackById } from '../../data/media';

const PHASES = [
  { label: 'Inhala', seconds: 4, scale: 1 },
  { label: 'Sostén', seconds: 2, scale: 1 },
  { label: 'Exhala', seconds: 6, scale: 0.55 },
] as const;
const CYCLES = 5;

/** 4-2-6 breathing, five cycles, with a circle that grows and shrinks. */
export function Breathing({ onClose }: { onClose: () => void }) {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [left, setLeft] = useState<number>(PHASES[0].seconds);
  const finished = cycle >= CYCLES;

  useEffect(() => {
    if (!running || finished) return;
    const t = window.setTimeout(() => {
      if (left > 1) return setLeft(left - 1);
      const nextPhase = (phase + 1) % PHASES.length;
      if (nextPhase === 0) setCycle((c) => c + 1);
      setPhase(nextPhase);
      setLeft(PHASES[nextPhase].seconds);
      audioEngine.tone(nextPhase === 0 ? 523 : nextPhase === 2 ? 392 : 440, 0.8);
    }, 1000);
    return () => window.clearTimeout(t);
  }, [running, left, phase, finished]);

  const p = PHASES[phase];
  const restart = () => {
    setPhase(0);
    setCycle(0);
    setLeft(PHASES[0].seconds);
    setRunning(true);
  };

  return (
    <Sheet title="Respiración guiada" onClose={onClose} size="full">
      <div className="breath">
        <div className={`breath-orb ${running && !finished ? 'is-on' : ''}`} style={{ ['--scale' as string]: running && !finished ? p.scale : 0.7, ['--dur' as string]: `${p.seconds}s` }}>
          <span className="breath-label">{finished ? 'Muy bien' : running ? p.label : 'Listo'}</span>
          {running && !finished && <span className="breath-count num">{left}</span>}
        </div>
        <p className="game-hint" aria-live="polite">
          {finished ? 'Terminaste cinco respiraciones. ¿Cómo te sientes?' : running ? `Respiración ${cycle + 1} de ${CYCLES}` : 'Inhala 4 segundos, sostén 2 y exhala 6. Cinco veces.'}
        </p>
        <div className="game-foot center">
          {finished ? (
            <button className="btn btn-primary" onClick={restart}>
              <RotateCcw size={20} /> Otra vez
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setRunning((r) => !r)}>
              {running ? <><Pause size={20} /> Pausar</> : <><Play size={20} /> {cycle || phase ? 'Continuar' : 'Empezar'}</>}
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

const STEPS = [
  'Acomódate de la forma que te resulte más cómoda. Deja que la cama sostenga tu cuerpo.',
  'Lleva la atención a tu respiración. No tienes que cambiarla, solo notarla.',
  'Siente tus manos. Déjalas pesadas y tranquilas.',
  'Afloja los hombros y la frente. Suelta la mandíbula.',
  'Piensa en un lugar donde te sientas en paz. Míralo con calma.',
  'Recuerda a alguien que te quiere. Siente que te acompaña.',
  'Vuelve despacio a la habitación. Hay personas cuidándote y acompañándote.',
];
const STEP_SECONDS = 25;

/** Three-minute guided meditation: on-screen steps over a calm music track. */
export function Meditation({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(-1);
  const startedMusic = useRef(false);

  useEffect(() => {
    if (step < 0 || step >= STEPS.length) return;
    const t = window.setTimeout(() => setStep((s) => s + 1), STEP_SECONDS * 1000);
    return () => window.clearTimeout(t);
  }, [step]);

  useEffect(
    () => () => {
      if (startedMusic.current) audioEngine.stop();
    },
    [],
  );

  const start = () => {
    const t = trackById('calma-de-noche')!;
    audioEngine.playMedia({ id: t.id, title: 'Meditación', subtitle: t.title, src: t.src, loop: true });
    startedMusic.current = true;
    setStep(0);
  };

  const done = step >= STEPS.length;
  return (
    <Sheet title="Meditación" onClose={onClose} size="full">
      <div className="meditation">
        {step < 0 ? (
          <>
            <p className="lead">Tres minutos para soltar la tensión, con música suave.</p>
            <button className="btn btn-primary" onClick={start}>
              <Play size={20} /> Empezar
            </button>
          </>
        ) : done ? (
          <>
            <p className="lead">Terminaste la meditación. Quédate un momento así, en calma.</p>
            <button className="btn btn-primary" onClick={start}>
              <RotateCcw size={20} /> Repetir
            </button>
          </>
        ) : (
          <>
            <p className="meditation-step" key={step}>
              {STEPS[step]}
            </p>
            <div className="steps-dots" aria-label={`Paso ${step + 1} de ${STEPS.length}`}>
              {STEPS.map((_, i) => (
                <i key={i} className={i <= step ? 'on' : ''} />
              ))}
            </div>
            <div className="game-foot center">
              <button className="btn btn-ghost" onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}>
                Siguiente paso
              </button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
