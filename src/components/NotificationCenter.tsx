import { BellOff, CalendarClock, MessageCircleHeart, Pill, Check } from 'lucide-react';
import type { AppNotification } from '../types';
import { Sheet } from './Sheet';
import { useAppData } from '../hooks/useAppData';
import { useUI } from '../hooks/useUI';
import { pruneDismissed } from '../services/notifications';

const ICON = { mensaje: MessageCircleHeart, tratamiento: Pill, procedimiento: CalendarClock };

export function NotificationCenter({ items, onClose }: { items: AppNotification[]; onClose: () => void }) {
  const { data, update } = useAppData();
  const { go, openPanel } = useUI();

  const dismiss = (ids: string[]) => update((d) => ({ ...d, dismissedNotifications: pruneDismissed(d, new Date(), ids) }));

  const open = (n: AppNotification) => {
    dismiss([n.id]);
    if (n.kind === 'mensaje') {
      const msgId = n.id.slice(4);
      const msg = data.messages.find((m) => m.id === msgId);
      go('gente', msg ? `mensajes:${msg.contactId}` : null);
    } else {
      go('cuidado', n.kind === 'tratamiento' ? 'tratamiento' : 'procedimientos');
    }
    onClose();
  };

  return (
    <Sheet
      title="Avisos"
      onClose={onClose}
      footer={
        items.length > 0 ? (
          <button className="btn btn-ghost" onClick={() => dismiss(items.map((n) => n.id))}>
            <Check size={20} /> Marcar todas como vistas
          </button>
        ) : undefined
      }
    >
      {!data.prefs.notifications.enabled ? (
        <div className="empty">
          <BellOff size={40} strokeWidth={1.5} />
          <p>Las notificaciones están desactivadas.</p>
          <button className="btn btn-primary" onClick={() => openPanel('ajustes')}>
            Ir a configuración
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="empty">
          <Check size={40} strokeWidth={1.5} />
          <p>Todo al día. No tienes notificaciones nuevas.</p>
        </div>
      ) : (
        <ul className="notif-list">
          {items.map((n) => {
            const Icon = ICON[n.kind];
            return (
              <li key={n.id}>
                <button className="notif" onClick={() => open(n)}>
                  <span className={`notif-icon k-${n.kind}`}>
                    <Icon strokeWidth={1.75} />
                  </span>
                  <span className="notif-text">
                    <strong>{n.title}</strong>
                    <small>{n.body}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
