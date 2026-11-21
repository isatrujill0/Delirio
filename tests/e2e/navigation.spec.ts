import { test, expect, readData, reload } from './fixtures';

test('navega por las cuatro secciones y conserva el nombre cambiado tras recargar', async ({ page }) => {
  const rail = page.getByRole('navigation', { name: 'Secciones' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^(Buenos días|Buenas tardes|Buenas noches|Hola), Leslie$/);
  await expect(rail.getByRole('button', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page');

  for (const [nav, heading] of [['Mi gente', 'Mi gente'], ['Mi mundo', 'Mi mundo'], ['Mi cuidado', 'Mi cuidado']]) {
    await rail.getByRole('button', { name: nav }).click();
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(rail.getByRole('button', { name: nav })).toHaveAttribute('aria-current', 'page');
    await expect(rail.getByRole('button', { name: 'Inicio' })).not.toHaveAttribute('aria-current', 'page');
  }
  await rail.getByRole('button', { name: 'Inicio' }).click();
  await expect(rail.getByRole('button', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page');

  // Settings: validation, then rename
  await page.getByRole('button', { name: 'Configuración' }).click();
  const dialog = page.getByRole('dialog', { name: 'Configuración' });
  for (const tab of ['General', 'Sonido', 'Notificaciones', 'Contenido', 'Acerca de']) {
    await expect(dialog.getByRole('radiogroup', { name: 'Sección de configuración' }).getByRole('radio', { name: tab })).toBeVisible();
  }
  const name = dialog.getByLabel('Tu nombre');
  await name.fill('   ');
  await dialog.getByRole('button', { name: 'Guardar' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Escribe un nombre para el saludo.');
  await name.fill('Camilo');
  await dialog.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('status')).toContainText('Ahora te saludaremos como Camilo');
  await dialog.getByRole('button', { name: 'Cerrar' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Camilo');
  expect((await readData(page)).userName).toBe('Camilo');

  await reload(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/, Camilo$/);
  expect((await readData(page)).userName).toBe('Camilo');
});
