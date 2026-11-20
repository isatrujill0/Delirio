import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Volume2, Trophy } from 'lucide-react';
import { Sheet } from '../../components/Sheet';
import { LandscapeArt } from '../../components/Landscape';
import { LANDSCAPES } from '../../data/media';
import { useAppData } from '../../hooks/useAppData';
import { audioEngine } from '../../services/audioEngine';
import { PROVERBS, proverbOptions, extendSequence, checkEcho, revealFraction } from '../../services/games';

export type GameId = 'despertar' | 'eco' | 'refran';

function useBestScore(game: GameId) {
  const { data, update } = useAppData();
  const best = data.scores[game] ?? 0;
  const record = (score: number) => score > best && update((d) => ({ ...d, scores: { ...d.scores, [game]: score } }));
  return { best, record };
}

/** Very low effort: each touch clears the mist from a part of the landscape. */
function Awakening({ onClose }: { onClose: () => void }) {
  const [scene, setScene] = useState(0);
  const [spots, setSpots] = useState<{ x: number; y: number }[]>([]);
  const { best, record } = useBestScore('despertar');
  const done = revealFraction(spots.length) >= 1;
  const notes = [523, 587, 659, 784, 880, 988, 1047];

  const tap = (e: React.PointerEvent<HTMLDivElement>) => {
    if (done) return;
    const r = e.currentTarget.getBoundingClientRect();
    const next = [...spots, { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }];
    setSpots(next);
    audioEngine.tone(notes[(next.length - 1) % notes.length], 0.9);
    if (revealFraction(next.length) >= 1) record((best || 0) + 1);
  };
  const mask = spots.map((s) => `radial-gradient(circle at ${s.x}% ${s.y}%, transparent 0 22%, black 34%)`).join(',');

  return (
    <Sheet title="El despertar del paisaje" onClose={onClose} size="full">
      <p className="game-hint">{done ? '¡Despertaste el paisaje! Respira y disfrútalo.' : 'Toca la pantalla con calma para despejar la neblina.'}</p>
      <div className="awake" onPointerDown={tap} role="button" tabIndex={0} aria-label="Toca para despejar la neblina" onKeyDown={(e) => e.key === 'Enter' && setSpots((s) => [...s, { x: 20 + s.length * 10, y: 50 }])}>
        <LandscapeArt scene={LANDSCAPES[scene % LANDSCAPES.length]} className="awake-art" />
        <div className={`awake-mist ${done ? 'is-clear' : ''}`} style={spots.length ? { WebkitMaskImage: mask, maskImage: mask, WebkitMaskComposite: 'source-in', maskComposite: 'intersect' } : undefined} />
      </div>
      <div className="game-foot">
        <span className="muted num">
          <Trophy size={18} /> Paisajes despertados: {best}
        </span>
        <button className="btn btn-primary" onClick={() => { setSpots([]); setScene((s) => s + 1); }}>
          <RotateCcw size={20} /> {done ? 'Otro paisaje' : 'Empezar de nuevo'}
        </button>
      </div>
    </Sheet>
  );
}

const PADS = [
  { name: 'Azul', freq: 330, cls: 'pad-blue' },
  { name: 'Violeta', freq: 392, cls: 'pad-violet' },
  { name: 'Rosa', freq: 494, cls: 'pad-rose' },
  { name: 'Dorado', freq: 587, cls: 'pad-gold' },
];

