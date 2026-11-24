import { test, expect, reload } from './fixtures';

test.use({ launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } });

test('tras la primera visita la app abre y reproduce música sin conexión', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  // The worker installs, then every file in precache.json is in the cache.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  const missing = () =>
    page.evaluate(async () => {
      const files: string[] = await (await fetch('/precache.json', { cache: 'no-store' })).json();
      // Whatever the current cache version is called (nexo-v2, nexo-v3, …).
      const name = (await caches.keys()).find((k) => k.startsWith('nexo-'));
      if (!name) return ['(no cache yet)'];
      const cached = new Set((await (await caches.open(name)).keys()).map((r) => new URL(r.url).pathname));
      return [...files.map((f) => `/${f}`), '/models/tiny_face_detector_model.bin'].filter((p) => !cached.has(p));
    });
  await expect.poll(missing, { timeout: 20_000 }).toEqual([]);
  expect((await page.evaluate(() => fetch('/precache.json').then((r) => r.json()))).length).toBeGreaterThan(10);

  await context.setOffline(true);
  const ranged: { status: number; range: string | null; sw: boolean }[] = [];
  page.on('response', (r) => {
    if (r.status() === 206) ranged.push({ status: 206, range: r.headers()['content-range'] ?? null, sw: r.fromServiceWorker() });
  });
  await reload(page);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Leslie');

  // Music (Range requests) is served from the cache.
  await page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name: 'Mi mundo' }).click();
  await page.getByRole('button', { name: /^Música/ }).click();
  await page.getByRole('button', { name: 'Reproducir Amanecer sereno' }).click();
  const state = () =>
    page.evaluate(() => {
      const a = (window as unknown as { __audios: HTMLAudioElement[] }).__audios[0];
      return a ? { t: a.currentTime, paused: a.paused, error: a.error?.code ?? null } : null;
    });
  await expect.poll(async () => (await state())?.t ?? 0, { timeout: 10_000 }).toBeGreaterThan(0.3);
  expect((await state())?.error).toBeNull();
  // Offline, at least one media Range request was answered by the service worker with 206 + Content-Range.
  await expect.poll(() => ranged.filter((r) => r.sw && /^bytes \d+-\d+\/\d+$/.test(r.range ?? '')).length).toBeGreaterThan(0);
  await expect(page.getByRole('contentinfo', { name: 'Controles' }).getByText('No se pudo')).toHaveCount(0);
  expect(errors).toEqual([]);
});
