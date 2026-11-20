// Turns the single-file preview build into an HTML fragment for the Claude artifact viewer
// (it supplies its own <html>/<head>/<body> skeleton). Usage: node scripts/artifact-fragment.mjs <out.html>
import { readFileSync, writeFileSync } from 'node:fs';
const out = process.argv[2] ?? 'dist-artifact/nexo.html';
let html = readFileSync('dist-artifact/index.html', 'utf8');
html = html
  .replace(/<!doctype html>/i, '')
  .replace(/<\/?html[^>]*>/gi, '')
  .replace(/<\/?head>/gi, '')
  .replace(/<\/?body>/gi, '')
  .replace(/<meta charset="UTF-8" \/>/, '')
  .replace(/<meta name="viewport"[^>]*>/, '');
const title = '<title>NEXO</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n';
html = title + html.replace(/<title>NEXO<\/title>/, '');
writeFileSync(out, html.trim() + '\n');
console.log(out, (html.length / 1e6).toFixed(2), 'MB');
