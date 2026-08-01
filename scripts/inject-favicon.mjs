// `redocly build-docs` has no built-in favicon option, so this runs right
// after it (see `npm run build`) and inserts one into the generated
// index.html. favicon.png is Anchor's actual app icon (copied from
// anchor/assets/icon.png), not a placeholder.
import { readFileSync, writeFileSync } from 'node:fs';

const HTML_PATH = 'index.html';
const FAVICON_TAG = '<link rel="icon" type="image/png" href="/favicon.png" />';

const html = readFileSync(HTML_PATH, 'utf-8');

if (html.includes(FAVICON_TAG)) {
  process.exit(0); // already injected
}

const marker = '</title>';
const idx = html.indexOf(marker);
if (idx === -1) {
  throw new Error(`Could not find "${marker}" in ${HTML_PATH} to inject the favicon after`);
}

const insertAt = idx + marker.length;
const updated = html.slice(0, insertAt) + '\n  ' + FAVICON_TAG + html.slice(insertAt);

writeFileSync(HTML_PATH, updated);
