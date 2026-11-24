import { test, expect } from './fixtures';

/** Without a camera (as in the test browser), the hummingbird game is played with a finger. */
test('Vuelo del colibrí: sin cámara se juega con el dedo y el colibrí sigue el dedo', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name: 'Mi mundo' }).click();
  await page.getByRole('button', { name: /Vuelo del colibrí/ }).first().click();
  const game = page.getByRole('dialog', { name: 'Vuelo del colibrí' });
  await expect(game.locator('.game-hint')).toContainText('mueve el colibrí con el dedo');
  await expect(game.getByText('no se graba ni se envía')).toBeVisible();
  await game.getByRole('button', { name: 'Empezar' }).click();

  const canvas = game.locator('.flight-canvas');
  const box = (await canvas.boundingBox())!;
  const birdY = async () => Number(await canvas.getAttribute('data-bird'));
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.15);
  await page.mouse.down();
  await expect.poll(birdY).toBeLessThan(0.25);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.85);
  await expect.poll(birdY).toBeGreaterThan(0.75);
  await page.mouse.up();

  await game.getByRole('button', { name: 'Pausar' }).click();
  const paused = await birdY();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.2);
  await page.mouse.down();
  await page.waitForTimeout(500);
  expect(await birdY()).toBe(paused);
});