/** Medium effort: watch and repeat a growing sequence of lights. */
function EchoLights({ onClose }: { onClose: () => void }) {
  const [seq, setSeq] = useState<number[]>([]);
  const [taps, setTaps] = useState<number[]>([]);
  const [lit, setLit] = useState<number | null>(null);
  const [phase, setPhase] = useState<'idle' | 'showing' | 'input' | 'over'>('idle');
  const { best, record } = useBestScore('eco');
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const show = (s: number[]) => {
    setPhase('showing');
    setTaps([]);
    s.forEach((p, i) => {
      timers.current.push(window.setTimeout(() => { setLit(p); audioEngine.tone(PADS[p].freq, 0.5); }, 700 + i * 900));
      timers.current.push(window.setTimeout(() => setLit(null), 700 + i * 900 + 550));
    });
    timers.current.push(window.setTimeout(() => setPhase('input'), 700 + s.length * 900));
  };
  const start = () => {
    const s = extendSequence([]);
    setSeq(s);
    show(s);
  };
  const press = (p: number) => {
    if (phase !== 'input') return;
    audioEngine.tone(PADS[p].freq, 0.35);
    setLit(p);
    timers.current.push(window.setTimeout(() => setLit(null), 250));
    const next = [...taps, p];
    const res = checkEcho(seq, next);
    if (res === 'mistake') {
      setPhase('over');
      record(seq.length - 1);
    } else if (res === 'round-complete') {
      const s = extendSequence(seq);
      setSeq(s);
      // Lock input right away: a quick extra tap during the pause is not a mistake.
      setPhase('showing');
      setTaps([]);
      timers.current.push(window.setTimeout(() => show(s), 500));
    } else setTaps(next);
  };

  const message = { idle: 'Mira las luces y repítelas en el mismo orden.', showing: 'Observa…', input: 'Tu turno: toca las luces en orden.', over: `¡Muy bien! Recordaste ${Math.max(0, seq.length - 1)} luces.` }[phase];

  return (
    <Sheet title="Eco de luces" onClose={onClose} size="full">
      <p className="game-hint" aria-live="polite">{message}</p>
      <div className="echo-pads">
        {PADS.map((p, i) => (
          <button key={p.name} className={`echo-pad ${p.cls} ${lit === i ? 'is-lit' : ''}`} onClick={() => press(i)} disabled={phase !== 'input'} aria-label={`Luz ${p.name}`} />
        ))}
      </div>
      <div className="game-foot">
        <span className="muted num">
          <Trophy size={18} /> Ronda {Math.max(1, seq.length)} · Mejor: {best}
        </span>
        {(phase === 'idle' || phase === 'over') && (
          <button className="btn btn-primary" onClick={start}>
            {phase === 'over' ? <><RotateCcw size={20} /> Jugar otra vez</> : 'Empezar'}
          </button>
        )}
      </div>
    </Sheet>
  );
}

/** Advanced: pick the ending of a popular saying. */
function Proverbs({ onClose }: { onClose: () => void }) {
  const [round, setRound] = useState(0);
  const [options, setOptions] = useState(() => proverbOptions(0));
  const [chosen, setChosen] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const { best, record } = useBestScore('refran');
  const p = PROVERBS[round % PROVERBS.length];
  const finished = round >= PROVERBS.length;

  const choose = (o: string) => {
    if (chosen) return;
    setChosen(o);
    const ok = o === p.end;
    audioEngine.tone(ok ? 880 : 330, 0.5);
    if (ok) setScore((s) => s + 1);
  };
  const next = () => {
    const r = round + 1;
    if (r >= PROVERBS.length) record(score);
    setRound(r);
    setOptions(proverbOptions(r));
    setChosen(null);
  };
  const restart = () => {
    setRound(0);
    setScore(0);
    setOptions(proverbOptions(0));
    setChosen(null);
  };

  return (
    <Sheet title="Completa el refrán" onClose={onClose} size="full">
      {finished ? (
        <div className="proverb-end">
          <Trophy size={48} strokeWidth={1.5} />
          <p className="lead">
            Completaste {score} de {PROVERBS.length} refranes.
          </p>
          <p className="muted">Tu mejor resultado: {Math.max(best, score)}</p>
          <button className="btn btn-primary" onClick={restart}>
            <RotateCcw size={20} /> Jugar otra vez
          </button>
        </div>
      ) : (
        <div className="proverb">
          <p className="muted num">
            Refrán {round + 1} de {PROVERBS.length} · Aciertos: {score}
          </p>
          <div className="proverb-start">
            <h3>{p.start}</h3>
            <button className="icon-btn icon-btn-soft" onClick={() => audioEngine.playSpeech({ id: 'refran', title: 'Completa el refrán', subtitle: 'Juego', text: p.start.replace('…', '') })} aria-label="Escuchar el refrán">
              <Volume2 />
            </button>
          </div>
          <div className="proverb-options">
            {options.map((o) => (
              <button key={o} className={`option ${chosen ? (o === p.end ? 'is-right' : o === chosen ? 'is-wrong' : '') : ''}`} onClick={() => choose(o)} disabled={!!chosen && o !== chosen && o !== p.end}>
                …{o}
              </button>
            ))}
          </div>
          <p className="game-hint" aria-live="polite">
            {chosen ? (chosen === p.end ? '¡Correcto!' : `Era: “${p.end}”.`) : 'Elige cómo termina.'}
          </p>
          {chosen && (
            <button className="btn btn-primary" onClick={next}>
              {round + 1 >= PROVERBS.length ? 'Ver resultado' : 'Siguiente refrán'}
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
}

export function Game({ id, onClose }: { id: GameId; onClose: () => void }) {
  if (id === 'despertar') return <Awakening onClose={onClose} />;
  if (id === 'eco') return <EchoLights onClose={onClose} />;
  return <Proverbs onClose={onClose} />;
}
