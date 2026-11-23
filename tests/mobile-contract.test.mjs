import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, css, app] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../css/style.css', import.meta.url), 'utf8'),
  readFile(new URL('../js/app.js', import.meta.url), 'utf8'),
]);

assert.match(html, /data-title="VICEO"/, 'left mobile board has a visible title contract');
assert.match(html, /data-title="VIBE_COCOS"/, 'right mobile board has a visible title contract');
assert.match(html, /<script type="module" src="js\/app\.js\?v=7"><\/script>/, 'app loads as a versioned module');
assert.match(css, /@media \(max-width: 760px\)/, 'phone layout has a dedicated breakpoint');
assert.doesNotMatch(css, /min-width:\s*900px/, 'phone layout must not force a 900px canvas');
assert.match(css, /\.clips\s*\{[\s\S]*?opacity:\s*1;/, 'count field is visibly available without hover');
assert.match(app, /inputmode="numeric"/, 'count field requests a numeric phone keyboard');
assert.match(app, /max="100"/, 'count field accepts up to 100');

console.log('mobile-contract: ok');
