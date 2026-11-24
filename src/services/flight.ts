/**
 * "Vuelo del colibrí": a hummingbird flies through flower arches; its height follows a target
 * (the patient's head, or a finger). Pure, framework-free logic so it can be tested.
 *
 * Coordinates are normalised: x and y go from 0 to 1 (y = 0 is the top). Gentle by design for a
 * patient in bed: slow, wide openings, and bumping an arch never ends the game.
 */

export const BIRD_X = 0.26;
export const BIRD_R = 0.045;
export const COL_W = 0.09;
export const GAP_H = 0.4;
export const SPEED = 0.11; // screen widths per second
export const SPACING = 0.5; // distance between arches
export const FOLLOW = 4; // how quickly the bird reaches its target (per second)

export interface Arch {
  id: number;
  x: number; // left edge
  gapY: number; // centre of the opening
  passed: boolean;
  bumped: boolean;
}

export interface FlightState {
  birdY: number;
  arches: Arch[];
  score: number; // arches passed cleanly
  bumps: number;
  untilNext: number; // distance until the next arch appears
  nextId: number;
}

export type FlightEvent = { type: 'pass' | 'bump'; arch: number };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Where a target height is allowed to put the bird (fully on screen). */
export const clampBird = (y: number) => clamp(Number.isFinite(y) ? y : 0.5, BIRD_R, 1 - BIRD_R);

/** Centre of an opening: never so close to the edges that the opening leaves the screen. */
export const gapCentre = (r: number) => GAP_H / 2 + 0.05 + clamp(r, 0, 1) * (1 - GAP_H - 0.1);

export function initialFlight(): FlightState {
  return { birdY: 0.5, arches: [], score: 0, bumps: 0, untilNext: 0.1, nextId: 1 };
}

/** True when the bird, at height y, touches arch a (outside its opening while overlapping it). */
export function hits(a: Arch, y: number): boolean {
  const overlapsX = BIRD_X + BIRD_R > a.x && BIRD_X - BIRD_R < a.x + COL_W;
  const inside = y - BIRD_R >= a.gapY - GAP_H / 2 && y + BIRD_R <= a.gapY + GAP_H / 2;
  return overlapsX && !inside;
}

/** Advances the game by `dt` seconds with the bird heading to `targetY`. */
export function stepFlight(s: FlightState, dt: number, targetY: number, rand: () => number = Math.random): { state: FlightState; events: FlightEvent[] } {
  const d = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.1); // never jump more than 100 ms
  const target = clampBird(targetY);
  const birdY = clampBird(s.birdY + (target - s.birdY) * Math.min(1, d * FOLLOW));
  const move = SPEED * d;
  const events: FlightEvent[] = [];

  let untilNext = s.untilNext - move;
  let nextId = s.nextId;
  const arches = s.arches.map((a) => ({ ...a, x: a.x - move }));
  while (untilNext <= 0) {
    arches.push({ id: nextId++, x: 1 + untilNext, gapY: gapCentre(rand()), passed: false, bumped: false });
    untilNext += SPACING;
  }

  let { score, bumps } = s;
  for (const a of arches) {
    if (!a.bumped && !a.passed && hits(a, birdY)) {
      a.bumped = true;
      bumps++;
      events.push({ type: 'bump', arch: a.id });
    }
    if (!a.passed && a.x + COL_W < BIRD_X - BIRD_R) {
      a.passed = true;
      if (!a.bumped) {
        score++;
        events.push({ type: 'pass', arch: a.id });
      }
    }
  }

  return { state: { birdY, arches: arches.filter((a) => a.x + COL_W > -0.05), score, bumps, untilNext, nextId }, events };
}

/**
 * Head position → bird height. `faceY` is the face centre in the camera image (0 top, 1 bottom) and
 * `neutralY` where it was while looking straight ahead. A small nod covers the whole screen.
 */
export function headToTarget(faceY: number, neutralY: number, gain = 3.2): number {
  return clampBird(0.5 + (faceY - neutralY) * gain);
}
