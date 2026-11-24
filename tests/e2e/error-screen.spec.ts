import { test, expect } from '@playwright/test';

// Not the shared fixture: it waits for the home screen, which is exactly what we break here.
test('pantalla de error: restablecer pide confirmación, guarda respaldo y no borra la multimedia', async ({ page }) => {
  // Home renders the date through longDate() -> getDay(). Throw on every render until the test flips the flag,
  // so React's automatic re-render also fails and the ErrorBoundary takes over.
  await page.addInitScript(() => {
    const orig = Date.prototype.getDay;
    Date.prototype.getDay = function (this: Date) {
      if (sessionStorage.getItem('nexo-test:crash') !== 'off') throw new Error('crash de prueba');
      return orig.call(this);
    };
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Algo no salió bien');
  await expect(page.getByRole('button', { name: 'Volver a intentar' })).toBeVisible();

  // Seed an IndexedDB blob (same schema as mediaStore) and a stored payload to back up.
  await page.evaluate(async () => {
    localStorage.setItem('nexo:data:v1', JSON.stringify({ version: 1, userName: 'Respaldo' }));
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('nexo-media', 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('blobs')) req.result.createObjectStore('blobs'); };
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const tx = req.result.transaction('blobs', 'readwrite');
        tx.objectStore('blobs').put(new Blob(['foto-de-prueba']), 'm-test');
        tx.oncomplete = () => { req.result.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
    });
  });

  // First tap only asks; Cancelar goes back.
  await page.getByRole('button', { name: 'Restablecer datos de demostración' }).click();
  await expect(page.getByRole('button', { name: 'Sí, restablecer' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('nexo:data:v1:respaldo'))).toBeNull();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByRole('button', { name: 'Restablecer datos de demostración' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sí, restablecer' })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('nexo:data:v1:respaldo'))).toBeNull();

  // Confirm: the crash no longer happens after the reload.
  await page.evaluate(() => sessionStorage.setItem('nexo-test:crash', 'off'));
  await page.getByRole('button', { name: 'Restablecer datos de demostración' }).click();
  await page.getByRole('button', { name: 'Sí, restablecer' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Leslie');

  const after = await page.evaluate(async () => ({
    backup: localStorage.getItem('nexo:data:v1:respaldo'),
    blob: await new Promise<string | null>((resolve, reject) => {
      const req = indexedDB.open('nexo-media', 1);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const get = req.result.transaction('blobs').objectStore('blobs').get('m-test');
        get.onsuccess = async () => { const b = get.result as Blob | undefined; resolve(b ? await b.text() : null); };
        get.onerror = () => reject(get.error);
      };
    }),
  }));
  expect(JSON.parse(after.backup!)).toEqual({ version: 1, userName: 'Respaldo' });
  expect(after.blob).toBe('foto-de-prueba');
});

test('Volver a intentar recarga y la app vuelve a funcionar', async ({ page }) => {
  await page.addInitScript(() => {
    const orig = Date.prototype.getDay;
    Date.prototype.getDay = function (this: Date) {
      if (sessionStorage.getItem('nexo-test:crash') !== 'off') throw new Error('crash de prueba');
      return orig.call(this);
    };
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Algo no salió bien');
  await page.evaluate(() => sessionStorage.setItem('nexo-test:crash', 'off'));
  await page.getByRole('button', { name: 'Volver a intentar' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Leslie');
});
