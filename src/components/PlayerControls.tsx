import { Pause, Play, Square, LoaderCircle } from 'lucide-react';
import type { PlayerState } from '../services/audioEngine';
import { audioEngine } from '../services/audioEngine';
import { mmss } from '../services/time';

/** Bars that breathe while audio plays and rest otherwise. */
export function Waveform({ active, bars = 14 }: { active: boolean; bars?: number }) {
  return (
    <span className={`wave-bars ${active ? 'is-active' : ''}`} aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => (
        <i key={i} style={{ ['--h' as string]: `${30 + ((i * 37) % 70)}%`, ['--d' as string]: `${(i % 5) * 0.11}s` }} />
      ))}
    </span>
  );
}

export function PlayButton({ playing, loading, onClick, label, size = 'md' }: { playing: boolean; loading?: boolean; onClick: () => void; label: string; size?: 'md' | 'lg' }) {
  return (
    <button className={`play-btn play-${size}`} onClick={onClick} aria-label={playing ? `Pausar ${label}` : `Reproducir ${label}`} aria-pressed={playing}>
      {loading ? <LoaderCircle className="spin" strokeWidth={2} /> : playing ? <Pause fill="currentColor" strokeWidth={0} /> : <Play fill="currentColor" strokeWidth={0} className="play-icon" />}
    </button>
  );
}

export function StopButton({ label }: { label: string }) {
  return (
    <button className="icon-btn" onClick={() => audioEngine.stop()} aria-label={`Detener ${label}`}>
      <Square size={22} fill="currentColor" strokeWidth={0} />
    </button>
  );
}

/** Seekable progress for the shared player (seek works for recorded media, not for text read aloud). */
export function Progress({ state }: { state: PlayerState }) {
  const pct = state.duration > 0 ? Math.min(100, (state.position / state.duration) * 100) : 0;
  const seekable = state.kind === 'media' && state.duration > 0;
  return (
    <div className="progress">
      <span className="num progress-time">{mmss(state.position)}</span>
      <input
        type="range"
        className="progress-range"
        min={0}
        max={Math.max(1, Math.round(state.duration))}
        step={1}
        value={Math.round(state.position)}
        disabled={!seekable}
        onChange={(e) => audioEngine.seek(Number(e.target.value))}
        aria-label="Progreso"
        aria-valuetext={`${mmss(state.position)} de ${mmss(state.duration)}`}
        style={{ ['--pct' as string]: `${pct}%` }}
      />
      <span className="num progress-time">{state.duration ? mmss(state.duration) : '–:––'}</span>
    </div>
  );
}
