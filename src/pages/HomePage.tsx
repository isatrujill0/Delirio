import { useState } from 'react';
import { ArrowRight, Heart, MapPin, MoreHorizontal, Music2, CalendarClock, Pill } from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { useUI } from '../hooks/useUI';
import { useNow } from '../hooks/useNow';
import { clock, longDate, partOfDay, timeAgo, mmss, hmToLabel, relativeDay } from '../services/time';
import { nextDose, orderProcedures } from '../services/care';
import { MediaImage, DemoTag } from '../components/Media';
import { PlayButton, StopButton, Waveform } from '../components/PlayerControls';
import { MessageViewer, messageDuration, useMessageControl } from '../components/MessageViewer';
import { Sheet } from '../components/Sheet';
import { WeatherArt } from '../components/WeatherArt';

const GREETING = { madrugada: 'Hola', mañana: 'Buenos días', tarde: 'Buenas tardes', noche: 'Buenas noches' } as const;

function Greeting() {
  const { data } = useAppData();
  const now = useNow();
  const { weekday, day } = longDate(now);
  const { time, period } = clock(now);
  return (
    <section className="home-hello" aria-label="Saludo, fecha y hora">
      <h1 className="hello">
        {GREETING[partOfDay(now.getHours())]},{data.userName && <span className="hello-name"> {data.userName}</span>}
      </h1>
      <p className="hello-date">
        hoy es {weekday},<br />
        {day}.
      </p>
      <p className="clock num" aria-live="off">
        <time dateTime={now.toISOString()}>{time}</time>
        <span className="clock-period">{period}</span>
      </p>
    </section>
  );
}

function NextUp() {
  const { data } = useAppData();
  const { go } = useUI();
  const now = useNow();
  const dose = nextDose(data.treatments, now);
  const proc = orderProcedures(data.procedures).pending.find((p) => new Date(p.date).getTime() >= now.getTime());
  return (
    <div className="quick-row">
      {proc && (
        <button className="chip" onClick={() => go('cuidado', 'procedimientos')}>
          <CalendarClock strokeWidth={1.75} />
          <span>
            <small>Próximo</small>
            {proc.name} · {relativeDay(new Date(proc.date), now).toLowerCase()} {hmToLabel(proc.date.slice(11, 16))}
          </span>
        </button>
      )}
      {dose && !proc && (
        <button className="chip" onClick={() => go('cuidado', 'tratamiento')}>
          <Pill strokeWidth={1.75} />
          <span>
            <small>Tratamiento</small>
            {dose.treatment.name} · {hmToLabel(dose.time)}
          </span>
        </button>
      )}
      <button className="chip" onClick={() => go('mundo')}>
        <Music2 strokeWidth={1.75} />
        <span>
          <small>Mi mundo</small>
          Escuchar algo tranquilo
        </span>
      </button>
    </div>
  );
}

function FamilyCard() {
  const { data } = useAppData();
  const { go, toast } = useUI();
  const [open, setOpen] = useState(false);
  const latest = [...data.messages].filter((m) => m.kind !== 'video').sort((a, b) => b.createdAt - a.createdAt)[0];
  const contact = data.contacts.find((c) => c.id === latest?.contactId);
  const from = contact?.name ?? 'Tu familia';
  const { player, isThis, playing, toggle } = useMessageControl(latest, from, (m) => toast(m, 'error'));
  const cover = data.photos[0]?.src;
  const unread = data.messages.filter((m) => !m.read).length;

  return (
    <article className={`family-card ${playing ? 'is-playing' : ''}`}>
      <MediaImage src={cover} alt="Foto de tu familia" className="family-photo" />
      <button className="pill-btn family-more" onClick={() => go('gente', 'mensajes')}>
        Ver mensajes{unread > 0 && <span className="badge-inline num">{unread}</span>} <ArrowRight size={20} />
      </button>
      {latest ? (
        <div className="family-bar">
          <PlayButton playing={playing} loading={isThis && player.status === 'loading'} onClick={toggle} label={`mensaje de ${from}`} size="lg" />
          <Waveform active={playing} />
          <div className="family-bar-text">
            <strong>Mensaje de tu familia</strong>
            <small className="num">
              {from} · {timeAgo(latest.createdAt, Date.now())} · {isThis && player.status !== 'idle' ? `${mmss(player.position)} / ${mmss(player.duration)}` : mmss(messageDuration(latest))}
            </small>
          </div>
          {isThis && player.status !== 'idle' ? (
            <StopButton label="mensaje" />
          ) : (
            <button className="icon-btn icon-btn-soft" onClick={() => setOpen(true)} aria-label="Ver el mensaje completo">
              <MoreHorizontal />
            </button>
          )}
        </div>
      ) : (
        <div className="family-bar">
          <div className="family-bar-text">
            <strong>Aún no hay mensajes</strong>
            <small>Tu familia puede dejarte mensajes en Mi gente.</small>
          </div>
        </div>
      )}
      {latest?.demo && <DemoTag />}
      {open && latest && <MessageViewer message={latest} contact={contact} onClose={() => setOpen(false)} onError={(m) => toast(m, 'error')} />}
    </article>
  );
}

export function HomePage() {
  const { data } = useAppData();
  const { go, openPanel } = useUI();
  const [info, setInfo] = useState<'lugar' | 'clima' | null>(null);
  const w = data.weather;

  return (
    <div className="page home">
      <div className="home-left">
        <Greeting />
        <NextUp />
      </div>
      <FamilyCard />
      <div className="home-tiles">
        <button className="tile" onClick={() => setInfo('lugar')}>
          <MapPin strokeWidth={1.6} className="tile-icon" />
          <span>{data.location}</span>
        </button>
        <button className="tile" onClick={() => go('cuidado')}>
          <Heart strokeWidth={1.6} className="tile-icon" />
          <span>Estás recibiendo atención y cuidado.</span>
          <span className="pulse-dot" aria-hidden="true" />
        </button>
        <button className="tile tile-weather" onClick={() => setInfo('clima')} aria-label={`Clima de ejemplo: ${w.city}, ${w.tempC} grados, ${w.condition}`}>
          <WeatherArt condition={w.condition} />
          <span className="weather-text">
            <strong>{w.city}</strong>
            <span className="weather-temp num">
              {w.tempC}
              <small>°C</small>
            </span>
            <small>{w.condition}</small>
          </span>
          <DemoTag label="Ejemplo" />
        </button>
      </div>

      {info === 'lugar' && (
        <Sheet title="Dónde estás" onClose={() => setInfo(null)}>
          <div className="info-sheet">
            <MapPin size={44} strokeWidth={1.5} />
            <p className="lead">{data.location}</p>
            <p>Estás en una unidad de cuidados donde un equipo de salud te acompaña día y noche. Si te sientes confundido, puedes volver a esta pantalla en cualquier momento.</p>
            <button className="btn btn-ghost" onClick={() => { setInfo(null); openPanel('ajustes'); }}>
              Cambiar este texto en Configuración
            </button>
          </div>
        </Sheet>
      )}
      {info === 'clima' && (
        <Sheet title="Clima" onClose={() => setInfo(null)}>
          <div className="info-sheet">
            <WeatherArt condition={w.condition} />
            <p className="lead">
              {w.city}: {w.tempC} °C, {w.condition.toLowerCase()}.
            </p>
            <p>
              <strong>Este es un dato de ejemplo, no un pronóstico real.</strong> NEXO no está conectado a un servicio meteorológico. Tu familia puede actualizarlo desde Configuración.
            </p>
            <button className="btn btn-ghost" onClick={() => { setInfo(null); openPanel('ajustes'); }}>
              Editar el clima
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
