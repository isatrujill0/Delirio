import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppData } from '../types';
import { clearData, loadData, saveData, type StorageError } from '../services/storage';
import { createDemoData } from '../data/demo';
import { clearMedia } from '../services/mediaStore';

interface Ctx {
  data: AppData;
  /** Immutable update; persisted to LocalStorage right after. */
  update: (fn: (d: AppData) => AppData) => void;
  resetDemo: () => Promise<void>;
  storageError: StorageError | null;
}

const AppDataContext = createContext<Ctx | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const initial = useRef(loadData());
  const [data, setData] = useState<AppData>(initial.current.data);
  const [storageError, setStorageError] = useState<StorageError | null>(initial.current.error ?? null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (initial.current.error) return;
    }
    setStorageError(saveData(data));
  }, [data]);

  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => fn(d)), []);

  const resetDemo = useCallback(async () => {
    clearData();
    await clearMedia();
    setData(createDemoData());
  }, []);

  const value = useMemo(() => ({ data, update, resetDemo, storageError }), [data, update, resetDemo, storageError]);
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): Ctx {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData fuera de AppDataProvider');
  return ctx;
}
