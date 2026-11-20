import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { ControlDock, NavRail, TopBar } from './DeviceChrome';
import { Petals } from '../components/Brand';
import { NotificationCenter } from '../components/NotificationCenter';
import { SettingsPanel } from '../pages/SettingsPanel';
import { useAppData } from '../hooks/useAppData';
import { useUI } from '../hooks/useUI';
import { useNow } from '../hooks/useNow';
import { audioEngine } from '../services/audioEngine';
import { deriveNotifications } from '../services/notifications';

const STORAGE_MSG = {
  quota: 'No hay espacio para guardar más datos. Elimina algunas fotos o videos.',
  unavailable: 'No se pueden guardar los cambios en este navegador (¿modo privado?).',
  corrupt: 'Los datos guardados estaban dañados; se cargaron los datos de demostración.',
};

export function DeviceLayout({ children }: { children: ReactNode }) {
  const { data, storageError } = useAppData();
  const { section, sub, panel, openPanel, toasts, dismissToast, toast } = useUI();
  const now = useNow();
  const { prefs } = data;

  // Device-level preferences
  useEffect(() => audioEngine.setVolume(prefs.volume, prefs.muted), [prefs.volume, prefs.muted]);
  useEffect(() => {
    document.documentElement.dataset.text = prefs.textSize;
    document.documentElement.dataset.motion = prefs.reduceMotion ? 'reduce' : 'auto';
  }, [prefs.textSize, prefs.reduceMotion]);

  const notifications = useMemo(() => deriveNotifications(data, now), [data, now]);

  // Announce notifications that appear while the device is on (not the ones present at start-up).
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(notifications.map((n) => n.id));
      return;
    }
    const fresh = notifications.filter((n) => !seen.current!.has(n.id));
    fresh.forEach((n) => seen.current!.add(n.id));
    if (fresh.length) {
      toast(fresh[0].title);
      if (prefs.notifications.sound) audioEngine.chime();
    }
  }, [notifications, toast, prefs.notifications.sound]);

  useEffect(() => {
    if (storageError) toast(STORAGE_MSG[storageError], 'error');
  }, [storageError, toast]);

  return (
    <div className="device">
      <Petals />
      <TopBar />
      <NavRail />
      <main className="stage" key={`${section}:${sub ?? ''}`}>
        {children}
      </main>
      <ControlDock unread={notifications.length} />

      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            {t.tone === 'error' ? <CircleAlert size={22} /> : t.tone === 'ok' ? <CircleCheck size={22} /> : <Info size={22} />}
            <span>{t.text}</span>
            <button className="toast-x" onClick={() => dismissToast(t.id)} aria-label="Cerrar aviso">
              <X size={18} />
            </button>
          </div>
        ))}
      </div>

      {panel === 'notificaciones' && <NotificationCenter items={notifications} onClose={() => openPanel(null)} />}
      {panel === 'ajustes' && <SettingsPanel onClose={() => openPanel(null)} />}
    </div>
  );
}
