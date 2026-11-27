import { Bell, Heart, House, Minus, Music2, Plus, Settings, Users, Volume2, VolumeX, Pause, Play, LoaderCircle, LockKeyholeOpen } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { SectionId } from '../types';
import { SynkLogo } from '../components/Brand';
import { useUI } from '../hooks/useUI';
import { useCaregiver } from '../hooks/useCaregiver';
import { useAppData } from '../hooks/useAppData';
import { usePlayer, audioEngine } from '../hooks/usePlayer';
import { trackById } from '../data/media';
import { playQueue } from '../services/playlist';

export const SECTIONS: { id: SectionId; label: string; Icon: typeof House }[] = [
  { id: 'inicio', label: 'Inicio', Icon: House },
  { id: 'gente', label: 'Mi gente', Icon: Users },
  { id: 'mundo', label: 'Mi mundo', Icon: Music2 },
  { id: 'cuidado', label: 'Mi cuidado', Icon: Heart },
];

export function TopBar() {
  const { data, update } = useAppData();
  const { openPanel, toast } = useUI();
  const { unlocked, lock } = useCaregiver();
  const muted = data.prefs.muted;
  return (
    <header className="topbar">
      <div className="brand">
        <SynkLogo />
        <span className="brand-sep" aria-hidden="true" />
        <p className="brand-tag">En sintonía con tu bienestar</p>
      </div>
      <div className="topbar-actions">
        {unlocked && (
          <button className="pill-btn caregiver-chip" onClick={() => { lock(); toast('Modo cuidador bloqueado'); }}>
            <LockKeyholeOpen size={20} /> Modo cuidador · Bloquear
          </button>
        )}
        <button
          className="round-btn"
          aria-label={muted ? 'Activar sonido' : 'Silenciar'}
          aria-pressed={muted}
          onClick={() => {
            update((d) => ({ ...d, prefs: { ...d.prefs, muted: !d.prefs.muted } }));
            toast(muted ? 'Sonido activado' : 'Sonido silenciado');
          }}
        >
          {muted ? <VolumeX strokeWidth={1.75} /> : <Volume2 strokeWidth={1.75} />}
        </button>
        <button className="round-btn" aria-label="Configuración" onClick={() => openPanel('ajustes')}>
          <Settings strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
}

export function NavRail() {
  const { section, go } = useUI();
  return (
    <nav className="rail" aria-label="Secciones">
      <ul>
        {SECTIONS.map(({ id, label, Icon }) => (
          <li key={id}>
            <button className={`rail-item ${section === id ? 'is-active' : ''}`} aria-current={section === id ? 'page' : undefined} onClick={() => go(id)}>
              <Icon strokeWidth={section === id ? 2 : 1.6} fill={section === id && id === 'inicio' ? 'currentColor' : 'none'} />
              <span>{label}</span>
            </button>
          </li>
        ))}
      </ul>
      <span className="rail-foot" aria-hidden="true" />
    </nav>
  );
}

const STEP = 10;

export function ControlDock({ unread }: { unread: number }) {
  const { data, update } = useAppData();
  const { toast, openPanel } = useUI();
  const player = usePlayer();
  const playing = player.status === 'playing' || player.status === 'loading';
  const vol = data.prefs.muted ? 0 : data.prefs.volume;

  const setVolume = (delta: number) => {
    const next = Math.max(0, Math.min(100, data.prefs.volume + delta));
    update((d) => ({ ...d, prefs: { ...d.prefs, volume: next, muted: next === 0 ? d.prefs.muted : false } }));
    toast(next === 0 ? 'Volumen al mínimo' : `Volumen ${next} %`);
  };

  // Playback problems used to show in the corner panel: now they appear as a notice.
  const lastError = useRef<string | null>(null);
  useEffect(() => {
    if (player.status === 'error' && player.error && player.error !== lastError.current) toast(player.error, 'error');
    lastError.current = player.status === 'error' ? player.error : null;
  }, [player.status, player.error, toast]);

  const playPause = () => {
    if (player.kind !== 'none') return audioEngine.toggle();
    // Nothing loaded: play the favourites in order (like Mi playlist), or the forest sounds.
    const favs = data.favorites.filter((f) => trackById(f));
    const ids = favs.length ? favs : ['bosque'];
    playQueue(ids);
    toast(`Reproduciendo: ${trackById(ids[0])!.title}`);
  };

  return (
    <footer className="dock" aria-label="Controles">
      {/* What is playing is only announced to screen readers: the visible controls are the centre buttons. */}
      <span className="dock-side" aria-hidden="true" />
      <span className="sr-only player-status" aria-live="polite">
        {player.kind === 'none' ? '' : `${player.status === 'paused' ? 'En pausa' : 'Sonando'}: ${player.title}`}
      </span>
      <div className="dock-center">
        <button className="hw-btn" onClick={() => setVolume(-STEP)} aria-label="Bajar volumen" disabled={data.prefs.volume === 0}>
          <Minus strokeWidth={2} />
        </button>
        <button className="hw-btn hw-play" onClick={playPause} aria-label={playing ? 'Pausar' : 'Reproducir'}>
          {player.status === 'loading' ? <LoaderCircle className="spin" /> : playing ? <Pause fill="currentColor" strokeWidth={0} /> : <Play fill="currentColor" strokeWidth={0} />}
        </button>
        <button className="hw-btn" onClick={() => setVolume(STEP)} aria-label="Subir volumen" disabled={data.prefs.volume === 100}>
          <Plus strokeWidth={2} />
        </button>
        <span className="vol-meter" role="meter" aria-label="Volumen" aria-valuemin={0} aria-valuemax={100} aria-valuenow={vol}>
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} className={i < Math.round(vol / 10) ? 'on' : ''} />
          ))}
        </span>
      </div>

      <button className="hw-btn hw-bell" onClick={() => openPanel('notificaciones')} aria-label={unread ? `Notificaciones: ${unread} nuevas` : 'Notificaciones'}>
        <Bell strokeWidth={1.75} />
        {unread > 0 && <span className="badge num">{unread}</span>}
      </button>
    </footer>
  );
}
