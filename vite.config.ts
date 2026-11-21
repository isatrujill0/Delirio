import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `--mode artifact` builds a single self-contained HTML file (fonts and images inlined)
// for previewing; the default build is the PWA for GitHub Pages.
// The preview has no manifest, icons or service worker next to it: drop those tags.
const stripPwaTags = {
  name: 'strip-pwa-tags',
  transformIndexHtml: (html: string) => html.replace(/\s*<link rel="(manifest|icon|apple-touch-icon)"[^>]*>/g, ''),
};

// Lists every built file in precache.json so the service worker can store the whole app
// (JS, CSS, fonts, images, music, video) on the first visit, not only what that visit happened to load.
const precacheList = {
  name: 'precache-list',
  apply: 'build' as const,
  generateBundle(this: { emitFile: (f: { type: 'asset'; fileName: string; source: string }) => void }, _: unknown, bundle: Record<string, unknown>) {
    const files = Object.keys(bundle).filter((f) => f !== 'index.html' && !f.endsWith('.map'));
    this.emitFile({ type: 'asset', fileName: 'precache.json', source: JSON.stringify(files) });
  },
};

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'artifact' ? [react(), viteSingleFile(), stripPwaTags] : [react(), precacheList],
  build: {
    outDir: mode === 'artifact' ? 'dist-artifact' : 'dist',
    copyPublicDir: mode !== 'artifact',
    assetsInlineLimit: mode === 'artifact' ? 100_000_000 : 4096,
  },
}));
