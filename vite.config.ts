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

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'artifact' ? [react(), viteSingleFile(), stripPwaTags] : [react()],
  build: {
    outDir: mode === 'artifact' ? 'dist-artifact' : 'dist',
    copyPublicDir: mode !== 'artifact',
    assetsInlineLimit: mode === 'artifact' ? 100_000_000 : 4096,
  },
}));
