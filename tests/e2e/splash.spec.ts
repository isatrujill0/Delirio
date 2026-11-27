import { test as base, expect } from '@playwright/test';

/** Opening screen: SYNK and its slogan for three seconds, then the app. (Shown to people, not to test robots.) */
base('al abrir la app se ve SYNK con su eslogan unos 3 segundos y luego Inicio', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  await page.goto('/');
  const splash = page.locator('.splash');
  await expect(splash).toBeVisible();
  await expect(splash).toContainText('SYNK');
  await expect(splash).toContainText('En sintonía con tu bienestar');
  await page.waitForTimeout(2000);
  await expect(splash).toBeVisible(); // still there at 2 s
  await expect(splash).toHaveCount(0, { timeout: 2500 }); // gone by ~3 s
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Leslie');
  await expect(page.locator('.topbar .brand-tag')).toHaveText('En sintonía con tu bienestar');
  await expect(page).toHaveTitle('SYNK');
});

base('tocar la pantalla de entrada la salta', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  await page.goto('/');
  await page.locator('.splash').click();
  await expect(page.locator('.splash')).toHaveCount(0);
});
