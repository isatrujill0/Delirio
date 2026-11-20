// Renders the NEXO app icons (PNG) from an inline SVG with Playwright. Run: npm run icons
const { chromium } = require('playwright');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const root = join(__dirname, '..');
const font = readFileSync(join(root, 'src/assets/fonts/lexend-latin.woff2')).toString('base64');
const svg = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a3291"/><stop offset="0.6" stop-color="#4a4fc4"/><stop offset="1" stop-color="#8a74f0"/></linearGradient>
    <radialGradient id="glow" cx="0.5" cy="1" r="0.8"><stop offset="0" stop-color="#d8c8ff" stop-opacity="0.7"/><stop offset="1" stop-color="#d8c8ff" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="512" fill="url(#glow)"/>
  <g transform="translate(256 ${266}) scale(${1 - pad})">
    <path d="M-112 -70 Q0 -170 112 -70" fill="none" stroke="#fff" stroke-width="22" stroke-linecap="round"/>
    <text x="0" y="60" text-anchor="middle" font-family="Lexend" font-size="150" font-weight="400" letter-spacing="10" fill="#fff">NEXO</text>
  </g>
</svg>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 512, height: 512 } });
  const render = async (pad, size, file) => {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<style>@font-face{font-family:Lexend;src:url(data:font/woff2;base64,${font})}html,body{margin:0}svg{width:${size}px;height:${size}px;display:block}</style>${svg(pad)}`);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: join(root, 'public/icons', file) });
  };
  await render(0.12, 512, 'icon-512.png');
  await render(0.12, 192, 'icon-192.png');
  await render(0.3, 512, 'icon-maskable-512.png');
  await render(0.12, 180, 'apple-touch-icon.png');
  await b.close();
})();
