// Runs the real app (production build served by `vite preview`) and drives it like a person would:
// every section at iPad Air 11" landscape (1180×820), Safari-with-toolbar height (1180×760) and portrait (820×1180).
// Checks: console errors, horizontal/vertical page overflow, clipped section content, music really plays (the audio clock advances),
// and (landscape) every visible, enabled button/link/radio/switch is at least 56×56 CSS px.
// Usage: node scripts/smoke.cjs [outDir]   (expects the app at http://localhost:4180/, e.g. `npx vite preview --port 4180`)
const { chromium } = require('@playwright/test');
const { mkdirSync } = require('node:fs');

const URL = process.env.NEXO_URL || 'http://localhost:4180/';
const out = process.argv[2] || 'verify-output/smoke';
mkdirSync(out, { recursive: true });

const SIZES = [
  ['landscape', 1180, 820],
  ['safari', 1180, 760],
  ['portrait', 820, 1180],
];
const MIN_TARGET = 56;
const SECTIONS = [['Inicio', 'inicio'], ['Mi gente', 'gente'], ['Mi mundo', 'mundo'], ['Mi cuidado', 'cuidado']];

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const problems = [];
  for (const [label, w, h] of SIZES) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: true });
    const errors = [];
    // Record every media element that starts playing, so playback can be judged by its clock.
    await page.addInitScript(() => {
      window.__media = [];
      const orig = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        if (!window.__media.includes(this)) window.__media.push(this);
        return orig.call(this);
      };
    });
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(URL);
    await page.addStyleTag({ content: '*{animation-duration:0s!important;transition-duration:0s!important}' });
    for (const [name, id] of SECTIONS) {
      await page.getByRole('button', { name, exact: true }).click();
      await page.waitForTimeout(300);
      const r = await page.evaluate((portrait) => {
        const de = document.documentElement;
        const stage = document.querySelector('.stage').getBoundingClientRect();
        const pageEl = document.querySelector('.stage > .page');
        const clipped = portrait ? [] : [...document.querySelectorAll('.stage > .page > *')]
          .filter((k) => { const b = k.getBoundingClientRect(); return b.right > stage.right + 1 || (b.bottom > stage.bottom + 1 && getComputedStyle(pageEl).overflowY !== 'auto'); })
          .map((k) => k.className);
        const scroll = pageEl.scrollHeight - pageEl.clientHeight;
        return { hScroll: de.scrollWidth > innerWidth, clipped, innerScroll: scroll };
      }, label === 'portrait');
      if (r.hScroll) problems.push(`${label}/${id}: horizontal page scroll`);
      if (r.clipped.length) problems.push(`${label}/${id}: content outside the stage: ${r.clipped.join(', ')}`);
      if (label === 'landscape' && r.innerScroll > 2) problems.push(`${label}/${id}: section needs ${r.innerScroll}px of scrolling at 1180×820`);
      if (label === 'landscape') {
        const small = await page.evaluate((min) => {
          const name = (el) => (el.getAttribute('aria-label') || el.innerText || el.title || el.className || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 60);
          const out = new Map();
          for (const el of document.querySelectorAll('button, a[href], [role="radio"], [role="switch"]')) {
            if (el.disabled || el.getAttribute('aria-disabled') === 'true') continue;
            const cs = getComputedStyle(el);
            const b = el.getBoundingClientRect();
            if (cs.visibility === 'hidden' || cs.display === 'none' || b.width === 0 || b.height === 0) continue;
            if (b.width < min - 0.5 || b.height < min - 0.5) out.set(`${name(el)} (${Math.round(b.width)}×${Math.round(b.height)})`, 1);
          }
          return [...out.keys()];
        }, MIN_TARGET);
        for (const v of small) problems.push(`${label}/${id}: touch target under ${MIN_TARGET}×${MIN_TARGET}px: ${v}`);
      }
      await page.screenshot({ path: `${out}/${label}-${id}.png` });
    }
    if (label === 'landscape') {
      // Real playback: start "Mi playlist" and confirm the audio clock advances.
      await page.getByRole('button', { name: 'Mi mundo', exact: true }).click();
      await page.getByRole('button', { name: 'Reproducir Mi playlist' }).click();
      // Real output: a recorded media element must be playing and its clock must advance.
      const advanced = await page
        .waitForFunction(() => window.__media.some((m) => !m.paused && m.currentTime > 0.3 && !m.error), null, { timeout: 8000 })
        .then(() => true, () => false);
      if (!advanced) problems.push('playback: no media element advanced its currentTime after pressing play');
      await page.getByRole('button', { name: 'Pausar' }).first().click();
    }
    if (errors.length) problems.push(`${label}: console errors: ${errors.join(' | ')}`);
    await page.close();
  }
  await browser.close();
  console.log(problems.length ? `SMOKE FAIL\n- ${problems.join('\n- ')}` : `SMOKE PASS (screenshots in ${out})`);
  process.exit(problems.length ? 1 : 0);
})();
