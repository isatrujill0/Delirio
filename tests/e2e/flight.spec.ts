import { test, expect } from './fixtures';

/** Without a camera (as in the test browser), the hummingbird game is played with a finger. */
test('Vuelo del colibrí: sin cámara se juega con el dedo y el colibrí sigue el dedo', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name: 'Mi mundo' }).click();
  await page.getByRole('button', { name: /Vuelo del colibrí/ }).first().click();
  const game = page.getByRole('dialog', { name: 'Vuelo del colibrí' });
  // Head mode first asks to turn the camera on; this test plays with a finger instead.
  await expect(game.getByRole('button', { name: 'Activar cámara' })).toBeVisible();
  await game.locator('.flight-camera-ask').getByRole('button', { name: 'Jugar con el dedo' }).click();
  await expect(game.locator('.game-hint')).toContainText('Desliza el dedo');
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

test('Vuelo del colibrí: chocar con un arco termina la ronda y «Jugar otra vez» la reinicia', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name: 'Mi mundo' }).click();
  await page.getByRole('button', { name: /Vuelo del colibrí/ }).first().click();
  const game = page.getByRole('dialog', { name: 'Vuelo del colibrí' });
  await game.locator('.flight-camera-ask').getByRole('button', { name: 'Jugar con el dedo' }).click();
  await game.getByRole('button', { name: 'Empezar' }).click();
  const canvas = game.locator('.flight-canvas');
  const box = (await canvas.boundingBox())!;
  // Openings are never at the very top, so keeping the bird there hits the first arch.
  await page.mouse.move(box.x + box.width / 2, box.y + 4);
  await page.mouse.down();
  const over = game.getByRole('alert');
  await expect(over).toContainText('¡Chocaste!', { timeout: 15_000 });
  await expect(over).toContainText('Pasaste 0 arcos');
  await page.mouse.up();
  const frozen = await canvas.getAttribute('data-bird');
  await page.waitForTimeout(400);
  expect(await canvas.getAttribute('data-bird')).toBe(frozen); // stopped

  await over.getByRole('button', { name: 'Jugar otra vez' }).click();
  await expect(game.getByRole('alert')).toHaveCount(0);
  await expect(game.getByRole('button', { name: 'Pausar' })).toBeVisible();
  await expect.poll(async () => Number(await canvas.getAttribute('data-bird'))).toBeCloseTo(0.5, 1); // fresh round
});

test('Vuelo del colibrí: si la cámara no se puede usar, explica por qué y ofrece reintentar o jugar con el dedo', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name: 'Mi mundo' }).click();
  await page.getByRole('button', { name: /Vuelo del colibrí/ }).first().click();
  const game = page.getByRole('dialog', { name: 'Vuelo del colibrí' });
  await game.getByRole('button', { name: 'Activar cámara' }).click(); // the test browser has no camera
  await expect(game.locator('.flight-camera-ask').getByRole('alert')).toContainText(/cámara/);
  await expect(game.getByRole('button', { name: 'Intentar otra vez' })).toBeVisible();
  await expect(game.getByRole('button', { name: 'Empezar' })).toBeDisabled();
  await game.locator('.flight-camera-ask').getByRole('button', { name: 'Jugar con el dedo' }).click();
  await expect(game.getByRole('button', { name: 'Empezar' })).toBeEnabled();
});

test('Vuelo del colibrí: «Salir del juego» y la X cierran el juego, también mientras se juega', async ({ page }) => {
  const open = async () => {
    await page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name: 'Mi mundo' }).click();
    await page.getByRole('button', { name: /Vuelo del colibrí/ }).first().click();
    return page.getByRole('dialog', { name: 'Vuelo del colibrí' });
  };
  let game = await open();
  await game.locator('.flight-camera-ask').getByRole('button', { name: 'Jugar con el dedo' }).click();
  await game.getByRole('button', { name: 'Empezar' }).click();
  await game.getByRole('button', { name: 'Salir del juego' }).click();
  await expect(game).toHaveCount(0);

  game = await open();
  await game.getByRole('button', { name: 'Cerrar' }).click();
  await expect(game).toHaveCount(0);
});
