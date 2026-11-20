import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SectionId } from '../types';

export type ToastTone = 'info' | 'ok' | 'error';
export interface Toast {
  id: number;
  text: string;
  tone: ToastTone;
}

interface UICtx {
  section: SectionId;
  /** Sub-view inside a section (e.g. "tratamiento", "mensajes:c-mama"). */
  sub: string | null;
  go: (section: SectionId, sub?: string | null) => void;
  toasts: Toast[];
  toast: (text: string, tone?: ToastTone) => void;
  dismissToast: (id: number) => void;
  panel: 'ajustes' | 'notificaciones' | null;
  openPanel: (p: 'ajustes' | 'notificaciones' | null) => void;
}

const UIContext = createContext<UICtx | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [section, setSection] = useState<SectionId>('inicio');
  const [sub, setSub] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [panel, openPanel] = useState<UICtx['panel']>(null);
  const nextId = useRef(1);

  const go = useCallback((s: SectionId, next: string | null = null) => {
    setSection(s);
    setSub(next);
  }, []);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (text: string, tone: ToastTone = 'info') => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-2), { id, text, tone }]);
      window.setTimeout(() => dismissToast(id), tone === 'error' ? 6000 : 3200);
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({ section, sub, go, toasts, toast, dismissToast, panel, openPanel }),
    [section, sub, go, toasts, toast, dismissToast, panel],
  );
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UICtx {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI fuera de UIProvider');
  return ctx;
}
