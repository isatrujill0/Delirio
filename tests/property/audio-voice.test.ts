import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { pickNarratorVoice } from '../../src/services/audioEngine';

const cfg = (seed: number, numRuns = 300) => ({ seed, numRuns });
const v = (name: string, lang: string) => ({ name, lang });

// Voice lists like the ones iPadOS, macOS, Windows and Chrome report.
const FEMALE_ES = [v('Paulina', 'es-MX'), v('Mónica', 'es-ES'), v('Microsoft Salome', 'es-CO'), v('Google español de Estados Unidos', 'es-US'), v('Marisol', 'es-ES')];
const MALE_ES = [v('Jorge', 'es-ES'), v('Diego', 'es-AR'), v('Juan', 'es-MX'), v('Microsoft Gonzalo', 'es-CO')];
const OTHER = [v('Samantha', 'en-US'), v('Amélie', 'fr-CA'), v('Alex', 'en-US'), v('Kyoko', 'ja-JP')];

describe('audio: pickNarratorVoice (calm female voice for the meditation)', () => {
  it('whenever a Spanish female voice exists, it is chosen over male and non-Spanish voices', () => {
    fc.assert(fc.property(fc.subarray(FEMALE_ES, { minLength: 1 }), fc.subarray(MALE_ES), fc.subarray(OTHER), fc.integer(), (f, m, o, seed) => {
      const all = fc.sample(fc.shuffledSubarray([...f, ...m, ...o], { minLength: f.length + m.length + o.length }), { seed, numRuns: 1 })[0];
      const picked = pickNarratorVoice(all)!;
      expect(f).toContainEqual(picked);
    }), cfg(660));
  });
  it('among female Spanish voices, Colombian Spanish is preferred, then Mexican', () => {
    expect(pickNarratorVoice([v('Mónica', 'es-ES'), v('Paulina', 'es-MX'), v('Microsoft Salome', 'es-CO')])!.name).toBe('Microsoft Salome');
    expect(pickNarratorVoice([v('Mónica', 'es-ES'), v('Paulina', 'es-MX')])!.name).toBe('Paulina');
  });
  it('with only male Spanish voices it still speaks Spanish; with no Spanish voice it returns null', () => {
    fc.assert(fc.property(fc.subarray(MALE_ES, { minLength: 1 }), fc.subarray(OTHER), (m, o) => {
      expect(pickNarratorVoice([...o, ...m])!.lang.startsWith('es')).toBe(true);
    }), cfg(661));
    fc.assert(fc.property(fc.subarray(OTHER), (o) => {
      expect(pickNarratorVoice(o)).toBeNull();
    }), cfg(662));
  });
});
