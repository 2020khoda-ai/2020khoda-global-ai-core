# 2020KHODA GLOBAL AI CORE — Human Release Handoff v0.6

**Status:** Candidate handoff only — NOT approved for production and NOT deployed.
**Base:** `candidate/lead-approval-v0.5-owner-lifecycle-2026-11-10` at `79b0512d91f5f3c419809010152d98500390e2bb`.
**Purpose:** Record the remaining release gates and provide a controlled, evidence-based human handoff.

## 1. Current verified candidate state

- GitHub PR #6 and PR #10 remain open Draft PRs; neither is merged.
- Candidate CI is a repository workflow. A passing run does not establish Cloudflare Worker build, Pages build, D1 integration, or production readiness.
- Candidate `wrangler.toml` declares a D1 binding named `DB` for `2020khoda-crm`. Treat this as release configuration only; do not run `wrangler deploy` from this branch.
- Candidate migration `0002_lead_draft_owner_lifecycle.sql` adds owner columns to the existing `lead_drafts` table and assigns legacy rows to `owner_type='legacy'`, `owner_id='unassigned'`. It has not been applied to any remote D1 database.
- Candidate owner-lifecycle tests use SQLite in-memory fixtures and synthetic data. They are not a Cloudflare D1 integration test.

## 2. Mandatory release blockers

### A. Cloudflare Pages project configuration

The latest observed Pages Preview failed because the configured build command is not a shell command and the configured output directory is not present in this Worker-only repository.

The repository root has no verified Pages static-site output directory. Do not guess one and do not create a placeholder site merely to turn the check green.

Human decision required:
1. Identify the intended static website source and its actual build command/output directory; or
2. Confirm that this repository should not drive the Pages project, then disconnect/retarget the Pages build integration through a separately reviewed Cloudflare change.

Until the correct website source is identified and a Preview succeeds, Pages is **BLOCKED**.

### B. Cloudflare Workers Builds integration

The observed Worker Build checks failed with a message indicating that no build configuration was associated with the script tag. This is separate from GitHub Actions.

Human action:
1. In Cloudflare Workers Builds, verify the repository connection and the exact Worker script association.
2. Configure a validation-only build first (for example, install dependencies and run the repository checks).
3. Keep automatic deployment disabled until the human release approval and deployment window.
4. Re-run the Worker Build check and preserve the resulting run URL and logs.

Do not infer Worker Build success from GitHub Actions.

### C. D1 migration and preview parity

The live database already contains a `lead_drafts` table, but the inspected live schema did not contain the four owner-lifecycle columns expected by v0.5.

Required before production:
1. Create or designate a separate disposable D1 preview database.
2. Apply `migrations/0002_lead_draft_owner_lifecycle.sql` only to that isolated database.
3. Verify the migration ledger, `PRAGMA table_info(lead_drafts)`, owner isolation, stale-version rejection, review transitions, idempotent registration, and `PRAGMA foreign_key_check`.
4. Run Worker integration tests against that isolated D1 binding.
5. Produce a reviewed backup/bookmark and rollback plan before any later production migration.

Never apply the migration to `2020khoda-crm` as part of this handoff.

### D. Admin reviewer identity

The current Candidate uses the existing static `X-Admin-Token` compatibility mechanism and records a shared actor label. This does not provide independently attributable reviewer identity.

Before production, choose and implement an approved Admin identity model (prefer an authenticated Admin session with role enforcement and a stable user ID). Verify that every list/review/register endpoint enforces the role server-side and that the audit record identifies the actual reviewer. Do not expose the token in browser storage, logs, URLs, or client-visible source.

### E. Runtime source parity and routing

Before release:
- Retrieve and compare the exact deployed Worker source/version with the reviewed Candidate commit.
- Confirm the effective `DB` binding on the intended Worker version.
- Resolve the observed DNS/Worker Route overlap for `www.2020khoda.com` using a documented routing decision.
- Verify HTTPS, redirects, health endpoint, and CRM API behavior using a controlled test window.

No such production changes or traffic tests are authorized by this document.

## 3. Human release acceptance checklist

A human release owner must confirm all items with evidence:

- [ ] Correct source branch and immutable commit SHA selected.
- [ ] GitHub Actions pass for that exact SHA.
- [ ] Cloudflare Workers Build passes for that exact SHA; deployment remains disabled until approval.
- [ ] Pages Preview passes using the confirmed website source and real output directory.
- [ ] Isolated D1 migration and integration tests pass.
- [ ] Admin reviewer identity and audit attribution are accepted.
- [ ] Source/runtime parity is verified.
- [ ] DNS/route behavior is verified and conflicts resolved.
- [ ] Security review covers authentication, authorization, CSRF/origin controls, rate limits, secret handling, and data ownership.
- [ ] Regression tests cover login, user chat, guest chat, chat history, existing lead listing/updates, and lead approval.
- [ ] Backup/bookmark and exact Worker rollback version are recorded.
- [ ] Human owner explicitly approves the production deployment window and exact commit.

## 4. Workflow invariants

The required lead workflow remains:

`DRAFT → PENDING_REVIEW → APPROVED → CRM_REGISTERED`

- Draft creation must not insert into `leads` or `sales_pipeline`.
- Only a verified Admin may approve or register.
- Approval must reference the current draft version.
- Registration must be idempotent.
- `CRM_REGISTERED` may be returned only after Lead and Pipeline persistence are verified.
- Failure must not be reported as success.
- Legacy drafts assigned to the `legacy/unassigned` principal must not become accessible to arbitrary users.

## 5. Rollback requirements

- Do not drop `lead_drafts` or delete CRM records as rollback.
- Preserve the pre-migration D1 bookmark/backup.
- If a production Worker deployment is later approved, record the exact prior deployed version ID and restore that exact version if rollback is needed.
- Revert only the reviewed Candidate commit/configuration that caused the regression.
- Keep DNS and traffic routing unchanged during application rollback unless a separate routing rollback is explicitly approved.

## 6. Current decision

**NO-GO for production release.**

This handoff is ready for human review, not ready for production deployment. The blockers above require Cloudflare project configuration, isolated D1 validation, an accepted Admin identity model, and exact runtime parity evidence. No Production, DNS, Worker, secret, or D1 change is authorized or performed by this Candidate.
