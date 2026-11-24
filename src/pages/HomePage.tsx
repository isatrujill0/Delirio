import { useState } from 'react';
import { Heart, MapPin, MessageCircle, CalendarClock, Pill } from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { useUI } from '../hooks/useUI';
import { useNow } from '../hooks/useNow';
import { clock, longDate, partOfDay, hmToLabel, relativeDay } from '../services/time';
import { nextDose, orderProcedures } from '../services/care';
import { MediaImage, DemoTag } from '../components/Media';
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
            <small>Próximo{proc.demo && ' · ejemplo'}</small>
            {proc.name} · {relativeDay(new Date(proc.date), now).toLowerCase()} {hmToLabel(proc.date.slice(11, 16))}
          </span>
        </button>
      )}
      {dose && !proc && (
        <button className="chip" onClick={() => go('cuidado', 'tratamiento')}>
          <Pill strokeWidth={1.75} />
          <span>
            <small>Tratamiento{dose.treatments.some((t) => t.demo) && ' · ejemplo'}</small>
            {dose.treatments.map((t) => t.name).join(' y ')} · {hmToLabel(dose.time)}
          </span>
        </button>
      )}
    </div>
  );
}

function FamilyCard() {
  const { data } = useAppData();
  const cover = data.photos[0]?.src;
  // A notice only: the card is not tappable. Messages are opened from Mi gente.
  const unread = data.messages.filter((m) => !m.read && m.from !== 'paciente').sort((x, y) => y.createdAt - x.createdAt);
  const names = [...new Set(unread.map((m) => data.contacts.find((c) => c.id === m.contactId)?.name).filter(Boolean))] as string[];
  const notice =
    unread.length === 0 ? null : names.length === 1 ? `${unread.length === 1 ? 'Mensaje nuevo' : `${unread.length} mensajes nuevos`} de ${names[0]}` : `Mensajes nuevos de ${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
  return (
    <div className="home-right">
      <article className="family-card" aria-label="Tu familia">
        <MediaImage src={cover} alt="Foto de tu familia" className="family-photo" />
        <span className="family-label">
          <Heart size={16} strokeWidth={2} aria-hidden="true" /> Tu familia
        </span>
      </article>
      {notice && (
        <p className="family-notice glass">
          <span className="family-notice-icon" aria-hidden="true">
            <MessageCircle size={24} strokeWidth={1.8} />
          </span>
          <span>
            <strong>{notice}</strong>
            <small>Ábrelos en Mi gente</small>
          </span>
        </p>
      )}
    </div>
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
