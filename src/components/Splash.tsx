import { useEffect, useState } from 'react';
import { SynkLogo } from './Brand';

const SHOW_MS = 3000;
const FADE_MS = 500;

/**
 * Opening screen: for three seconds, the SYNK name and its slogan appear softly, then fade into the
 * app. A tap skips it. It is not shown to automated test browsers (they would only wait for it).
 */
export function Splash() {
  const [phase, setPhase] = useState<'in' | 'out' | 'gone'>(() => (navigator.webdriver ? 'gone' : 'in'));

  useEffect(() => {
    if (phase === 'gone') return;
    const out = window.setTimeout(() => setPhase('out'), SHOW_MS - FADE_MS);
    const gone = window.setTimeout(() => setPhase('gone'), SHOW_MS);
    return () => {
      window.clearTimeout(out);
      window.clearTimeout(gone);
    };
  }, [phase === 'gone']); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'gone') return null;
  return (
    <div className={`splash ${phase === 'out' ? 'is-out' : ''}`} role="status" aria-label="SYNK. En sintonía con tu bienestar" onPointerDown={() => setPhase('gone')}>
      <div className="splash-mark">
        <SynkLogo size="xl" />
      </div>
      <p className="splash-slogan">En sintonía con tu bienestar</p>
    </div>
  );
}
