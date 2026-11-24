import { test, expect } from './fixtures';

/** Guided meditation: a female Spanish voice reads each step over the music, which keeps playing. */
test('la meditación lee cada paso con voz sobre la música, y se puede dejar solo la música', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __said: { text: string; voice: string; rate: number }[]; __cancels: number };
    w.__said = [];
    w.__cancels = 0;
    const voices = [
      { name: 'Jorge', lang: 'es-ES', default: false, localService: true, voiceURI: 'jorge' },
      { name: 'Paulina', lang: 'es-MX', default: false, localService: true, voiceURI: 'paulina' },
      { name: 'Samantha', lang: 'en-US', default: true, localService: true, voiceURI: 'samantha' },
    ];
    speechSynthesis.getVoices = () => voices as unknown as SpeechSynthesisVoice[];
    // A plain utterance object, so the fake voices above can be assigned to it.
    class FakeUtterance {
      text: string;
      lang = '';
      voice: unknown = null;
      rate = 1;
      pitch = 1;
      volume = 1;
      onstart: ((e: Event) => void) | null = null;
      onend: ((e: Event) => void) | null = null;
      onerror: ((e: Event) => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = FakeUtterance;
    speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
      w.__said.push({ text: u.text, voice: (u.voice as { name?: string } | null)?.name ?? '', rate: u.rate });
      setTimeout(() => u.onstart?.(new Event('start') as SpeechSynthesisEvent), 5);
      setTimeout(() => u.onend?.(new Event('end') as SpeechSynthesisEvent), 300);
    };
    speechSynthesis.cancel = () => {
      w.__cancels++;
    };
  });
  await page.reload();
  const said = () => page.evaluate(() => (window as unknown as { __said: { text: string; voice: string; rate: number }[] }).__said);

  await page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name: 'Mi mundo' }).click();
  await page.getByRole('button', { name: /Meditación/ }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Meditación' });
  await sheet.getByRole('button', { name: 'Empezar' }).click();

  // First step: shown and read by the female Spanish voice, slowly.
  await expect(sheet).toContainText('Acomódate de la forma');
  await expect.poll(async () => (await said()).length).toBeGreaterThan(0);
  const first = (await said())[0];
  expect(first.text).toContain('Acomódate de la forma');
  expect(first.voice).toBe('Paulina');
  expect(first.rate).toBeLessThan(1);

  // The music keeps playing while the voice speaks.
  const music = () => page.evaluate(() => (window as unknown as { __audios: HTMLMediaElement[] }).__audios.map((a) => ({ paused: a.paused, t: a.currentTime })));
  await expect.poll(async () => (await music()).some((m) => !m.paused && m.t > 0.3)).toBe(true);

  // Next step is read too.
  await sheet.getByRole('button', { name: 'Siguiente paso' }).click();
  await expect.poll(async () => (await said()).map((s) => s.text).join(' | ')).toContain('Lleva la atención a tu respiración');

  // "Solo música": no more narration for the following steps, music still on.
  await sheet.getByRole('button', { name: 'Voz guía activada' }).click();
  await expect(sheet.getByRole('button', { name: 'Solo música' })).toBeVisible();
  const count = (await said()).length;
  await sheet.getByRole('button', { name: 'Siguiente paso' }).click();
  await page.waitForTimeout(900);
  expect((await said()).length).toBe(count);
  expect((await music()).some((m) => !m.paused)).toBe(true);
});
