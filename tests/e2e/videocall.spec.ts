import { test, expect } from './fixtures';

/** The chat has no "who is writing" switch, and the video call looks like a real call with a swappable self view. */
test('chat sin selector de quién escribe; videollamada con cámara propia e intercambio de vistas', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name: 'Mi gente' }).click();
  await page.getByRole('complementary', { name: 'Panel de Mamá' }).getByRole('button', { name: /^Mensajes/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mamá' })).toBeVisible();
  await expect(page.getByRole('radiogroup', { name: '¿Quién escribe?' })).toHaveCount(0);
  await page.getByLabel('Escribe un mensaje').fill('Hola mami');
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(page.locator('.bubble-row.is-mine').last()).toContainText('Hola mami');

  await page.getByRole('button', { name: 'Videollamada' }).click();
  const call = page.getByRole('dialog', { name: 'Videollamada con Mamá' });
  await expect(call.getByRole('status')).toHaveText('Llamando…');
  await expect(call.getByRole('status')).toHaveText(/^\d:\d\d$/, { timeout: 8000 }); // answered: call timer
  await expect(call.locator('.call-main').getByRole('img', { name: 'Cámara de Mamá' })).toBeVisible();
  await call.getByRole('button', { name: 'Cambiar las vistas de la llamada' }).click();
  await expect(call.locator('.call-pip').getByRole('img', { name: 'Cámara de Mamá' })).toBeVisible();
  await expect(call.locator('.call-main .feed-self')).toBeVisible();
  await call.getByRole('button', { name: 'Colgar' }).click();
  await expect(call).toBeHidden();
});
