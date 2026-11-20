import { Bell, Heart, House, Minus, Music2, Plus, Settings, Users, Volume2, VolumeX, Pause, Play, LoaderCircle } from 'lucide-react';
import type { SectionId } from '../types';
import { NexoLogo } from '../components/Brand';
import { useUI } from '../hooks/useUI';
import { useAppData } from '../hooks/useAppData';
import { usePlayer, audioEngine } from '../hooks/usePlayer';
import { TRACKS, trackById } from '../data/media';

export const SECTIONS: { id: SectionId; label: string; Icon: typeof House }[] = [
  { id: 'inicio', label: 'Inicio', Icon: House },
  { id: 'gente', label: 'Mi gente', Icon: Users },
  { id: 'mundo', label: 'Mi mundo', Icon: Music2 },
  { id: 'cuidado', label: 'Mi cuidado', Icon: Heart },
];

export function TopBar() {
  const { data, update } = useAppData();
  const { openPanel, toast } = useUI();
  const muted = data.prefs.muted;
  return (
    <header className="topbar">
      <div className="brand">
        <NexoLogo />
        <span className="brand-sep" aria-hidden="true" />
        <p className="brand-tag">
          Orientación que conecta,
          <br />
          tecnología que acompaña.
        </p>
      </div>
      <div className="topbar-actions">
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
  const { toast, openPanel, go } = useUI();
  const player = usePlayer();
  const playing = player.status === 'playing' || player.status === 'loading';
  const vol = data.prefs.muted ? 0 : data.prefs.volume;

  const setVolume = (delta: number) => {
    const next = Math.max(0, Math.min(100, data.prefs.volume + delta));
    update((d) => ({ ...d, prefs: { ...d.prefs, volume: next, muted: next === 0 ? d.prefs.muted : false } }));
    toast(next === 0 ? 'Volumen al mínimo' : `Volumen ${next} %`);
  };

  const playPause = () => {
    if (player.kind !== 'none') return audioEngine.toggle();
    // Nothing loaded: start the first favourite, or the forest sounds.
    const t = trackById(data.favorites.find((f) => trackById(f)) ?? '') ?? TRACKS.find((x) => x.id === 'bosque')!;
    audioEngine.playMedia({ id: t.id, title: t.title, subtitle: t.subtitle, src: t.src, loop: t.loop });
    toast(`Reproduciendo: ${t.title}`);
  };

  return (
    <footer className="dock" aria-label="Controles">
      <button className="dock-now" onClick={() => go('mundo')} aria-label={player.kind === 'none' ? 'Abrir Mi mundo' : `Sonando: ${player.title}. Abrir Mi mundo`}>
        <span className={`dock-now-dot ${playing ? 'on' : ''}`} aria-hidden="true" />
        <span className="dock-now-text">
          <strong>{player.kind === 'none' ? 'Nada sonando' : player.title}</strong>
          <small>{player.kind === 'none' ? 'Toca ▶ para escuchar algo tranquilo' : player.status === 'paused' ? 'En pausa' : player.status === 'error' ? player.error : player.subtitle}</small>
        </span>
      </button>

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
