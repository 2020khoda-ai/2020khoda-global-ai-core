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

const approvalStart = source.indexOf("async function handleLeadDraftReview(");
const registrationStart = source.indexOf("async function handleLeadDraftRegister(");
const adminListStart = source.indexOf("/* -------------------------\n   ADMIN LEAD LIST", registrationStart);
assert.ok(approvalStart >= 0 && registrationStart > approvalStart && adminListStart > registrationStart);
const approvalHandler = source.slice(approvalStart, registrationStart);
const registrationHandler = source.slice(registrationStart, adminListStart);
assert.match(approvalHandler, /status = 'APPROVED'/);
assert.doesNotMatch(approvalHandler, /db\.batch\(|INSERT INTO leads|INSERT INTO sales_pipeline/);
assert.match(registrationHandler, /draft\.status !== "APPROVED"/);
assert.match(registrationHandler, /reviewed_version/);
assert.match(registrationHandler, /db\.batch\(/);
assert.match(registrationHandler, /COUNT\(p\.id\) AS pipeline_count/);
assert.match(source, /\/register/);
assert.match(source, /lead-draft-create:/);
assert.match(source, /lead-draft-owner:/);
assert.match(source, /درخواست تأیید شود؟ ثبت در CRM مرحله جداگانه است/);
assert.match(source, /ثبت در CRM/);

console.log("PASS: Admin approval and CRM registration are separate, guarded actions; owner routes are rate-limited.");
