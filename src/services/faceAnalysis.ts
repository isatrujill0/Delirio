/**
 * Summary of how the face moved during one round of the head-controlled game. It describes the
 * exercise (how long the face was seen, how far and how often the head moved); it is not a medical
 * evaluation and is not stored.
 */

export interface FaceSample {
  /** Seconds since the round started. */
  t: number;
  /** Face centre in the camera image (0 top, 1 bottom), or null when the face was not seen. */
  y: number | null;
}

export interface FaceSummary {
  seconds: number;
  /** Share of the samples where the face was seen, 0–100. */
  visiblePct: number;
  /** How far the head moved up and down, as a share of the image height (ignoring the extreme 10 %), 0–100. */
  rangePct: number;
  /** Up-and-down movements (each change of direction larger than the noise threshold). */
  moves: number;
}

const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];

export function summarizeFace(samples: FaceSample[], noise = 0.02): FaceSummary {
  const seen = samples.filter((s): s is { t: number; y: number } => s.y !== null && Number.isFinite(s.y));
  const seconds = samples.length ? Math.max(0, samples[samples.length - 1].t - samples[0].t) : 0;
  const visiblePct = samples.length ? Math.round((seen.length / samples.length) * 100) : 0;
  if (seen.length < 2) return { seconds, visiblePct, rangePct: 0, moves: 0 };

  const ys = seen.map((s) => s.y).sort((a, b) => a - b);
  const rangePct = Math.round((quantile(ys, 0.9) - quantile(ys, 0.1)) * 100);

  // Count turning points with hysteresis, so small jitter is not counted as a movement.
  let moves = 0;
  let dir = 0;
  let anchor = seen[0].y;
  for (const { y } of seen) {
    const d = y - anchor;
    if (dir >= 0 && d < -noise) {
      if (dir > 0) moves++;
      dir = -1;
      anchor = y;
    } else if (dir <= 0 && d > noise) {
      if (dir < 0) moves++;
      dir = 1;
      anchor = y;
    } else if ((dir > 0 && y > anchor) || (dir < 0 && y < anchor)) {
      anchor = y; // keep following the current direction
    }
  }
  return { seconds, visiblePct, rangePct, moves };
}

export function rangeLabel(rangePct: number): string {
  return rangePct < 4 ? 'Movimiento pequeño' : rangePct < 10 ? 'Movimiento moderado' : 'Movimiento amplio';
}
