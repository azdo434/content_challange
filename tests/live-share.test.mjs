import assert from 'node:assert/strict';

const base = (process.env.LIVE_URL || 'https://contentchallange.vercel.app').replace(/\/$/, '');
const first = {
  viceo: [{ done: true, clips: 3 }],
  clipco: [],
  updatedAt: Date.now(),
};

const created = await fetch(`${base}/api/state`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(first),
});
if (created.status !== 201) {
  throw new Error(`create failed: ${created.status} ${await created.text()}`);
}
const createdBody = await created.json();
assert.match(createdBody.id, /^[a-zA-Z0-9_-]{6,80}$/);

const fetched = await fetch(`${base}/api/state?b=${encodeURIComponent(createdBody.id)}`);
if (fetched.status !== 200) {
  throw new Error(`get failed: ${fetched.status} ${await fetched.text()}`);
}
const fetchedBody = await fetched.json();
assert.equal(fetchedBody.state.viceo[0].clips, 3);

const second = {
  ...first,
  viceo: [{ done: true, clips: 7 }],
  updatedAt: Date.now() + 1,
};
const updated = await fetch(`${base}/api/state?b=${encodeURIComponent(createdBody.id)}`, {
  method: 'PUT',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(second),
});
if (updated.status !== 200) {
  throw new Error(`update failed: ${updated.status} ${await updated.text()}`);
}

const refetched = await fetch(`${base}/api/state?b=${encodeURIComponent(createdBody.id)}`);
assert.equal(refetched.status, 200);
const refetchedBody = await refetched.json();
assert.equal(refetchedBody.state.viceo[0].clips, 7);

console.log(JSON.stringify({ ok: true, id: createdBody.id, base }));
