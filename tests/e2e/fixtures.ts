import { test as base, expect, type Page } from '@playwright/test';

/** Fresh context per test (default) + animations off + record every HTMLAudioElement that plays. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __audios: HTMLMediaElement[] };
      w.__audios = [];
      const orig = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
        if (!w.__audios.includes(this)) w.__audios.push(this);
        return orig.call(this);
      };
    });
    await page.goto('/');
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Leslie');
    await use(page);
  },
});

export { expect };

export const readData = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('nexo:data:v1') ?? 'null'));

/** Reload and re-inject the animation killer. */
export async function reload(page: Page) {
  await page.reload();
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
}

/** Answers the caregiver PIN prompt (demo PIN). Editing stays unlocked until a reload or 10 minutes. */
export async function enterPin(page: Page, pin = '1234') {
  const dialog = page.getByRole('dialog', { name: 'Modo cuidador' });
  await dialog.getByLabel('PIN de cuidador').fill(pin);
  await dialog.getByRole('button', { name: 'Continuar' }).click();
  await expect(dialog).toBeHidden();
}
