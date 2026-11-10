import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/index.js", import.meta.url), "utf8");

assert.match(source, /async function resolveLeadDraftOwner\(request, env\)/);
assert.match(source, /owner_type: "user", owner_id: user\.id/);
assert.match(source, /owner_type: "guest", owner_id: guest\.id/);
assert.match(source, /WHERE id = \? AND owner_type = \? AND owner_id = \?/);
assert.match(source, /async function handleOwnerLeadDraftCreate\(request, env\)/);
assert.match(source, /async function handleOwnerLeadDraft\(request, env, draftId, action\)/);
assert.match(source, /version = version \+ 1, reviewed_version = NULL/);
assert.match(source, /status = 'PENDING_REVIEW', submitted_at = \?/);
assert.match(source, /status IN \('DRAFT','PENDING_REVIEW'\)/);
assert.match(source, /function adminRequired\(request, env\)/);
assert.match(source, /reviewer_id = 'admin_token'/);
assert.doesNotMatch(source, /body\.owner_id|body\.owner_type|body\.approved_by/);

console.log("PASS: owner identity is server-derived; owner-scoped read/edit/submit/cancel and Admin review contracts are present.");
