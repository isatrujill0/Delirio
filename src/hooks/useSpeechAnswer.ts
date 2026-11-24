import { useEffect, useRef, useState } from 'react';

type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};
type RecognitionCtor = new () => Recognition;

const ctor = (): RecognitionCtor | undefined =>
  typeof window === 'undefined' ? undefined : ((window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition);

/** True when this browser can turn speech into text (Safari on iPad and Chrome can; some need internet). */
export const canListen = () => !!ctor();

/**
 * Listens once (Spanish, Colombia) and hands back what was heard, best guess first.
 * Errors come back as a short sentence the patient can understand.
 */
export function useSpeechAnswer() {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const rec = useRef<Recognition | null>(null);

  useEffect(() => () => rec.current?.abort(), []);

  const listen = (onHeard: (alternatives: string[]) => void) => {
    const C = ctor();
    if (!C) return setError('Este navegador no permite responder con la voz. Toca la respuesta.');
    rec.current?.abort();
    const r = new C();
    r.lang = 'es-CO';
    r.interimResults = false;
    r.continuous = false;
    r.maxAlternatives = 5;
    r.onresult = (e) => {
      const res = e.results[0];
      const alts = Array.from({ length: res.length }, (_, i) => res[i].transcript);
      onHeard(alts);
    };
    r.onerror = (e) => {
      setError(
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'No hay permiso para usar el micrófono. Revísalo en Ajustes.'
          : e.error === 'network'
            ? 'Responder con la voz necesita internet en este momento. Toca la respuesta.'
            : e.error === 'no-speech'
              ? 'No te escuché. Toca el micrófono e inténtalo otra vez.'
              : 'No se pudo escuchar. Toca la respuesta o inténtalo otra vez.',
      );
    };
    r.onend = () => setListening(false);
    rec.current = r;
    setError('');
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
      setError('No se pudo escuchar. Inténtalo otra vez.');
    }
  };

  const stop = () => {
    rec.current?.abort();
    setListening(false);
  };

  return { listening, error, setError, listen, stop };
}
