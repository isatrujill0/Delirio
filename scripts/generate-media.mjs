// Generates SYNK's demo media: original music and nature soundscapes synthesized in code
// (no third-party recordings, so there are no licensing restrictions), plus a short demo video.
// Requires ffmpeg on PATH. Run: npm run media
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO = join(ROOT, 'src/assets/audio');
const VIDEO = join(ROOT, 'src/assets/video');
const SR = 32000;
const TAU = Math.PI * 2;

// Deterministic PRNG so every run produces identical files.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const midi = (n) => 440 * 2 ** ((n - 69) / 12);

/** Schroeder-style reverb for space and softness. */
function reverb(x, mix = 0.3) {
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ d: Math.round(d * (SR / 44100)), buf: new Float32Array(Math.round(d * (SR / 44100))), i: 0, f: 0 }));
  const aps = [225, 556, 441].map((d) => ({ d: Math.round(d * (SR / 44100)), buf: new Float32Array(Math.round(d * (SR / 44100))), i: 0 }));
  const out = new Float32Array(x.length);
  for (let n = 0; n < x.length; n++) {
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.f = y * 0.75 + c.f * 0.25; // damping
      c.buf[c.i] = x[n] * 0.5 + c.f * 0.84;
      c.i = (c.i + 1) % c.d;
      s += y;
    }
    for (const a of aps) {
      const b = a.buf[a.i];
      const y = -s + b;
      a.buf[a.i] = s + b * 0.5;
      a.i = (a.i + 1) % a.d;
      s = y;
    }
    out[n] = x[n] * (1 - mix) + s * 0.25 * mix;
  }
  return out;
}

function onePoleLP(x, cutoff) {
  const a = Math.exp((-TAU * cutoff) / SR);
  let y = 0;
  for (let n = 0; n < x.length; n++) x[n] = y = (1 - a) * x[n] + a * y;
  return x;
}
function onePoleHP(x, cutoff) {
  const a = Math.exp((-TAU * cutoff) / SR);
  let y = 0, px = 0;
  for (let n = 0; n < x.length; n++) {
    y = a * (y + x[n] - px);
    px = x[n];
    x[n] = y;
  }
  return x;
}
function pink(len, r) {
  const out = new Float32Array(len);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < len; i++) {
    const w = r() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return out;
}
function brown(len, r) {
  const out = new Float32Array(len);
  let y = 0;
  for (let i = 0; i < len; i++) {
    y = (y + 0.02 * (r() * 2 - 1)) / 1.02;
    out[i] = y * 3.5;
  }
  return out;
}

/** Ambient music: slow pad chords with sparse pentatonic bells. */
function music({ seconds, chords, chordSec, bellScale, bellDensity, seed, brightness }) {
  const r = rng(seed);
  const len = seconds * SR;
  const x = new Float32Array(len);
  const fade = 2.8;
  for (let c = 0; c * chordSec < seconds + chordSec; c++) {
    const notes = chords[c % chords.length];
    const start = c * chordSec - fade / 2;
    const end = start + chordSec + fade;
    for (const note of notes) {
      const f = midi(note);
      const detune = [0.997, 1.003];
      for (let n = Math.max(0, Math.floor(start * SR)); n < Math.min(len, end * SR); n++) {
        const t = n / SR - start;
        const env = Math.min(1, t / fade) * Math.min(1, (end - n / SR) / fade);
        let s = 0;
        for (const d of detune) s += Math.sin(TAU * f * d * (n / SR)) + brightness * 0.3 * Math.sin(TAU * 2 * f * d * (n / SR));
        x[n] += s * env * 0.045;
      }
    }
  }
  // bells
  for (let t = 3; t < seconds - 4; t += bellDensity * (0.6 + r())) {
    const f = midi(bellScale[Math.floor(r() * bellScale.length)]);
    const s0 = Math.floor(t * SR);
    for (let n = 0; n < SR * 3.5 && s0 + n < len; n++) {
      const tt = n / SR;
      const env = Math.exp(-tt * 1.6) * Math.min(1, tt * 200);
      x[s0 + n] += env * 0.07 * (Math.sin(TAU * f * tt) + 0.25 * Math.sin(TAU * f * 2.76 * tt) * Math.exp(-tt * 3));
    }
  }
  onePoleLP(x, 2600 + brightness * 1500);
  return reverb(x, 0.45);
}

