import { test, expect, readData, reload, enterPin } from './fixtures';

const rail = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Secciones' });

test('borrar los signos vitales pide confirmación: cancelar los conserva, confirmar los pone en null', async ({ page }) => {
  await rail(page).getByRole('button', { name: 'Mi cuidado' }).click();
  expect((await readData(page)).vitals).not.toBeNull();
  await page.getByRole('button', { name: 'Registrar signos vitales' }).click();
  await enterPin(page);
  const edit = page.getByRole('dialog', { name: 'Registrar signos vitales' });
  await edit.getByRole('button', { name: 'Borrar el registro actual' }).click();

  const confirm = page.getByRole('dialog', { name: '¿Borrar los signos registrados?' });
  await expect(confirm).toBeVisible();
  expect((await readData(page)).vitals).not.toBeNull(); // nothing deleted by the first tap
  await confirm.getByRole('button', { name: 'Cancelar' }).click();
  await expect(confirm).toBeHidden();
  expect((await readData(page)).vitals).not.toBeNull();

  await edit.getByRole('button', { name: 'Borrar el registro actual' }).click();
  await page.getByRole('dialog', { name: '¿Borrar los signos registrados?' }).getByRole('button', { name: 'Borrar' }).click();
  await expect(page.getByRole('status')).toContainText('Registro eliminado');
  await expect.poll(async () => (await readData(page)).vitals).toBeNull();
  await expect(page.getByText('Aún no hay signos registrados')).toBeVisible();
});

test('registros dañados en el almacenamiento se descartan sin romper la app', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('nexo:data:v1')!);
    const bad = { id: 'bad', contactId: 'c-mama', kind: 'audio', createdAt: Date.now(), read: false };
    d.contacts.push(bad, { id: 'x' });
    d.messages.push({ ...bad, id: 'bad-msg' }); // an audio message with neither text nor media
    localStorage.setItem('nexo:data:v1', JSON.stringify(d));
  });
  await reload(page);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Leslie');

  await rail(page).getByRole('button', { name: 'Mi gente' }).click();
  const carousel = page.locator('[aria-label="Tus personas"]');
  await expect(carousel.getByRole('img', { name: 'Persona 1 de 5' })).toBeVisible();
  await expect(carousel.getByRole('button', { name: /bad|^x$/ })).toHaveCount(0);
  await page.getByRole('complementary', { name: 'Panel de Mamá' }).getByRole('button', { name: 'Mensajes', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mensajes de Mamá' })).toBeVisible();
  await expect(page.locator('.msg-row')).toHaveCount(1);

  const data = await readData(page);
  expect(data.contacts.map((c: { id: string }) => c.id)).toEqual(['c-mama', 'c-papa', 'c-rafa', 'c-karen', 'c-bryan']);
  expect(data.messages.map((m: { id: string }) => m.id)).not.toContain('bad-msg');
  expect(errors).toEqual([]);
});

test('el contenido de demostración está etiquetado y no promete evolución', async ({ page }) => {
  // Inicio: the next-procedure chip says it is an example.
  await expect(page.locator('.chip').filter({ hasText: 'Próximo' })).toContainText('ejemplo');

  await rail(page).getByRole('button', { name: 'Mi cuidado' }).click();
  const note = page.locator('.care-note-card');
  await expect(note).toContainText('Ejemplo');
  expect((await note.innerText()).toLowerCase()).not.toContain('estable');

  await page.getByRole('button', { name: /Mi tratamiento/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mi tratamiento' })).toBeVisible();
  const cards = page.locator('.care-card');
  await expect(cards).toHaveCount(3);
  for (const card of await cards.all()) await expect(card.getByRole('heading', { level: 3 })).toContainText('Ejemplo');

  // Nowhere in the app, in any section or sub-view.
  const everything: string[] = [];
  const grab = async () => everything.push(await page.evaluate(() => document.body.textContent ?? ''));
  await grab(); // tratamiento
  for (const sub of ['Próximos procedimientos', 'Recomendaciones']) {
    await page.getByRole('button', { name: 'Mi cuidado', exact: true }).first().click();
    await page.getByRole('button', { name: new RegExp(sub) }).click();
    await expect(page.getByRole('heading', { level: 1, name: sub })).toBeVisible();
    await grab();
  }
  for (const section of ['Inicio', 'Mi gente', 'Mi mundo', 'Mi cuidado']) {
    await rail(page).getByRole('button', { name: section }).click();
    await grab();
  }
  await page.getByRole('button', { name: 'Configuración' }).click();
  for (const tab of ['General', 'Sonido', 'Notificaciones', 'Contenido', 'Acerca de']) {
    await page.getByRole('dialog', { name: 'Configuración' }).getByRole('radio', { name: tab }).click();
    await grab();
  }
  for (const text of everything) {
    expect(text).not.toContain('¡Vas muy bien!');
    expect(text).not.toContain('Tu evolución');
  }
});
