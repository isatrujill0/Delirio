import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Flower2, Headphones, Heart, Images, Leaf, Music2, Play, Puzzle, SkipBack, SkipForward, Wind, Pause, LoaderCircle, Square, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Track } from '../types';
import { AWAKE_SCENES, LANDSCAPES, TRACKS, TRAVELS, trackById, ASSETS } from '../data/media';
import { useAppData } from '../hooks/useAppData';
import { useUI } from '../hooks/useUI';
import { usePlayer, audioEngine } from '../hooks/usePlayer';
import { playQueue, step } from '../services/playlist';
import { LandscapeArt } from '../components/Landscape';
import { Progress, Waveform } from '../components/PlayerControls';
import { MediaImage, DemoTag, Video } from '../components/Media';
import { Sheet } from '../components/Sheet';
import { Game, type GameId } from './world/Games';
import { Breathing, Meditation } from './world/Relax';

function useFavorites() {
  const { data, update } = useAppData();
  const { toast } = useUI();
  const isFav = (id: string) => data.favorites.includes(id);
  const toggleFav = (t: Track) => {
    const on = !isFav(t.id);
    update((d) => ({ ...d, favorites: on ? [...d.favorites, t.id] : d.favorites.filter((f) => f !== t.id) }));
    toast(on ? `“${t.title}” está en Mi playlist` : `“${t.title}” salió de Mi playlist`, 'ok');
  };
  const playlist = data.favorites.filter((f) => trackById(f));
  return { isFav, toggleFav, playlist };
}

