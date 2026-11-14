import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const path = new URL('../docs/supabase-least-privilege-matrix-2026-11-11.md', import.meta.url);
const document = await readFile(path, 'utf8');

const expectedTables = [
  'profiles',
  'leads',
  'properties',
  'referrals',
  'deals',
  'conversations',
  'messages',
  'follow_ups',
  'human_approvals',
  'audit_events'
];

for (const table of expectedTables) {
  assert.ok(document.includes('`' + table + '`'), `Missing table in access matrix: ${table}`);
}

for (const role of ['anon', 'authenticated', 'PUBLIC', 'service_role']) {
  assert.ok(document.includes('`' + role + '`'), `Missing role baseline: ${role}`);
}

assert.match(document, /Candidate-only design document/);
assert.match(document, /Default access remains none/);
assert.match(document, /No SQL mutation/);
console.log('PASS: Supabase access matrix documents all 10 tables and least-privilege role baselines.');
