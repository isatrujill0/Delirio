import { test, expect, readData, reload, enterPin } from './fixtures';

test.use({ launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } });

const audioState = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const a = (window as unknown as { __audios: HTMLAudioElement[] }).__audios;
    return { count: a.length, paused: a[0]?.paused ?? null, t: a[0]?.currentTime ?? 0, src: a[0]?.src ?? '' };
  });

test('música real en Mi mundo, volumen del dock, estado de ánimo y tratamiento persisten', async ({ page }) => {
  const rail = page.getByRole('navigation', { name: 'Secciones' });
  const dock = page.getByRole('contentinfo', { name: 'Controles' }).or(page.locator('footer[aria-label="Controles"]'));

  // --- Música ---
  await rail.getByRole('button', { name: 'Mi mundo' }).click();
  await page.getByRole('button', { name: /^Música/ }).click();
  await page.getByRole('button', { name: 'Reproducir Amanecer sereno' }).click();
  await expect(dock.getByText('Amanecer sereno')).toBeVisible();
  await expect.poll(async () => (await audioState(page)).paused).toBe(false);
  expect((await audioState(page)).count).toBe(1);
  expect((await audioState(page)).src).toContain('.m4a');
  await expect.poll(async () => (await audioState(page)).t, { timeout: 10_000 }).toBeGreaterThan(0.3);

  await dock.getByRole('button', { name: 'Pausar', exact: true }).click();
  await expect.poll(async () => (await audioState(page)).paused).toBe(true);
  await expect(dock.getByRole('button', { name: 'Reproducir', exact: true })).toBeVisible();
  await expect(dock.getByText('En pausa')).toBeVisible();
  const frozen = (await audioState(page)).t;
  await expect.poll(async () => (await audioState(page)).t).toBe(frozen);

  await dock.getByRole('button', { name: 'Reproducir', exact: true }).click();
  await expect.poll(async () => (await audioState(page)).paused).toBe(false);
  await dock.getByRole('button', { name: 'Pausar', exact: true }).click();
  await expect.poll(async () => (await audioState(page)).paused).toBe(true);

  // --- Volumen ---
  const meter = dock.getByRole('meter', { name: 'Volumen' });
  const before = Number(await meter.getAttribute('aria-valuenow'));
  await dock.getByRole('button', { name: 'Subir volumen' }).click();
  await dock.getByRole('button', { name: 'Subir volumen' }).click();
  await expect(meter).toHaveAttribute('aria-valuenow', String(before + 20));
  await dock.getByRole('button', { name: 'Bajar volumen' }).click();
  await expect(meter).toHaveAttribute('aria-valuenow', String(before + 10));
  await expect.poll(async () => (await readData(page)).prefs.volume).toBe(before + 10);

  // --- Mi cuidado: ánimo ---
  await rail.getByRole('button', { name: 'Mi cuidado' }).click();
  const mood = page.getByRole('radiogroup', { name: 'Cómo te sientes hoy' });
  await mood.getByRole('radio', { name: 'Cansado' }).click();
  await expect(mood.getByRole('radio', { name: 'Cansado' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('status')).toContainText('Hoy te sientes: cansado');

  // --- Tratamiento ---
  await page.getByRole('button', { name: /Mi tratamiento/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mi tratamiento' })).toBeVisible();
  await page.getByRole('button', { name: 'Registrar' }).click();
  await enterPin(page);
  const form = page.getByRole('dialog', { name: 'Registrar tratamiento' });
  await form.getByRole('button', { name: 'Guardar' }).click();
  await expect(form.getByRole('alert').filter({ hasText: 'Escribe el nombre del tratamiento.' })).toBeVisible();
  await expect(form.getByRole('alert').filter({ hasText: 'Indica cada cuánto se aplica.' })).toBeVisible();
  await form.getByLabel('Nombre', { exact: true }).fill('Vitamina D');
  await form.getByLabel('Frecuencia').fill('cada día');
  await form.getByLabel('Horas para recordar (opcional)').fill('25:00');
  await form.getByRole('button', { name: 'Guardar' }).click();
  await expect(form.getByRole('alert')).toContainText('Usa horas como 08:00');
  await form.getByLabel('Horas para recordar (opcional)').fill('07:30');
  await form.getByRole('button', { name: 'Guardar' }).click();
  await expect(form).toBeHidden();
  await expect(page.getByRole('heading', { level: 3, name: 'Vitamina D' })).toBeVisible();

  await reload(page);
  const data = await readData(page);
  expect(data.prefs.volume).toBe(before + 10);
  expect(data.treatments.map((t: { name: string }) => t.name)).toContain('Vitamina D');
  expect(data.moods.at(-1).value).toBe(2);
  await expect(page.getByRole('meter', { name: 'Volumen' })).toHaveAttribute('aria-valuenow', String(before + 10));
  await rail.getByRole('button', { name: 'Mi cuidado' }).click();
  await expect(page.getByRole('radio', { name: 'Cansado' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: /Mi tratamiento/ }).click();
  await expect(page.getByRole('heading', { level: 3, name: 'Vitamina D' })).toBeVisible();
});
