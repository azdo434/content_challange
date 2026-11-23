import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');

assert.match(app, /let hasSyncedBoard = false;/, 'the first remote pull is tracked');
assert.match(app, /setMode\("syncing"\)/, 'shared links expose an initial syncing state');
assert.match(app, /document\.activeElement\?\.classList\.contains\("clips"\)/, 'polling does not interrupt count entry');
assert.match(app, /remote\.updatedAt > state\.updatedAt/, 'equal timestamps do not trigger needless rerenders');

console.log('share-sync-contract: ok');
