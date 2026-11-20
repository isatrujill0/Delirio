import { speechSeconds } from './time';

export type PlayStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export interface PlayerState {
  kind: 'none' | 'media' | 'speech';
  id: string | null;
  title: string;
  subtitle: string;
  status: PlayStatus;
  position: number;
  duration: number;
  loop: boolean;
  error: string | null;
}

export interface MediaItem {
  id: string;
  title: string;
  subtitle: string;
  src: string;
  loop?: boolean;
}

export interface SpeechItem {
  id: string;
  title: string;
  subtitle: string;
  text: string;
}

const EMPTY: PlayerState = { kind: 'none', id: null, title: '', subtitle: '', status: 'idle', position: 0, duration: 0, loop: false, error: null };

/** Perceptual volume curve: 0–100 → 0–1 gain. */
export function volumeToGain(volume: number, muted: boolean): number {
  if (muted || !Number.isFinite(volume) || volume <= 0) return 0;
  const v = Math.min(100, volume) / 100;
  return v * v;
}

/**
 * Single audio output for the whole device: music, nature sounds, recorded voice messages
 * and text read aloud. One thing plays at a time, like on the physical machine.
 *
 * iPadOS ignores HTMLMediaElement.volume, so media is routed through a Web Audio GainNode
 * (created on the first user gesture) to make the volume buttons really work.
 */
class AudioEngine {
  private el: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private state: PlayerState = EMPTY;
  private listeners = new Set<() => void>();
  private level = 0.36;
  private speechText = '';
  private speechStart = 0;
  private speechElapsed = 0;
  private speechTimer: number | undefined;
  private ownedUrl: string | null = null;
  /** Called when a media file finishes (used by the playlist to advance). */
  onEnded: ((id: string | null) => void) | null = null;

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getState = () => this.state;

