import { test, expect } from './fixtures';

/**
 * "Completa el refrán" can be played by voice: the proverb and its options are read aloud, and the
 * answer can be spoken. Speech synthesis and recognition are replaced by deterministic fakes.
 */
test('el refrán se lee en voz alta y se puede responder hablando', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __spoken: string[]; __heard: string[]; webkitSpeechRecognition: unknown; SpeechRecognition: unknown };
    w.__spoken = [];
    w.__heard = [];
    speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
      w.__spoken.push(u.text);
      setTimeout(() => u.onend?.(new Event('end') as SpeechSynthesisEvent), 10);
    };
    speechSynthesis.cancel = () => {};
    class FakeRecognition {
      lang = '';
      interimResults = false;
      continuous = false;
      maxAlternatives = 1;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        const said = w.__heard.shift() ?? '';
        setTimeout(() => {
          this.onresult?.({ results: [[{ transcript: said }]] });
          this.onend?.();
        }, 20);
      }
      abort() {}
    }
    w.webkitSpeechRecognition = FakeRecognition;
    w.SpeechRecognition = FakeRecognition;
  });
  await page.reload();
  await page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name: 'Mi mundo' }).click();
  await page.getByRole('button', { name: /Completa el refrán/ }).first().click();
  const game = page.getByRole('dialog', { name: 'Completa el refrán' });

  // The proverb and its three numbered options are read aloud as soon as it appears.
  const start = (await game.getByRole('heading', { level: 3 }).textContent())!.replace('…', '');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.join(' | '))).toContain(start);
  const spoken = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.at(-1)!);
  expect(spoken).toContain('Opción 1:');
  expect(spoken).toContain('Opción 3:');

  // Something unrelated is not taken as an answer.
  await page.evaluate(() => (window as unknown as { __heard: string[] }).__heard.push('tengo sed'));
  await game.getByRole('button', { name: 'Responder con la voz' }).click();
  await expect(game.getByRole('alert')).toContainText('No coincide con ninguna opción');

  // Saying the right ending answers it.
  const right = await page.evaluate((s) => {
    const PROVERBS = [['Al que madruga', 'Dios le ayuda'], ['Más vale tarde', 'que nunca'], ['Camarón que se duerme', 'se lo lleva la corriente'], ['No por mucho madrugar', 'amanece más temprano'], ['A caballo regalado', 'no se le miran los dientes'], ['Más vale pájaro en mano', 'que cien volando'], ['Del dicho al hecho', 'hay mucho trecho'], ['Perro que ladra', 'no muerde'], ['Dime con quién andas', 'y te diré quién eres'], ['En boca cerrada', 'no entran moscas']];
    return PROVERBS.find(([a]) => s.startsWith(a))![1];
  }, start);
  await page.evaluate((r) => (window as unknown as { __heard: string[] }).__heard.push(`creo que ${r}`), right);
  await game.getByRole('button', { name: 'Responder con la voz' }).click();
  await expect(game.getByText('¡Correcto!')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.at(-1) ?? '')).toContain('¡Correcto!');
});
