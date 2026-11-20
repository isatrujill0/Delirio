import { audioEngine } from './audioEngine';
import { trackById } from '../data/media';

/** Ordered list being played (e.g. "Mi playlist"); advances automatically when a piece ends. */
let queue: string[] = [];
let index = 0;

/** Index after moving `step` places through a list of `length`, wrapping around. */
export function wrapIndex(i: number, step: number, length: number): number {
  if (length <= 0) return 0;
  return (((i + step) % length) + length) % length;
}

function playAt(i: number) {
  const t = trackById(queue[i]);
  if (!t) return;
  index = i;
  audioEngine.playMedia({ id: t.id, title: t.title, subtitle: t.subtitle, src: t.src, loop: t.loop });
}

export function playQueue(ids: string[], start = 0) {
  queue = ids.filter((id) => trackById(id));
  if (!queue.length) return;
  playAt(Math.min(Math.max(0, start), queue.length - 1));
}

export function step(delta: 1 | -1) {
  const current = audioEngine.getState().id;
  const at = current ? queue.indexOf(current) : -1;
  if (at === -1 || queue.length === 0) return false;
  playAt(wrapIndex(at, delta, queue.length));
  return true;
}

audioEngine.onEnded = (id) => {
  if (id && queue.length > 1 && queue[index] === id) playAt(wrapIndex(index, 1, queue.length));
};