function forest(seconds, seed) {
  const r = rng(seed);
  const len = seconds * SR;
  const wind = onePoleLP(brown(len, r), 700);
  const x = new Float32Array(len);
  for (let n = 0; n < len; n++) {
    const sway = 0.55 + 0.45 * Math.sin((TAU * n) / SR / 11 + Math.sin((TAU * n) / SR / 29) * 2);
    x[n] = wind[n] * 0.5 * sway;
  }
  // birds: short frequency-swept chirps in small phrases
  for (let t = 1.5; t < seconds - 2; t += 1.2 + r() * 3.2) {
    const base = 2200 + r() * 1800;
    const notes = 2 + Math.floor(r() * 4);
    const pan = 0.05 + r() * 0.06;
    for (let k = 0; k < notes; k++) {
      const s0 = Math.floor((t + k * (0.11 + r() * 0.05)) * SR);
      const dur = 0.07 + r() * 0.06;
      const up = r() > 0.5 ? 1 : -1;
      let ph = 0;
      for (let n = 0; n < dur * SR && s0 + n < len; n++) {
        const p = n / (dur * SR);
        const f = base * (1 + up * 0.35 * p) + 180 * Math.sin(TAU * 32 * (n / SR));
        ph += (TAU * f) / SR;
        x[s0 + n] += Math.sin(ph) * Math.sin(Math.PI * p) ** 2 * pan;
      }
    }
  }
  return reverb(x, 0.3);
}

function rain(seconds, seed) {
  const r = rng(seed);
  const len = seconds * SR;
  const hiss = onePoleLP(onePoleHP(pink(len, r), 500), 5200);
  const body = onePoleLP(brown(len, r), 400);
  const x = new Float32Array(len);
  for (let n = 0; n < len; n++) x[n] = hiss[n] * 0.55 + body[n] * 0.35;
  for (let i = 0; i < seconds * 22; i++) {
    const s0 = Math.floor(r() * (len - SR));
    const f = 1800 + r() * 3200;
    const a = 0.015 + r() * 0.03;
    for (let n = 0; n < 0.03 * SR; n++) x[s0 + n] += a * Math.sin((TAU * f * n) / SR) * Math.exp((-n / SR) * 160);
  }
  return reverb(x, 0.2);
}

function sea(seconds, seed) {
  const r = rng(seed);
  const len = seconds * SR;
  const low = onePoleLP(pink(len, r), 520);
  const high = onePoleLP(onePoleHP(pink(len, r), 900), 4200);
  const x = new Float32Array(len);
  // waves of irregular length
  const crests = [];
  for (let t = 0; t < seconds + 10; t += 7 + r() * 4) crests.push(t);
  for (let n = 0; n < len; n++) {
    const t = n / SR;
    let env = 0.15;
    for (const c of crests) {
      const d = t - c;
      if (d > -3.5 && d < 5) env += d < 0 ? Math.exp(-((d / 1.8) ** 2)) : Math.exp(-d / 2.2);
    }
    x[n] = low[n] * 1.2 * env + high[n] * 0.5 * Math.max(0, env - 0.5);
  }
  return reverb(x, 0.25);
}

/** Crossfade the tail into the head so the file loops without a seam. */
function loopable(x, fadeSec = 3) {
  const f = Math.floor(fadeSec * SR);
  const out = x.slice(0, x.length - f);
  for (let i = 0; i < f; i++) {
    const g = i / f;
    out[i] = x[i] * Math.sqrt(g) + x[x.length - f + i] * Math.sqrt(1 - g);
  }
  return out;
}

