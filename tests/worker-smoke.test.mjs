import assert from 'node:assert/strict';
import worker from '../src/index.js';

const response = await worker.fetch(new Request('https://candidate.invalid/'), {}, {});
assert.equal(response.status, 503);
const body = await response.json();
assert.equal(body.ok, false);
assert.equal(body.error, 'DATABASE_NOT_BOUND');
console.log('PASS: expected safe response when D1 is unbound.');
