import type { Page } from '@playwright/test';
import { test, expect, reload } from './fixtures';

test.use({ launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } });

interface Spy {
  gain: number[];
  speak: string[];
  cancel: number;
}

/** Records every GainNode-style target and replaces speechSynthesis with a deterministic stub (speaking starts at once). */
async function spyOnSound(page: Page) {
  await page.addInitScript(() => {
    const spy: Spy = { gain: [], speak: [], cancel: 0 };
    (window as unknown as { __spy: Spy }).__spy = spy;
    const orig = AudioParam.prototype.setTargetAtTime;
    AudioParam.prototype.setTargetAtTime = function (this: AudioParam, value: number, t: number, c: number) {
      spy.gain.push(value);
      return orig.call(this, value, t, c);
    };
    SpeechSynthesis.prototype.speak = function (u: SpeechSynthesisUtterance) {
      spy.speak.push(u.text);
      setTimeout(() => u.onstart?.(new Event('start') as SpeechSynthesisEvent), 0);
    };
    SpeechSynthesis.prototype.cancel = function () {
      spy.cancel++;
    };
  });
  await reload(page);
}

const spy = (page: Page) => page.evaluate(() => (window as unknown as { __spy: Spy }).__spy);
const lastGain = async (page: Page) => (await spy(page)).gain.at(-1);

test('silenciar lleva la ganancia del GainNode a 0 y subir volumen la devuelve por encima de 0', async ({ page }) => {
  await spyOnSound(page);
  const dock = page.getByRole('contentinfo', { name: 'Controles' });
  await page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name: 'Mi mundo' }).click();
  await page.getByRole('button', { name: /^Música/ }).click();
  await page.getByRole('button', { name: 'Reproducir Amanecer sereno' }).click(); // creates the GainNode
  await expect(dock.getByText('Amanecer sereno')).toBeVisible();

  await page.getByRole('button', { name: 'Silenciar' }).click();
  await expect.poll(() => lastGain(page)).toBe(0);

  await page.getByRole('button', { name: 'Activar sonido' }).click();
  await expect.poll(() => lastGain(page)).toBeCloseTo(0.36, 5); // volume 60 → 0.6²

  await page.getByRole('button', { name: 'Silenciar' }).click();
  await expect.poll(() => lastGain(page)).toBe(0);
  await dock.getByRole('button', { name: 'Subir volumen' }).click(); // also unmutes
  await expect.poll(() => lastGain(page)).toBeCloseTo(0.49, 5); // volume 70 → 0.7²
  await expect(page.getByRole('button', { name: 'Silenciar' })).toHaveAttribute('aria-pressed', 'false');
});

test('silenciar mientras suena un mensaje hablado cancela la voz y el dock deja de mostrarlo sonando', async ({ page }) => {
  await spyOnSound(page);
  const dock = page.getByRole('contentinfo', { name: 'Controles' });
  // Messages are played from Mi gente (the home widget only shows the family photo).
  await page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name: 'Mi gente' }).click();
  // Voice notes are played inside the chat ("Mensajes").
  await page.getByRole('complementary', { name: 'Panel de Mamá' }).getByRole('button', { name: /^Mensajes/ }).click();
  await page.getByRole('button', { name: /^Reproducir audio de Mamá/ }).first().click();
  await expect.poll(async () => (await spy(page)).speak.length).toBe(1);
  expect((await spy(page)).speak[0]).toContain('Hola, mi amor');
  await expect(dock.locator('.player-status')).toHaveText(/^Sonando: Mensaje leído por SYNK/);
  await expect(dock.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();

  const cancelsBefore = (await spy(page)).cancel;
  await page.getByRole('button', { name: 'Silenciar' }).click();
  await expect.poll(async () => (await spy(page)).cancel).toBeGreaterThan(cancelsBefore);
  await expect(dock.getByRole('button', { name: 'Pausar', exact: true })).toHaveCount(0);
  await expect(dock.getByRole('button', { name: 'Reproducir', exact: true })).toBeVisible();
  await expect(dock.locator('.player-status')).toHaveText(/^En pausa:/);
});

test('con el sonido silenciado el video Recuerdos en familia queda muted; con sonido no', async ({ page }) => {
  const rail = page.getByRole('navigation', { name: 'Secciones' });
  const videoMuted = () => page.getByRole('dialog', { name: 'Recuerdos en familia' }).locator('video').evaluate((v: HTMLVideoElement) => v.muted);
  const open = async () => {
    await page.getByRole('button', { name: /Video: Recuerdos en familia/ }).click();
    await expect(page.getByRole('dialog', { name: 'Recuerdos en familia' }).locator('video')).toBeVisible();
  };

  await rail.getByRole('button', { name: 'Mi mundo' }).click();
  await page.getByRole('button', { name: 'Recuerdos', exact: true }).click();
  await open();
  expect(await videoMuted()).toBe(false);
  await page.getByRole('dialog', { name: 'Recuerdos en familia' }).getByRole('button', { name: 'Cerrar' }).click();

  await page.getByRole('button', { name: 'Silenciar' }).click();
  await open();
  expect(await videoMuted()).toBe(true);
});
