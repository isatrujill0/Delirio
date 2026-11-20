import { useEffect, useState } from 'react';

/** Current time, re-rendering only the caller at the start of each minute (or every `everyMs`). */
export function useNow(everyMs?: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: number;
    const schedule = () => {
      const delay = everyMs ?? 60_000 - (Date.now() % 60_000) + 20;
      timer = window.setTimeout(() => {
        setNow(new Date());
        schedule();
      }, delay);
    };
    schedule();
    // Coming back from the lock screen: refresh immediately.
    const onVisible = () => document.visibilityState === 'visible' && setNow(new Date());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [everyMs]);
  return now;
}
