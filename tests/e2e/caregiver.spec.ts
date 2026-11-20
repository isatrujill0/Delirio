import { test, expect, readData, enterPin } from './fixtures';

test('PIN de cuidador: incorrecto no abre nada, correcto ejecuta, Bloquear vuelve a pedirlo y Restablecer lo exige', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name: 'Mi gente' }).click();
  const add = page.locator('[aria-label="Tus personas"]').getByRole('button', { name: 'Agregar' });
  const pinDialog = page.getByRole('dialog', { name: 'Modo cuidador' });
  const form = page.getByRole('dialog', { name: 'Agregar a alguien' });
  const lockChip = page.getByRole('button', { name: 'Modo cuidador · Bloquear' });

  // Wrong PIN: error, the field clears, nothing opens, still locked.
  await add.click();
  await pinDialog.getByLabel('PIN de cuidador').fill('0000');
  await pinDialog.getByRole('button', { name: 'Continuar' }).click();
  await expect(pinDialog.getByRole('alert')).toContainText('PIN incorrecto');
  await expect(pinDialog.getByLabel('PIN de cuidador')).toHaveValue('');
  await expect(form).toHaveCount(0);
  await expect(lockChip).toHaveCount(0);

  // Correct PIN runs the action and unlocks.
  await pinDialog.getByLabel('PIN de cuidador').fill('1234');
  await pinDialog.getByRole('button', { name: 'Continuar' }).click();
  await expect(pinDialog).toBeHidden();
  await expect(form).toBeVisible();
  await expect(lockChip).toBeVisible();
  await form.getByRole('button', { name: 'Cancelar' }).click();
  await add.click(); // unlocked: no prompt
  await expect(form).toBeVisible();
  await expect(pinDialog).toHaveCount(0);
  await form.getByRole('button', { name: 'Cancelar' }).click();

  // Re-lock from the top bar: the next edit asks again.
  await lockChip.click();
  await expect(page.getByRole('status')).toContainText('Modo cuidador bloqueado');
  await expect(lockChip).toHaveCount(0);
  await add.click();
  await expect(pinDialog).toBeVisible();
  await expect(form).toHaveCount(0);
  await pinDialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(pinDialog).toBeHidden();

  // Reset demo data needs the PIN too (still locked).
  await page.getByRole('button', { name: 'Configuración' }).click();
  const settings = page.getByRole('dialog', { name: 'Configuración' });
  await settings.getByRole('radio', { name: 'Contenido' }).click();
  await settings.getByRole('button', { name: 'Restablecer datos de demostración' }).click();
  await expect(pinDialog).toBeVisible();
  await expect(page.getByRole('dialog', { name: '¿Restablecer los datos?' })).toHaveCount(0);
  await enterPin(page);
  const confirm = page.getByRole('dialog', { name: '¿Restablecer los datos?' });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Cancelar' }).click();
  expect((await readData(page)).contacts).toHaveLength(4);
});
