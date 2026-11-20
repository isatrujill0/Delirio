import { useEffect, useState } from 'react';
import { resolveMedia } from '../services/mediaStore';

/** Resolves a MediaRef to a URL, revoking blob URLs on change/unmount. */
export function useMediaUrl(ref?: string): { url: string | null; loading: boolean; failed: boolean } {
  const [state, setState] = useState<{ url: string | null; loading: boolean; failed: boolean }>({ url: null, loading: !!ref, failed: false });
  useEffect(() => {
    let alive = true;
    let created: string | null = null;
    if (!ref) {
      setState({ url: null, loading: false, failed: false });
      return;
    }
    setState((s) => ({ ...s, loading: true, failed: false }));
    resolveMedia(ref)
      .then((url) => {
        if (url?.startsWith('blob:')) created = url;
        if (alive) setState({ url, loading: false, failed: !url });
        else if (created) URL.revokeObjectURL(created);
      })
      .catch(() => alive && setState({ url: null, loading: false, failed: true }));
    return () => {
      alive = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [ref]);
  return state;
}
