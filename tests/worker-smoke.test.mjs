import assert from 'node:assert/strict';
import worker from '../src/index.js';

const homepage = await worker.fetch(new Request('https://candidate.invalid/'), {}, {});
assert.equal(homepage.status, 200);
assert.match(await homepage.text(), /2020KHODA/);

const health = await worker.fetch(new Request('https://candidate.invalid/health'), {}, {});
assert.equal(health.status, 200);
const healthBody = await health.json();
assert.equal(healthBody.ok, true);
assert.equal(healthBody.database, 'error');

const dataApi = await worker.fetch(new Request('https://candidate.invalid/api/chats'), {}, {});
assert.equal(dataApi.status, 503);
const dataBody = await dataApi.json();
assert.equal(dataBody.error, 'DATABASE_NOT_BOUND');

console.log('PASS: public shell and health stay available; data APIs remain gated without D1.');
