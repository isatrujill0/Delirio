import { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../services/audioEngine';

const MAX_SECONDS = 120;

export const canRecordAudio = () => typeof window !== 'undefined' && 'MediaRecorder' in window && !!navigator.mediaDevices?.getUserMedia;

/**
 * Voice-note recorder (microphone → Blob). `stop()` resolves with the recording, or null when it was
 * cancelled or nothing was captured. Recording stops by itself after two minutes.
 */
export function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const rec = useRef<MediaRecorder | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const done = useRef<((r: { blob: Blob; seconds: number } | null) => void) | null>(null);
  const started = useRef(0);

  const cleanup = () => {
    window.clearInterval(timer.current);
    rec.current?.stream.getTracks().forEach((t) => t.stop());
    rec.current = null;
    setRecording(false);
  };

  useEffect(() => () => {
    done.current = null;
    cleanup();
  }, []);

  const start = async () => {
    setError('');
    audioEngine.stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = () => {
        const secs = Math.max(1, Math.round((Date.now() - started.current) / 1000));
        const cb = done.current;
        done.current = null;
        cleanup();
        cb?.(chunks.length ? { blob: new Blob(chunks, { type: r.mimeType || 'audio/mp4' }), seconds: secs } : null);
      };
      rec.current = r;
      started.current = Date.now();
      r.start();
      setSeconds(0);
      setRecording(true);
      timer.current = window.setInterval(() => {
        const s = Math.floor((Date.now() - started.current) / 1000);
        setSeconds(s);
        if (s >= MAX_SECONDS && rec.current?.state === 'recording') rec.current.stop();
      }, 250);
    } catch {
      setError('No se pudo usar el micrófono. Revisa el permiso del micrófono en Ajustes de Safari.');
    }
  };

  /** Stops and hands back the recording. */
  const stop = () =>
    new Promise<{ blob: Blob; seconds: number } | null>((resolve) => {
      if (!rec.current || rec.current.state !== 'recording') return resolve(null);
      done.current = resolve;
      rec.current.stop();
    });

  /** Stops and throws the recording away. */
  const cancel = () => {
    done.current = null;
    if (rec.current?.state === 'recording') rec.current.stop();
    else cleanup();
  };

  return { recording, seconds, error, start, stop, cancel };
}
