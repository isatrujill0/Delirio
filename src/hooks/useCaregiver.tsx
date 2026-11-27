import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { LockKeyhole } from 'lucide-react';
import { Sheet } from '../components/Sheet';
import { Field } from '../components/Form';
import { useAppData } from './useAppData';
import { DEMO_PIN } from '../data/demo';

/**
 * The demo PIN is printed in the prompt only in the preview build (and in development), where people
 * explore SYNK. On the installed device it would be shown to the patient; there it is documented in the README.
 */
const SHOW_DEMO_PIN = import.meta.env.DEV || import.meta.env.MODE === 'artifact';

/** How long editing stays unlocked after the PIN is entered. */
const UNLOCK_MS = 10 * 60_000;

interface Ctx {
  unlocked: boolean;
  /**
   * Runs `action` right away while caregiver mode is unlocked; otherwise asks for the PIN first.
   * Used for everything that adds, changes or deletes family or clinical data.
   */
  guard: (action: () => void) => void;
  lock: () => void;
}

const CaregiverContext = createContext<Ctx | null>(null);

export function CaregiverProvider({ children }: { children: ReactNode }) {
  const { data } = useAppData();
  const [until, setUntil] = useState(0);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const timer = useRef<number>(undefined);

  // Re-render once when the unlock window ends, so the "Modo cuidador" chip disappears on time.
  useEffect(() => {
    window.clearTimeout(timer.current);
    if (until > Date.now()) timer.current = window.setTimeout(() => setNow(Date.now()), until - Date.now() + 50);
    return () => window.clearTimeout(timer.current);
  }, [until]);

  const unlocked = until > now;

  const guard = useCallback(
    (action: () => void) => {
      if (until > Date.now()) return action();
      setPin('');
      setError('');
      setPending(() => action);
    },
    [until],
  );

  const lock = useCallback(() => {
    setUntil(0);
    setNow(Date.now());
  }, []);

  const submit = () => {
    if (pin !== data.caregiverPin) {
      setError('PIN incorrecto. Pídeselo a tu familia o a tu enfermera.');
      setPin('');
      return;
    }
    const t = Date.now();
    setUntil(t + UNLOCK_MS);
    setNow(t);
    const action = pending;
    setPending(null);
    action?.();
  };

  const value = useMemo(() => ({ unlocked, guard, lock }), [unlocked, guard, lock]);

  return (
    <CaregiverContext.Provider value={value}>
      {children}
      {pending && (
        <Sheet
          title="Modo cuidador"
          onClose={() => setPending(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setPending(null)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={submit} disabled={pin.length < 4}>
                Continuar
              </button>
            </>
          }
        >
          <div className="pin-intro">
            <LockKeyhole size={32} strokeWidth={1.6} aria-hidden="true" />
            <p>Este cambio lo hace tu familia o el personal de salud. Escribe el PIN de cuidador.</p>
          </div>
          <Field label="PIN de cuidador" error={error} hint={SHOW_DEMO_PIN && data.caregiverPin === DEMO_PIN ? `PIN de demostración: ${DEMO_PIN}. Cámbialo en Configuración.` : undefined}>
            {(id, by) => (
              <input
                id={id}
                aria-describedby={by}
                className="pin-input num"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                value={pin}
                data-autofocus
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && pin.length >= 4 && submit()}
              />
            )}
          </Field>
        </Sheet>
      )}
    </CaregiverContext.Provider>
  );
}

export function useCaregiver(): Ctx {
  const ctx = useContext(CaregiverContext);
  if (!ctx) throw new Error('useCaregiver fuera de CaregiverProvider');
  return ctx;
}
