import { BellRing, X } from 'lucide-react';
import { Sheet } from './Sheet';
import { DemoTag } from './Media';
import { mmss } from '../services/time';

export interface ActiveCall {
  reason: string;
  at: number;
}

const REASONS = ['Tengo dolor', 'Necesito ir al baño', 'Tengo sed o hambre', 'Me siento mal', 'Otra cosa'];

/** The honest limit of this prototype, shown wherever a call is made. */
const DEMO_NOTE = 'Demostración: en este prototipo el llamado todavía no llega a la enfermería. Si necesitas ayuda ahora, usa el timbre de tu cama o pide ayuda en voz alta.';

/**
 * Call the nurse: one big button, or a reason to say why. While a call is active it shows for how long
 * and can be cancelled. Not connected to the clinic's nurse-call system yet, and it says so.
 */
export function NurseCall({ call, now, onCall, onCancel, onClose }: { call: ActiveCall | null; now: number; onCall: (reason: string) => void; onCancel: () => void; onClose: () => void }) {
  return (
    <Sheet title="Llamar a la enfermera" onClose={onClose} size="lg">
      {call ? (
        <div className="nurse-call is-active" role="status">
          <span className="nurse-bell" aria-hidden="true">
            <BellRing size={56} strokeWidth={1.6} />
          </span>
          <h3>Llamado activo</h3>
          <p className="lead num">
            {call.reason} · hace {mmss(Math.max(0, Math.floor((now - call.at) / 1000)))}
          </p>
          <p className="nurse-note">
            <DemoTag label="Demo" /> {DEMO_NOTE}
          </p>
          <button className="btn btn-ghost" onClick={onCancel}>
            <X size={20} /> Cancelar llamado
          </button>
        </div>
      ) : (
        <div className="nurse-call">
          <button className="nurse-main" onClick={() => onCall('Necesito ayuda')}>
            <BellRing size={44} strokeWidth={1.7} aria-hidden="true" />
            Llamar a la enfermera
          </button>
          <p className="muted">O cuéntale por qué la llamas:</p>
          <div className="nurse-reasons">
            {REASONS.map((r) => (
              <button key={r} className="pill-btn" onClick={() => onCall(r)}>
                {r}
              </button>
            ))}
          </div>
          <p className="nurse-note">
            <DemoTag label="Demo" /> {DEMO_NOTE}
          </p>
        </div>
      )}
    </Sheet>
  );
}