function normalize(x, peak = 0.8) {
  let m = 0;
  for (const v of x) m = Math.max(m, Math.abs(v));
  const g = m > 0 ? peak / m : 1;
  for (let i = 0; i < x.length; i++) x[i] *= g;
  return x;
}

function fadeEdges(x, sec = 2.5) {
  const f = Math.floor(sec * SR);
  for (let i = 0; i < f; i++) {
    x[i] *= i / f;
    x[x.length - 1 - i] *= i / f;
  }
  return x;
}

function encode(name, x) {
  const tmp = join(tmpdir(), `nexo-${name}.f32`);
  writeFileSync(tmp, Buffer.from(x.buffer, x.byteOffset, x.byteLength));
  const out = join(AUDIO, `${name}.m4a`);
  const res = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', tmp, '-c:a', 'aac', '-b:a', '48k', '-movflags', '+faststart', out]);
  rmSync(tmp);
  if (res.status !== 0) throw new Error(res.stderr.toString());
  console.log('audio', out);
}

mkdirSync(AUDIO, { recursive: true });
mkdirSync(VIDEO, { recursive: true });

const S = 96;
encode('amanecer-sereno', normalize(fadeEdges(music({
  seconds: S, chordSec: 8, seed: 11, brightness: 0.9, bellDensity: 2.6,
  chords: [[48, 55, 64, 71], [45, 52, 60, 67], [41, 48, 57, 64], [43, 50, 59, 64]],
  bellScale: [72, 74, 76, 79, 81, 84],
}))));
encode('brisa-de-tarde', normalize(fadeEdges(music({
  seconds: S, chordSec: 9, seed: 23, brightness: 0.6, bellDensity: 3.4,
  chords: [[50, 57, 64, 65], [43, 50, 59, 64], [46, 53, 62, 69], [45, 52, 60, 67]],
  bellScale: [69, 72, 74, 76, 81],
}))));
encode('calma-de-noche', normalize(fadeEdges(music({
  seconds: S, chordSec: 12, seed: 37, brightness: 0.2, bellDensity: 5,
  chords: [[45, 52, 60, 64], [41, 48, 57, 60], [43, 50, 55, 62], [40, 47, 55, 59]],
  bellScale: [64, 67, 69, 72, 76],
}), 3.5), 0.7));
encode('bosque', normalize(loopable(forest(S + 3, 5)), 0.75));
encode('lluvia', normalize(loopable(rain(S + 3, 7)), 0.7));
encode('mar', normalize(loopable(sea(S + 3, 9)), 0.75));

// Demo video: a slow zoom on the family photo (cropped to the faces, 720×512) with the first music piece.
const vid = spawnSync('ffmpeg', [
  '-v', 'error', '-y', '-loop', '1', '-i', join(ROOT, 'src/assets/img/familia.jpg'),
  '-i', join(AUDIO, 'amanecer-sereno.m4a'),
  '-filter_complex', "[0:v]crop=iw:iw*512/720:0:ih*0.15,scale=1280:-2,zoompan=z='min(1.0+on*0.0011,1.25)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=720x512:fps=24,format=yuv420p,fade=t=in:st=0:d=1,fade=t=out:st=13:d=1[v];[1:a]afade=t=out:st=12.5:d=1.5[a]",
  '-map', '[v]', '-map', '[a]', '-t', '14', '-c:v', 'libx264', '-profile:v', 'main', '-crf', '30', '-preset', 'slow',
  '-c:a', 'aac', '-b:a', '48k', '-movflags', '+faststart', join(VIDEO, 'recuerdos-en-familia.mp4'),
]);
if (vid.status !== 0) throw new Error(vid.stderr.toString());
console.log('video', join(VIDEO, 'recuerdos-en-familia.mp4'));
