import type { Page } from '@playwright/test';
import { test, expect, readData, enterPin } from './fixtures';

/** Number of blobs in IndexedDB (same schema the app creates, so opening it first is harmless). */
const blobCount = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open('nexo-media', 1);
        open.onupgradeneeded = () => open.result.createObjectStore('blobs');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const req = db.transaction('blobs').objectStore('blobs').count();
          req.onsuccess = () => { db.close(); resolve(req.result); };
          req.onerror = () => reject(req.error);
        };
      }),
  );

// Playwright resolves relative file paths from the working directory (the project root).
const asset = (p: string) => p;
const people = (page: Page) => page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name: 'Mi gente' });

test('una foto agregada guarda un blob y eliminarla (con PIN y confirmación) lo borra', async ({ page }) => {
  expect(await blobCount(page)).toBe(0);
  await people(page).click();
  // The album now lives in the person's profile (⋯).
  await page.getByRole('button', { name: 'Perfil de Mamá' }).click();
  await page.getByRole('dialog', { name: 'Mamá' }).getByRole('button', { name: 'Ver fotos de Mamá' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Fotos de Mamá' })).toBeVisible();
  const photosOf = async () => (await readData(page)).photos.filter((p: { contactId?: string }) => p.contactId === 'c-mama').length;
  const before = await photosOf();

  await page.locator('input[type=file]').setInputFiles(asset('src/assets/img/karen.jpg'));
  await expect(page.getByRole('status')).toContainText('Foto agregada');
  await expect.poll(() => blobCount(page)).toBe(1);
  expect(await photosOf()).toBe(before + 1);

  await page.getByRole('button', { name: 'Foto 1', exact: true }).click();
  await page.getByRole('dialog', { name: 'Foto' }).getByRole('button', { name: 'Eliminar foto' }).click();
  await enterPin(page);
  const confirm = page.getByRole('dialog', { name: '¿Eliminar esta foto?' });
  await confirm.getByRole('button', { name: 'Cancelar' }).click();
  expect(await blobCount(page)).toBe(1); // cancelling keeps the blob
  expect(await photosOf()).toBe(before + 1);

  await page.getByRole('dialog', { name: 'Foto' }).getByRole('button', { name: 'Eliminar foto' }).click();
  await page.getByRole('dialog', { name: '¿Eliminar esta foto?' }).getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByRole('status')).toContainText('Foto eliminada');
  await expect.poll(() => blobCount(page)).toBe(0);
  expect(await photosOf()).toBe(before);
});

test('una foto enviada en el chat guarda un blob y eliminar el mensaje lo borra', async ({ page }) => {
  expect(await blobCount(page)).toBe(0);
  await people(page).click();
  const panel = page.getByRole('complementary', { name: 'Panel de Mamá' });
  await panel.getByRole('button', { name: 'Mensajes', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mamá' })).toBeVisible();
  await page.getByLabel('Escribe un mensaje').fill('Mira mi desayuno');
  await page.locator('.chat-bar input[type=file]').setInputFiles(asset('src/assets/img/karen.jpg'));
  await expect.poll(() => blobCount(page)).toBe(1);
  const sent = (await readData(page)).messages.filter((m: { kind: string; demo: boolean }) => m.kind === 'imagen' && !m.demo);
  expect(sent).toHaveLength(1);
  expect(sent[0]).toMatchObject({ from: 'paciente', text: 'Mira mi desayuno' });
  expect(sent[0].media.startsWith('idb:')).toBe(true);

  await page.locator('.bubble-row.is-mine .bubble-imagen').last().click();
  const viewer = page.getByRole('dialog', { name: /^Foto de/ });
  await viewer.getByRole('button', { name: 'Eliminar mensaje' }).click();
  await enterPin(page);
  await page.getByRole('dialog', { name: '¿Eliminar este mensaje?' }).getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByRole('status')).toContainText('Mensaje eliminado');
  await expect.poll(() => blobCount(page)).toBe(0);
  expect((await readData(page)).messages.filter((m: { kind: string; demo: boolean }) => m.kind === 'imagen' && !m.demo)).toHaveLength(0);
});
