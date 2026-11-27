import { test, expect } from './fixtures';

/** The bell in the control bar calls the nurse (simulated in this prototype, and it says so). Notices moved to "Avisos". */
test('la campana llama a la enfermera: con motivo, sigue activa entre secciones y se puede cancelar', async ({ page }) => {
  const dock = page.getByRole('contentinfo', { name: 'Controles' });
  await dock.getByRole('button', { name: 'Llamar a la enfermera' }).click();
  const sheet = page.getByRole('dialog', { name: 'Llamar a la enfermera' });
  await expect(sheet.getByText('el llamado todavía no llega a la enfermería')).toBeVisible();
  await sheet.getByRole('button', { name: 'Tengo dolor' }).click();
  await expect(sheet.getByRole('status')).toContainText('Llamado activo');
  await expect(sheet.getByRole('status')).toContainText('Tengo dolor');
  await sheet.getByRole('button', { name: 'Cerrar' }).click();

  // Still active while moving around the app
  await page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name: 'Mi mundo' }).click();
  await expect(dock.getByRole('button', { name: 'Llamado a la enfermera activo' })).toBeVisible();

  await dock.getByRole('button', { name: 'Llamado a la enfermera activo' }).click();
  await sheet.getByRole('button', { name: 'Cancelar llamado' }).click();
  await expect(sheet.getByRole('button', { name: 'Llamar a la enfermera' })).toBeVisible();
  await sheet.getByRole('button', { name: 'Cerrar' }).click();
  await expect(dock.getByRole('button', { name: 'Llamar a la enfermera' })).toBeVisible();

  // The app's notices are now in the top bar ("Avisos")
  await page.getByRole('button', { name: /^Avisos/ }).click();
  await expect(page.getByRole('dialog', { name: 'Avisos' })).toBeVisible();
});
