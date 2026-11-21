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
  await page.getByRole('complementary', { name: 'Panel de Mamá' }).getByRole('button', { name: 'Fotos' }).click();
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

test('un mensaje de video guarda un blob y eliminarlo lo borra', async ({ page }) => {
  expect(await blobCount(page)).toBe(0);
  await people(page).click();
  const panel = page.getByRole('complementary', { name: 'Panel de Mamá' });
  await panel.getByRole('button', { name: 'Grabar mensaje' }).click();
  const composer = page.getByRole('dialog', { name: 'Mensaje de Mamá' });
  await composer.getByRole('radio', { name: 'Video' }).click();
  await composer.locator('input[type=file][accept="video/*"]').setInputFiles(asset('src/assets/video/recuerdos-en-familia.mp4'));
  await composer.getByRole('button', { name: 'Guardar mensaje' }).click();
  await expect(page.getByRole('status')).toContainText('Mensaje guardado');
  await expect.poll(() => blobCount(page)).toBe(1);
  expect((await readData(page)).messages.filter((m: { kind: string; media?: string }) => m.kind === 'video' && m.media?.startsWith('idb:'))).toHaveLength(1);

  await panel.getByRole('button', { name: 'Mensajes', exact: true }).click();
  await page.getByRole('button', { name: 'Ver video de Mamá' }).click();
  const viewer = page.getByRole('dialog', { name: 'Video de Mamá' });
  await viewer.getByRole('button', { name: 'Eliminar mensaje' }).click();
  await enterPin(page);
  await page.getByRole('dialog', { name: '¿Eliminar este mensaje?' }).getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByRole('status')).toContainText('Mensaje eliminado');
  await expect.poll(() => blobCount(page)).toBe(0);
  expect((await readData(page)).messages.filter((m: { kind: string }) => m.kind === 'video')).toHaveLength(1); // only Karen's demo video remains
});