function PlaylistCard() {
  const player = usePlayer();
  const { toast } = useUI();
  const { isFav, toggleFav, playlist } = useFavorites();
  const current = player.id ? trackById(player.id) : undefined;
  const playing = player.status === 'playing' || player.status === 'loading';
  const scene = LANDSCAPES[current ? Math.max(0, TRACKS.indexOf(current)) % LANDSCAPES.length : 0];

  const main = () => {
    if (current && player.status !== 'idle') return audioEngine.toggle();
    if (!playlist.length) {
      toast('Toca ♥ en una canción para agregarla a Mi playlist. Mientras, suena música suave.');
      return playQueue(TRACKS.filter((t) => t.category === 'musica').map((t) => t.id));
    }
    playQueue(playlist);
  };
  const skip = (d: 1 | -1) => {
    if (step(d)) return;
    const list = playlist.length ? playlist : TRACKS.map((t) => t.id);
    playQueue(list, d === 1 ? 0 : list.length - 1);
  };

  return (
    <article className="playlist-card">
      <div className="playlist-art">
        <LandscapeArt scene={scene} />
      </div>
      <div className="playlist-main">
        <div className="playlist-titles">
          <h2>{current ? current.title : 'Mi playlist'}</h2>
          <p className="muted">{current ? (player.status === 'error' ? player.error : current.subtitle) : `${playlist.length} favoritas · tus canciones y sonidos`}</p>
        </div>
        <div className="playlist-controls">
          <button className="icon-btn" onClick={() => skip(-1)} aria-label="Anterior">
            <SkipBack fill="currentColor" />
          </button>
          <button className="play-btn play-lg" onClick={main} aria-label={playing ? 'Pausar Mi playlist' : 'Reproducir Mi playlist'}>
            {player.status === 'loading' ? <LoaderCircle className="spin" /> : playing ? <Pause fill="currentColor" strokeWidth={0} /> : <Play fill="currentColor" strokeWidth={0} className="play-icon" />}
          </button>
          <button className="icon-btn" onClick={() => skip(1)} aria-label="Siguiente">
            <SkipForward fill="currentColor" />
          </button>
          {current ? (
            <button className={`icon-btn fav ${isFav(current.id) ? 'on' : ''}`} onClick={() => toggleFav(current)} aria-pressed={isFav(current.id)} aria-label={isFav(current.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}>
              <Heart fill={isFav(current.id) ? 'currentColor' : 'none'} />
            </button>
          ) : (
            <span className="icon-btn" aria-hidden="true" />
          )}
          {current && player.status !== 'idle' && (
            <button className="icon-btn" onClick={() => audioEngine.stop()} aria-label="Detener">
              <Square size={22} fill="currentColor" strokeWidth={0} />
            </button>
          )}
        </div>
        {current && player.status !== 'idle' && <Progress state={player} />}
      </div>
    </article>
  );
}

function TrackRow({ t }: { t: Track }) {
  const player = usePlayer();
  const { isFav, toggleFav } = useFavorites();
  const isThis = player.id === t.id && player.status !== 'idle';
  const playing = isThis && (player.status === 'playing' || player.status === 'loading');
  const list = TRACKS.filter((x) => x.category === t.category).map((x) => x.id);
  return (
    <li className={`track ${isThis ? 'is-current' : ''}`}>
      <button className="track-main" onClick={() => (isThis ? audioEngine.toggle() : playQueue(list, list.indexOf(t.id)))} aria-label={playing ? `Pausar ${t.title}` : `Reproducir ${t.title}`}>
        <span className="track-play">{playing ? <Pause fill="currentColor" strokeWidth={0} /> : <Play fill="currentColor" strokeWidth={0} />}</span>
        <span className="track-text">
          <strong>{t.title}</strong>
          <small>{t.subtitle}{t.loop ? ' · se repite' : ''}</small>
        </span>
        {isThis && <Waveform active={playing} bars={10} />}
      </button>
      <button className={`icon-btn fav ${isFav(t.id) ? 'on' : ''}`} onClick={() => toggleFav(t)} aria-pressed={isFav(t.id)} aria-label={isFav(t.id) ? `Quitar ${t.title} de favoritos` : `Agregar ${t.title} a favoritos`}>
        <Heart fill={isFav(t.id) ? 'currentColor' : 'none'} />
      </button>
    </li>
  );
}

/** Full-screen slideshow of the family's trip photos, with optional calm music. */
function TravelViewer({ start, onClose }: { start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const [auto, setAuto] = useState(true);
  const photo = TRAVELS[i];
  useEffect(() => {
    if (!auto) return;
    const t = window.setTimeout(() => setI((x) => (x + 1) % TRAVELS.length), 9000);
    return () => window.clearTimeout(t);
  }, [auto, i]);
  const music = trackById('amanecer-sereno')!;
  const player = usePlayer();
  return (
    <Sheet title={photo.title} onClose={onClose} size="full" bare>
      <div className="viewer">
        <img className="viewer-img kenburns" src={photo.src} alt={`${photo.title}, ${photo.place}`} key={photo.id} draggable={false} />
        <div className="viewer-bar">
          <button className="round-btn" onClick={() => setI((i - 1 + TRAVELS.length) % TRAVELS.length)} aria-label="Recuerdo anterior">
            <ChevronLeft />
          </button>
          <p>
            <strong>{photo.title}</strong> <span className="muted">· {photo.place} · <span className="num">{i + 1} de {TRAVELS.length}</span></span>
          </p>
          <button className="round-btn" onClick={() => setI((i + 1) % TRAVELS.length)} aria-label="Recuerdo siguiente">
            <ChevronRight />
          </button>
          <button className="pill-btn" onClick={() => setAuto((a) => !a)} aria-pressed={auto}>
            {auto ? 'Pausar pase' : 'Pase automático'}
          </button>
          <button className="pill-btn" onClick={() => (player.id === music.id && player.status !== 'idle' ? audioEngine.toggle() : audioEngine.playMedia({ id: music.id, title: music.title, subtitle: music.subtitle, src: music.src }))}>
            {player.id === music.id && player.status === 'playing' ? <Pause size={18} /> : <Play size={18} />} Música: {music.title}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function Memories() {
  const { data } = useAppData();
  const [i, setI] = useState<number | null>(null);
  const [video, setVideo] = useState(false);
  const photos = data.photos;
  const [travel, setTravel] = useState<number | null>(null);
  return (
    <>
      <h2 className="list-title">Viajes</h2>
      <ul className="landscape-grid">
        {TRAVELS.map((t, k) => (
          <li key={t.id}>
            <button className="landscape-card" onClick={() => setTravel(k)}>
              <img src={t.src} alt="" loading="lazy" decoding="async" draggable={false} />
              <span className="memory-caption">
                <strong>{t.title}</strong>
                <small>{t.place}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <h2 className="list-title">En familia</h2>
      <ul className="memory-grid">
        <li>
          <button className="memory memory-video" onClick={() => { audioEngine.stop(); setVideo(true); }}>
            <MediaImage src="asset:familia" alt="" />
            <span className="memory-caption"><Play size={18} fill="currentColor" /> Video: Recuerdos en familia</span>
            <DemoTag />
          </button>
        </li>
        {photos.map((p, k) => (
          <li key={p.id}>
            <button className="memory" onClick={() => setI(k)}>
              <MediaImage src={p.src} alt={p.caption || 'Recuerdo'} />
              {p.caption && <span className="memory-caption">{p.caption}</span>}
            </button>
          </li>
        ))}
      </ul>
      {i !== null && photos[i] && (
        <Sheet title={photos[i].caption || 'Recuerdo'} onClose={() => setI(null)} size="full" bare>
          <div className="viewer">
            <MediaImage src={photos[i].src} alt={photos[i].caption || 'Recuerdo'} className="viewer-img kenburns" key={photos[i].id} />
            <div className="viewer-bar">
              <button className="round-btn" onClick={() => setI((i - 1 + photos.length) % photos.length)} aria-label="Anterior"><ChevronLeft /></button>
              <p>{photos[i].caption || 'Recuerdo'} <span className="muted num">· {i + 1} de {photos.length}</span></p>
              <button className="round-btn" onClick={() => setI((i + 1) % photos.length)} aria-label="Siguiente"><ChevronRight /></button>
            </div>
          </div>
        </Sheet>
      )}
      {travel !== null && <TravelViewer start={travel} onClose={() => setTravel(null)} />}
      {video && (
        <Sheet title="Recuerdos en familia" onClose={() => setVideo(false)} size="lg">
          <Video className="msg-video" src={ASSETS['video-recuerdos']} controls playsInline autoPlay preload="metadata" />
          <p className="fine-print">Video de demostración creado con la foto de ejemplo y música original de NEXO.</p>
        </Sheet>
      )}
    </>
  );
}

const SUBTITLES: Record<string, string> = {
  playlist: 'Mi playlist',
  musica: 'Música suave',
  naturaleza: 'Sonidos de naturaleza',
  recuerdos: 'Recuerdos',
};

export function WorldPage() {
  const { sub, go } = useUI();
  const { playlist } = useFavorites();
  const [game, setGame] = useState<GameId | null>(null);
  const [relax, setRelax] = useState<'respirar' | 'meditar' | null>(null);

  if (sub && SUBTITLES[sub]) {
    const tracks = sub === 'playlist' ? playlist.map((id) => trackById(id)!) : TRACKS.filter((t) => t.category === sub);
    return (
      <div className="page subpage">
        <header className="sub-head">
          <button className="pill-btn" onClick={() => go('mundo')}>
            <ArrowLeft size={20} /> Mi mundo
          </button>
          <h1>{SUBTITLES[sub]}</h1>
        </header>
        <div className="sub-body scroll">
          {sub === 'recuerdos' ? (
            <Memories />
          ) : tracks.length === 0 ? (
            <div className="empty">
              <Heart size={40} strokeWidth={1.5} />
              <p>Tu playlist está vacía. Toca ♥ en una canción o sonido para agregarlo.</p>
              <button className="btn btn-primary" onClick={() => go('mundo', 'musica')}>
                Ver música suave
              </button>
            </div>
          ) : (
            <ul className="track-list">
              {tracks.map((t) => (
                <TrackRow key={t.id} t={t} />
              ))}
            </ul>
          )}
          {sub !== 'recuerdos' && <p className="fine-print">Piezas originales de NEXO, compuestas y sintetizadas para este dispositivo. Los sonidos de naturaleza se repiten hasta que los detengas.</p>}
        </div>
      </div>
    );
  }

  const startList = (ids: string[]) => playQueue(ids);

  return (
    <div className="page world">
      <header className="section-head world-head">
        <Music2 className="section-icon" strokeWidth={1.4} />
        <div>
          <h1>Mi mundo</h1>
          <p className="section-sub accent">Relájate, disfruta y mantén tu mente activa.</p>
          <div className="quick-row">
            <button className="chip" onClick={() => go('mundo', 'recuerdos')}>
              <Images strokeWidth={1.75} /> <span>Recuerdos</span>
            </button>
          </div>
        </div>
      </header>
      <PlaylistCard />

      <section className="world-col">
        <button className="col-head" onClick={() => go('mundo', 'musica')}>
          <Headphones strokeWidth={1.4} className="col-icon" />
          <span>
            <h2>Música</h2>
            <small>Escucha tus canciones y sonidos favoritos.</small>
          </span>
          <ArrowRight className="col-arrow" />
        </button>
        <ul className="col-list">
          <ColItem art={<LandscapeArt scene={LANDSCAPES[0]} />} label="Mi playlist" onOpen={() => go('mundo', 'playlist')} onPlay={() => startList(playlist.length ? playlist : TRACKS.map((t) => t.id))} />
          <ColItem art={<LandscapeArt scene={LANDSCAPES[3]} />} label="Música suave" onOpen={() => go('mundo', 'musica')} onPlay={() => startList(TRACKS.filter((t) => t.category === 'musica').map((t) => t.id))} />
          <ColItem art={<LandscapeArt scene={LANDSCAPES[2]} />} label="Sonidos de naturaleza" onOpen={() => go('mundo', 'naturaleza')} onPlay={() => startList(TRACKS.filter((t) => t.category === 'naturaleza').map((t) => t.id))} />
        </ul>
      </section>

      <section className="world-col">
        <div className="col-head">
          <Puzzle strokeWidth={1.4} className="col-icon" />
          <span>
            <h2>Juegos cognitivos</h2>
            <small>Atención, memoria y lenguaje con actividades sencillas.</small>
          </span>
        </div>
        <ul className="col-list">
          <ColItem art={<img src={AWAKE_SCENES[0].src} alt="" />} label="El despertar del paisaje" effort="Muy bajo" level={0} onOpen={() => setGame('despertar')} />
          <ColItem art={<span className="art-lights" />} label="Eco de luces" effort="Medio" level={1} onOpen={() => setGame('eco')} />
          <ColItem art={<span className="art-quote">“ ”</span>} label="Completa el refrán" effort="Avanzado" level={2} onOpen={() => setGame('refran')} />
        </ul>
      </section>

      <section className="world-col">
        <div className="col-head">
          <Flower2 strokeWidth={1.4} className="col-icon" />
          <span>
            <h2>Relajación</h2>
            <small>Encuentra calma, respira y suelta la tensión.</small>
          </span>
        </div>
        <ul className="col-list">
          <ColItem icon={<Wind strokeWidth={1.5} />} label="Respiración guiada" onOpen={() => setRelax('respirar')} />
          <ColItem icon={<Flower2 strokeWidth={1.5} />} label="Meditación" onOpen={() => setRelax('meditar')} />
          <ColItem icon={<Leaf strokeWidth={1.5} />} label="Sonidos relajantes" onOpen={() => go('mundo', 'naturaleza')} onPlay={() => startList(['lluvia', 'mar', 'bosque'])} />
        </ul>
      </section>

      {game && <Game id={game} onClose={() => setGame(null)} />}
      {relax === 'respirar' && <Breathing onClose={() => setRelax(null)} />}
      {relax === 'meditar' && <Meditation onClose={() => setRelax(null)} />}
    </div>
  );
}

const EFFORT_CLS = ['effort-low', 'effort-mid', 'effort-high'];

function ColItem({ art, icon, label, effort, level = 0, onOpen, onPlay }: { art?: React.ReactNode; icon?: React.ReactNode; label: string; effort?: string; level?: number; onOpen: () => void; onPlay?: () => void }) {
  return (
    <li className="col-item">
      <button className="col-item-main" onClick={onOpen}>
        {art ? <span className="col-art">{art}</span> : <span className="col-item-icon">{icon}</span>}
        <span className="col-item-text">
          <strong>{label}</strong>
          {effort && <small className={`effort ${EFFORT_CLS[level]}`}>Esfuerzo: {effort}</small>}
        </span>
      </button>
      <button className="mini-play" onClick={onPlay ?? onOpen} aria-label={onPlay ? `Escuchar ${label}` : `Abrir ${label}`}>
        <Play fill="currentColor" strokeWidth={0} />
      </button>
    </li>
  );
}