  private set(patch: Partial<PlayerState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn());
  }

  private element(): HTMLAudioElement {
    if (this.el) return this.el;
    const el = new Audio();
    el.preload = 'metadata';
    el.addEventListener('timeupdate', () => this.state.kind === 'media' && this.set({ position: el.currentTime }));
    el.addEventListener('durationchange', () => Number.isFinite(el.duration) && this.set({ duration: el.duration }));
    el.addEventListener('playing', () => this.set({ status: 'playing', error: null }));
    el.addEventListener('waiting', () => this.set({ status: 'loading' }));
    el.addEventListener('pause', () => this.state.kind === 'media' && this.state.status !== 'idle' && el.paused && !el.ended && this.set({ status: 'paused' }));
    el.addEventListener('ended', () => {
      this.set({ status: 'idle', position: 0 });
      this.onEnded?.(this.state.id);
    });
    el.addEventListener('error', () => this.state.kind === 'media' && this.set({ status: 'error', error: 'No se pudo reproducir este audio.' }));
    this.el = el;
    return el;
  }

  /** Must run inside a user gesture on iPadOS. */
  private unlock() {
    const el = this.element();
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) {
        try {
          this.ctx = new AC();
          this.gain = this.ctx.createGain();
          this.gain.gain.value = this.level;
          this.ctx.createMediaElementSource(el).connect(this.gain);
          this.gain.connect(this.ctx.destination);
        } catch {
          this.ctx = null;
          this.gain = null;
        }
      }
    }
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  setVolume(volume: number, muted: boolean) {
    this.level = volumeToGain(volume, muted);
    if (this.gain && this.ctx) this.gain.gain.setTargetAtTime(this.level, this.ctx.currentTime, 0.05);
    else if (this.el) this.el.volume = this.level;
  }

  playMedia(item: MediaItem, ownedUrl = false) {
    this.stop();
    this.unlock();
    const el = this.element();
    if (ownedUrl) this.ownedUrl = item.src;
    el.loop = !!item.loop;
    el.src = item.src;
    if (!this.gain) el.volume = this.level;
    this.set({ kind: 'media', id: item.id, title: item.title, subtitle: item.subtitle, status: 'loading', position: 0, duration: 0, loop: !!item.loop, error: null });
    el.play().catch((e: unknown) => {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      this.set({ status: 'error', error: 'No se pudo iniciar la reproducción. Toca ▶ otra vez.' });
    });
  }

  playSpeech(item: SpeechItem) {
    this.stop();
    if (typeof speechSynthesis === 'undefined') {
      this.set({ ...EMPTY, kind: 'speech', id: item.id, title: item.title, subtitle: item.subtitle, status: 'error', error: 'Este navegador no puede leer mensajes en voz alta.' });
      return;
    }
    this.speechText = item.text;
    this.speechElapsed = 0;
    this.set({ kind: 'speech', id: item.id, title: item.title, subtitle: item.subtitle, status: 'loading', position: 0, duration: speechSeconds(item.text), loop: false, error: null });
    this.speak();
  }

  private speak() {
    const u = new SpeechSynthesisUtterance(this.speechText);
    u.lang = 'es-CO';
    const voices = speechSynthesis.getVoices();
    const voice = voices.find((v) => v.lang === 'es-CO') ?? voices.find((v) => v.lang === 'es-MX' || v.lang === 'es-US') ?? voices.find((v) => v.lang.startsWith('es'));
    if (voice) u.voice = voice;
    u.rate = 0.92;
    u.volume = Math.min(1, Math.sqrt(this.level));
    u.onstart = () => {
      this.speechStart = performance.now();
      this.set({ status: 'playing' });
      this.tick();
    };
    u.onend = () => {
      if (this.state.kind !== 'speech') return;
      window.clearInterval(this.speechTimer);
      this.set({ status: 'idle', position: 0 });
    };
    u.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      window.clearInterval(this.speechTimer);
      this.set({ status: 'error', error: 'No se pudo leer el mensaje en voz alta.' });
    };
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  private tick() {
    window.clearInterval(this.speechTimer);
    this.speechTimer = window.setInterval(() => {
      const pos = this.speechElapsed + (performance.now() - this.speechStart) / 1000;
      this.set({ position: Math.min(pos, this.state.duration) });
    }, 250);
  }

  pause() {
    if (this.state.status !== 'playing' && this.state.status !== 'loading') return;
    if (this.state.kind === 'media') this.el?.pause();
    if (this.state.kind === 'speech') {
      // Pausing speech is unreliable on Safari; cancel and restart from the beginning on resume.
      this.speechElapsed = 0;
      window.clearInterval(this.speechTimer);
      speechSynthesis.cancel();
      this.set({ status: 'paused', position: 0 });
    }
  }

  resume() {
    if (this.state.status !== 'paused' && this.state.status !== 'idle' && this.state.status !== 'error') return;
    if (this.state.kind === 'media' && this.el) {
      this.unlock();
      this.set({ status: 'loading' });
      this.el.play().catch(() => this.set({ status: 'error', error: 'No se pudo reanudar.' }));
    } else if (this.state.kind === 'speech') {
      this.set({ status: 'loading' });
      this.speak();
    }
  }

  toggle() {
    if (this.state.status === 'playing' || this.state.status === 'loading') this.pause();
    else this.resume();
  }

  seek(seconds: number) {
    if (this.state.kind !== 'media' || !this.el || !Number.isFinite(this.el.duration)) return;
    this.el.currentTime = Math.max(0, Math.min(seconds, this.el.duration));
    this.set({ position: this.el.currentTime });
  }

  stop() {
    window.clearInterval(this.speechTimer);
    if (this.state.kind === 'speech' && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    if (this.el) {
      this.el.pause();
      this.el.removeAttribute('src');
      this.el.load();
    }
    if (this.ownedUrl) {
      URL.revokeObjectURL(this.ownedUrl);
      this.ownedUrl = null;
    }
    if (this.state.kind !== 'none') this.set({ ...EMPTY });
  }

  /** Short tone for games (synthesized). */
  tone(freq: number, seconds = 0.4) {
    this.unlock();
    const ctx = this.ctx;
    if (!ctx || this.level === 0) return;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.3 * this.level, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + seconds + 0.05);
  }

  /** Soft two-note chime for notifications (synthesized; respects the device volume). */
  chime() {
    this.unlock();
    const ctx = this.ctx;
    if (!ctx || this.level === 0) return;
    const t0 = ctx.currentTime;
    [784, 1047].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.type = 'sine';
      g.gain.setValueAtTime(0, t0 + i * 0.18);
      g.gain.linearRampToValueAtTime(0.25 * this.level, t0 + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.18 + 1.2);
      o.connect(g).connect(ctx.destination);
      o.start(t0 + i * 0.18);
      o.stop(t0 + i * 0.18 + 1.3);
    });
  }
}

export const audioEngine = new AudioEngine();
