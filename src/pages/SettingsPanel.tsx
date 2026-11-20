import { useState } from 'react';
import { RotateCcw, Volume1, Volume2 } from 'lucide-react';
import type { Preferences, TextSize } from '../types';
import { Sheet, Confirm } from '../components/Sheet';
import { Field, Segmented, Toggle } from '../components/Form';
import { useAppData } from '../hooks/useAppData';
import { useUI } from '../hooks/useUI';
import { audioEngine } from '../services/audioEngine';
import { NexoLogo } from '../components/Brand';

type Tab = 'general' | 'sonido' | 'avisos' | 'contenido' | 'acerca';

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { data, update, resetDemo } = useAppData();
  const { toast } = useUI();
  const [tab, setTab] = useState<Tab>('general');
  const [name, setName] = useState(data.userName);
  const [nameError, setNameError] = useState('');
  const [place, setPlace] = useState(data.location);
  const [weather, setWeather] = useState({ city: data.weather.city, tempC: String(data.weather.tempC), condition: data.weather.condition });
  const [weatherError, setWeatherError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const setPrefs = (p: Partial<Preferences>) => update((d) => ({ ...d, prefs: { ...d.prefs, ...p } }));
  const setNotif = (k: keyof Preferences['notifications'], v: boolean) => update((d) => ({ ...d, prefs: { ...d.prefs, notifications: { ...d.prefs.notifications, [k]: v } } }));
  const n = data.prefs.notifications;

  const saveName = () => {
    const v = name.trim();
    if (!v) return setNameError('Escribe un nombre para el saludo.');
    if (v.length > 30) return setNameError('Usa un nombre corto (máximo 30 letras).');
    setNameError('');
    update((d) => ({ ...d, userName: v }));
    toast(`Listo. Ahora te saludaremos como ${v}.`, 'ok');
  };

  const saveContent = () => {
    const temp = Number(weather.tempC);
    if (!weather.city.trim() || !Number.isFinite(temp) || temp < -40 || temp > 60) return setWeatherError('Revisa la ciudad y una temperatura entre -40 y 60 °C.');
    if (!place.trim()) return setWeatherError('Escribe dónde está la persona.');
    setWeatherError('');
    update((d) => ({ ...d, location: place.trim(), weather: { city: weather.city.trim(), tempC: Math.round(temp), condition: weather.condition.trim() || 'Despejado' } }));
    toast('Información guardada', 'ok');
  };

  return (
    <Sheet title="Configuración" onClose={onClose} size="lg">
      <Segmented<Tab>
        label="Sección de configuración"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'general', label: 'General' },
          { value: 'sonido', label: 'Sonido' },
          { value: 'avisos', label: 'Notificaciones' },
          { value: 'contenido', label: 'Contenido' },
          { value: 'acerca', label: 'Acerca de' },
        ]}
      />

      {tab === 'general' && (
        <div className="settings-group">
          <Field label="Tu nombre" error={nameError} hint="Aparece en el saludo de Inicio.">
            {(id, by) => (
              <div className="inline-field">
                <input id={id} aria-describedby={by} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} enterKeyHint="done" onKeyDown={(e) => e.key === 'Enter' && saveName()} />
                <button className="btn btn-primary" onClick={saveName}>Guardar</button>
              </div>
            )}
          </Field>
          <div className="field">
            <span className="field-label">Tamaño del texto</span>
            <Segmented<TextSize>
              label="Tamaño del texto"
              value={data.prefs.textSize}
              onChange={(v) => setPrefs({ textSize: v })}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'grande', label: 'Grande' },
                { value: 'muy-grande', label: 'Muy grande' },
              ]}
            />
          </div>
          <Toggle label="Reducir movimiento" hint="Quita animaciones y efectos de movimiento." checked={data.prefs.reduceMotion} onChange={(v) => setPrefs({ reduceMotion: v })} />
        </div>
      )}

      {tab === 'sonido' && (
        <div className="settings-group">
          <div className="field">
            <label htmlFor="vol" className="field-label">
              Volumen: <span className="num">{data.prefs.volume} %</span>
            </label>
            <div className="volume-row">
              <Volume1 aria-hidden="true" />
              <input id="vol" type="range" min={0} max={100} step={5} value={data.prefs.volume} onChange={(e) => setPrefs({ volume: Number(e.target.value), muted: false })} className="progress-range" style={{ ['--pct' as string]: `${data.prefs.volume}%` }} />
              <Volume2 aria-hidden="true" />
            </div>
          </div>
          <Toggle label="Silenciar todo" checked={data.prefs.muted} onChange={(v) => setPrefs({ muted: v })} />
          <button className="btn btn-ghost" onClick={() => audioEngine.chime()}>
            Probar sonido
          </button>
          <p className="fine-print">En iPad, el volumen general también depende de los botones físicos del dispositivo.</p>
        </div>
      )}

      {tab === 'avisos' && (
        <div className="settings-group">
          <Toggle label="Notificaciones" hint="Avisos dentro de NEXO (campana de la barra inferior)." checked={n.enabled} onChange={(v) => setNotif('enabled', v)} />
          <div className={n.enabled ? '' : 'is-disabled'} aria-disabled={!n.enabled}>
            <Toggle label="Mensajes nuevos de la familia" checked={n.messages} onChange={(v) => n.enabled && setNotif('messages', v)} />
            <Toggle label="Recordatorios de tratamiento" hint="Una hora antes de cada toma registrada." checked={n.treatments} onChange={(v) => n.enabled && setNotif('treatments', v)} />
            <Toggle label="Procedimientos del día" hint="Desde 24 horas antes." checked={n.procedures} onChange={(v) => n.enabled && setNotif('procedures', v)} />
            <Toggle label="Sonido de aviso" checked={n.sound} onChange={(v) => n.enabled && setNotif('sound', v)} />
          </div>
          <button className="btn btn-ghost" onClick={() => update((d) => ({ ...d, dismissedNotifications: [] }))}>
            Volver a mostrar avisos descartados
          </button>
        </div>
      )}

      {tab === 'contenido' && (
        <div className="settings-group">
          <Field label="Dónde está (texto de Inicio)">
            {(id) => <input id={id} value={place} onChange={(e) => setPlace(e.target.value)} maxLength={80} />}
          </Field>
          <p className="field-label">Clima de ejemplo</p>
          <p className="fine-print">NEXO no se conecta a un servicio de clima. Este dato se muestra marcado como “Ejemplo”.</p>
          <div className="form-row three">
            <Field label="Ciudad">{(id) => <input id={id} value={weather.city} onChange={(e) => setWeather({ ...weather, city: e.target.value })} maxLength={30} />}</Field>
            <Field label="Temperatura °C">{(id) => <input id={id} value={weather.tempC} inputMode="numeric" onChange={(e) => setWeather({ ...weather, tempC: e.target.value })} maxLength={4} />}</Field>
            <Field label="Estado">{(id) => <input id={id} value={weather.condition} onChange={(e) => setWeather({ ...weather, condition: e.target.value })} maxLength={30} />}</Field>
          </div>
          {weatherError && <p className="field-error" role="alert">{weatherError}</p>}
          <button className="btn btn-primary" onClick={saveContent}>Guardar información</button>
          <hr className="sep" />
          <button className="btn btn-ghost btn-danger-text" onClick={() => setConfirmReset(true)}>
            <RotateCcw size={20} /> Restablecer datos de demostración
          </button>
        </div>
      )}

      {tab === 'acerca' && (
        <div className="settings-group about">
          <NexoLogo size="lg" />
          <p className="lead">Orientación que conecta, tecnología que acompaña.</p>
          <p>Versión 1.0.0 · Diseñado para iPad Air de 11 pulgadas en horizontal.</p>
          <ul className="about-list">
            <li>Los datos se guardan solo en este dispositivo (LocalStorage; fotos, audios y videos en IndexedDB).</li>
            <li>Las personas, mensajes, tratamientos y procedimientos iniciales son de demostración.</li>
            <li>El clima es un dato de ejemplo; no hay conexión con un servicio meteorológico.</li>
            <li>Los mensajes de demostración se leen con la voz del sistema; no son grabaciones reales.</li>
            <li>La música y los sonidos son piezas originales sintetizadas para NEXO.</li>
            <li>Mi cuidado es informativo y no reemplaza las indicaciones del equipo de salud.</li>
          </ul>
        </div>
      )}

      {confirmReset && (
        <Confirm
          title="¿Restablecer los datos?"
          message="Se borrarán los contactos, mensajes, fotos, tratamientos y preferencias guardados en este dispositivo y se cargarán los datos de demostración."
          confirmLabel="Restablecer"
          danger
          onCancel={() => setConfirmReset(false)}
          onConfirm={async () => {
            audioEngine.stop();
            await resetDemo();
            setConfirmReset(false);
            onClose();
            toast('Datos de demostración restablecidos', 'ok');
          }}
        />
      )}
    </Sheet>
  );
}
