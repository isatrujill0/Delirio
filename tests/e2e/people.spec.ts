import { test, expect, readData, reload, enterPin } from './fixtures';

test('agregar, editar y eliminar una persona en Mi gente con persistencia', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name: 'Mi gente' }).click();
  const carousel = page.locator('[aria-label="Tus personas"]');
  // Every demo person is reachable with the arrows (the dots are only a position indicator).
  const seen: string[] = [];
  for (let i = 0; i < 5; i++) {
    seen.push((await carousel.locator('.person.is-center').getAttribute('aria-label'))!.replace(', seleccionado', ''));
    await carousel.getByRole('button', { name: 'Persona siguiente' }).click();
  }
  expect(seen.sort()).toEqual(['Bryan', 'Karen', 'Mamá', 'Papá', 'Rafa']);

  await carousel.getByRole('button', { name: 'Agregar' }).click();
  await enterPin(page); // adding people is a caregiver action
  const form = page.getByRole('dialog', { name: 'Agregar a alguien' });
  await form.getByRole('button', { name: 'Guardar' }).click();
  await expect(form.getByRole('alert')).toHaveText('Escribe cómo se llama.');

  await form.getByLabel('Nombre').fill('Tío Jorge');
  await form.getByLabel('Quién es').fill('tu tío');
  await form.getByLabel('Teléfono').fill('abc');
  await form.getByRole('button', { name: 'Guardar' }).click();
  await expect(form.getByRole('alert')).toContainText('Escribe solo números');
  await form.getByLabel('Teléfono').fill('300 123 4567');
  await form.getByLabel('Algo sobre esta persona').fill('Le gusta el fútbol');
  await form.getByRole('button', { name: 'Guardar' }).click();
  await expect(form).toBeHidden();
  await expect(page.getByRole('status')).toContainText('Tío Jorge se agregó a Mi gente');

  await expect(page.getByRole('complementary', { name: 'Panel de Tío Jorge' })).toContainText('Le gusta el fútbol');
  await expect(carousel.getByRole('button', { name: 'Tío Jorge, seleccionado' })).toBeAttached();
  expect((await readData(page)).contacts.map((c: { name: string }) => c.name)).toContain('Tío Jorge');

  // Persisted across reload (selection resets; navigate to him)
  await reload(page);
  await page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name: 'Mi gente' }).click();
  await carousel.getByRole('button', { name: 'Ver a Tío Jorge' }).click();
  await expect(page.getByRole('complementary', { name: 'Panel de Tío Jorge' })).toBeVisible();

  // Edit
  await page.getByRole('button', { name: 'Perfil de Tío Jorge' }).click();
  const profile = page.getByRole('dialog', { name: 'Tío Jorge' });
  await expect(profile).toContainText('300 123 4567');
  await profile.getByRole('button', { name: 'Editar perfil' }).click();
  await enterPin(page); // locked again after the reload
  const edit = page.getByRole('dialog', { name: 'Editar a Tío Jorge' });
  await edit.getByLabel('Nombre').fill('Tío Jorge M.');
  await edit.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('status')).toContainText('Cambios guardados');
  await expect(page.getByRole('complementary', { name: 'Panel de Tío Jorge M.' })).toBeVisible();

  // Delete: cancel first, then confirm
  await page.getByRole('button', { name: 'Perfil de Tío Jorge M.' }).click();
  await page.getByRole('dialog', { name: 'Tío Jorge M.' }).getByRole('button', { name: 'Eliminar' }).click();
  const confirm = page.getByRole('dialog', { name: '¿Eliminar a Tío Jorge M.?' });
  await confirm.getByRole('button', { name: 'Cancelar' }).click();
  expect((await readData(page)).contacts.map((c: { name: string }) => c.name)).toContain('Tío Jorge M.');
  await page.getByRole('dialog', { name: 'Tío Jorge M.' }).getByRole('button', { name: 'Eliminar' }).click();
  await page.getByRole('dialog', { name: '¿Eliminar a Tío Jorge M.?' }).getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByRole('status')).toContainText('Tío Jorge M. se eliminó de Mi gente');
  await expect(carousel.getByRole('button', { name: /Tío Jorge/ })).toHaveCount(0);

  await reload(page);
  await page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name: 'Mi gente' }).click();
  await expect(carousel.getByRole('button', { name: /Tío Jorge/ })).toHaveCount(0);
  const names = (await readData(page)).contacts.map((c: { name: string }) => c.name);
  expect(names).toEqual(['Mamá', 'Papá', 'Rafa', 'Karen', 'Bryan']);
});
