import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');

assert.match(app, /document\.createElement\("div"\)/, 'each day uses a non-interactive row container');
assert.match(app, /class="day-toggle"/, 'each day has a dedicated checkbox button');
assert.match(app, /class="clips"/, 'each day has a separate count input');

console.log('day-control-contract: ok');
