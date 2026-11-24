import { test, expect, reload } from './fixtures';

/** Opening a chat shows which messages had not been seen ("Nuevo"), then they count as read. */
test('al abrir un chat los mensajes no vistos aparecen como nuevos y luego quedan leídos', async ({ page }) => {
  const rail = page.getByRole('navigation', { name: 'Secciones' });
  await rail.getByRole('button', { name: 'Mi gente' }).click();
  const carousel = page.locator('[aria-label="Tus personas"]');
  for (let i = 0; i < 5 && !(await carousel.locator('.person.is-center').getAttribute('aria-label'))!.startsWith('Rafa'); i++) {
    await carousel.getByRole('button', { name: 'Persona siguiente' }).click();
  }
  const panel = page.getByRole('complementary', { name: 'Panel de Rafa' });
  await expect(panel.getByRole('button', { name: 'Mensajes: 1 nuevo' })).toBeVisible();
  await panel.getByRole('button', { name: /^Mensajes/ }).click();

  await expect(page.locator('.chat-divider')).toHaveText('1 mensaje nuevo');
  const fresh = page.locator('.bubble-row.is-new');
  await expect(fresh).toHaveCount(1);
  await expect(fresh).toContainText('Machu Picchu');
  await expect(fresh.getByText('Nuevo', { exact: true })).toBeVisible();
  await expect(page.locator('.bubble-row:not(.is-new)').first()).toBeVisible(); // older, already-seen messages are not marked

  // Back in Mi gente (the chat's own back button returns to Rafa) the counter is gone.
  await page.locator('.sub-head').getByRole('button', { name: 'Mi gente' }).click();
  await expect(page.getByRole('complementary', { name: 'Panel de Rafa' }).getByRole('button', { name: 'Mensajes', exact: true })).toBeVisible();
  // Opening the chat again: nothing is marked as new any more.
  await page.getByRole('complementary', { name: 'Panel de Rafa' }).getByRole('button', { name: 'Mensajes', exact: true }).click();
  await expect(page.locator('.bubble-row').first()).toBeVisible();
  await expect(page.locator('.chat-divider')).toHaveCount(0);
  await expect(page.locator('.bubble-row.is-new')).toHaveCount(0);
  await reload(page);
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem('nexo:data:v1')!).messages.find((m: { id: string }) => m.id === 'm-11'));
  expect(data.read).toBe(true);
});
