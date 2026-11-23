import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, app, css] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../js/app.js', import.meta.url), 'utf8'),
  readFile(new URL('../css/style.css', import.meta.url), 'utf8'),
]);

assert.match(html, /<button type="button" id="reset-btn" hidden>RESET<\/button>/, 'reset is hidden from accidental clicks');
assert.match(app, /row\.done && row\.clips === 0 \? " is-zero" : ""/, 'completed zero rows get a zero-status class');
assert.match(css, /\.day\.is-done\.is-zero \.box::before/,'zero status draws the first cross stroke');
assert.match(css, /\.day\.is-done\.is-zero \.box::after/,'zero status draws the second cross stroke');

console.log('zero-visual-reset: ok');
