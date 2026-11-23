import assert from 'node:assert/strict';
import { markContentCount } from '../js/state.js';

assert.deepEqual(
  markContentCount({ done: false, clips: 9 }, 0),
  { done: true, clips: 0 },
  'entering 0 marks the day complete and preserves zero',
);

assert.deepEqual(
  markContentCount({ done: false, clips: 0 }, 100),
  { done: true, clips: 100 },
  'entering a positive count also marks the day complete',
);

console.log('zero-status: ok');
