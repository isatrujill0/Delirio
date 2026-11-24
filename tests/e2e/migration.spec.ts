import { test, expect, readData, reload, enterPin } from './fixtures';

const rail = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Secciones' });

test('datos guardados con el formato anterior (sin demo ni PIN) se migran: todo lo de ejemplo sigue marcado', async ({ page }) => {
  // Turn the current stored data into the old shape.
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('nexo:data:v1')!);
    for (const k of ['treatments', 'procedures', 'recommendations', 'moods']) for (const x of d[k]) delete x.demo;
    delete d.caregiverPin;
    d.careNote.text = 'Te encuentras estable y recibiendo el cuidado que necesitas.';
    d.careNote.demo = true;
    localStorage.setItem('nexo:data:v1', JSON.stringify(d));
  });
  await reload(page);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Leslie');

  await rail(page).getByRole('button', { name: 'Mi cuidado' }).click();
  await expect(page.locator('.care-note-card')).toContainText('Ejemplo');
  await expect(page.getByRole('main')).not.toContainText(/estable/i);
  await expect(page.locator('.evolution-card').getByRole('heading', { name: /Tu ánimo/ })).toContainText('Ejemplo');

  await page.getByRole('button', { name: /^Tratamiento/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mi tratamiento' })).toBeVisible();
  const treatments = page.locator('.care-card');
  await expect(treatments).toHaveCount(3);
  for (const card of await treatments.all()) await expect(card.getByRole('heading', { level: 3 })).toContainText('Ejemplo');

  await page.getByRole('button', { name: 'Mi cuidado', exact: true }).first().click();
  await page.getByRole('button', { name: /^Procedimiento/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Próximos procedimientos' })).toBeVisible();
  const procs = page.locator('.care-card');
  await expect(procs).toHaveCount(4);
  for (const card of await procs.all()) await expect(card.getByRole('heading', { level: 3 })).toContainText('Ejemplo');

  // No "estable" anywhere in Mi cuidado, in its sub-views either.
  await page.getByRole('button', { name: 'Mi cuidado', exact: true }).first().click();
  await expect(page.locator('.care-note-card')).toBeVisible();
  expect(((await page.locator('body').textContent()) ?? '').toLowerCase()).not.toContain('estable');

  // Bell: demo notifications are labelled.
  await page.getByRole('button', { name: /^Notificaciones/ }).click();
  const items = page.getByRole('dialog', { name: 'Notificaciones' }).locator('.notif-list li');
  expect(await items.count()).toBeGreaterThan(0);
  for (const li of await items.all()) await expect(li).toContainText('Ejemplo · ');
  await page.getByRole('dialog', { name: 'Notificaciones' }).getByRole('button', { name: /Cerrar/ }).first().click();

  // The PIN falls back to the demo one.
  await rail(page).getByRole('button', { name: 'Mi gente' }).click();
  await page.locator('[aria-label="Tus personas"]').getByRole('button', { name: 'Agregar' }).click();
  await enterPin(page, '1234');

  // Stored data carries the flags now.
  const d = await readData(page);
  for (const k of ['treatments', 'procedures', 'recommendations', 'moods']) {
    expect(d[k].length).toBeGreaterThan(0);
    for (const x of d[k]) expect(x.demo).toBe(true);
  }
  expect(d.careNote.demo).toBe(true);
  expect(d.careNote.text).not.toContain('estable');
  expect(d.caregiverPin).toBe('1234');
});
