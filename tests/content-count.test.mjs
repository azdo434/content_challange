import assert from 'node:assert/strict';
import {
  clampContentCount,
  emptyState,
  normalizeState,
  personTotals,
} from '../js/state.js';

assert.equal(clampContentCount(-1), 0, 'negative counts clamp to 0');
assert.equal(clampContentCount(0), 0, '0 is accepted');
assert.equal(clampContentCount(1), 1, '1 is accepted');
assert.equal(clampContentCount(42), 42, 'intermediate values are accepted');
assert.equal(clampContentCount(100), 100, '100 is accepted');
assert.equal(clampContentCount(101), 100, 'values over 100 clamp to 100');

const normalized = normalizeState({
  viceo: [
    { done: true, clips: 0 },
    { done: true, clips: 100 },
  ],
  clipco: [],
  updatedAt: 10,
});
assert.deepEqual(normalized.viceo[0], { done: true, clips: 0 }, 'a completed day may keep a 0 count');
assert.deepEqual(normalized.viceo[1], { done: true, clips: 100 }, '100 survives normalization');
assert.deepEqual(personTotals(normalized.viceo), { days: 2, clips: 100 });

const empty = emptyState();
assert.equal(empty.viceo.length, 30);
assert.equal(empty.clipco.length, 30);

console.log('content-count: ok');
