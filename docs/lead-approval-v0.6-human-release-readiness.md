# 2020KHODA — v0.6 Human Release Readiness

**Status:** Candidate-only. Not merged, migrated, or deployed.
**Base:** Lead approval owner lifecycle v0.5.
**Branch:** `candidate/lead-approval-v0.6-human-release-2026-11-10`

## Implemented in this candidate
- Admin approval is now a distinct `PENDING_REVIEW → APPROVED` transition.
- CRM registration requires a separate Admin POST to `/api/lead-drafts/:id/register`.
- Registration requires `APPROVED`, `reviewed_version = version`, and an unexpired draft.
- D1 batch writes the Lead, Pipeline row, and `CRM_REGISTERED` state together.
- Registration is only marked complete when the stored Lead matches the approved draft and exactly one Pipeline row exists.
- Repeated registration is checked as an idempotent operation.
- Owner draft create and owner read/edit/submit/cancel routes are rate-limited.
- Unsupported owner route method/action combinations are rejected before owner/session resolution.
- Admin dashboard displays both pending and approved drafts and provides separate review/register controls.

## Validation added
- Static contract assertions prove approval does not insert CRM rows and registration is a separate guarded handler.
- SQLite live-schema fixture test exercises the approval and registration sequence, post-write conditions, duplicate prevention, and stale review rejection.
- Existing syntax, smoke, live-schema compatibility, and migration tests remain in the CI command.

## Verified environment facts
- Production D1 `2020khoda-crm` currently has a `lead_drafts` table without `owner_type`, `owner_id`, `chat_id`, and `submitted_at`.
- Migration `0002_lead_draft_owner_lifecycle.sql` adds those fields and indexes, and is not applied.
- Active Worker has a D1 binding named `DB` pointing to the audited database. Secret values are not read or displayed.
- The repository has no separate static Pages frontend/output directory. The Worker serves the existing HTML UI.
- Workers Build failure log for v0.5 explicitly reported a missing `previews` block. This Candidate adds an empty `previews = {}` block; it deliberately does not inherit production D1 or secrets. Runtime Preview therefore remains fail-closed until a dedicated non-production D1 and preview-only secrets are provisioned.
- The Pages project is a separate integration and is linked to this Worker-only repository despite no static frontend output. Its build command/output cannot safely be invented; Pages integration needs a human decision to disconnect it from this repo or provide an actual frontend artifact.

## Human release blockers
1. Review and approve this Candidate branch and all CI checks.
2. Confirm a dedicated non-production D1 database ID and configure a preview binding; never point preview at production D1.
3. Run the migration only against the disposable preview D1 and verify legacy rows, schema, and migration ledger.
4. Replace or supplement shared `ADMIN_TOKEN` with individually attributable Admin identity before customer-facing approval workflows; current audit actor is only `admin_token`.
5. Decide the Cloudflare hosting topology: this repository is a Worker with HTML served by the Worker, not a Pages static site. Correct the Pages project linkage/build settings in the Cloudflare dashboard only after a real frontend artifact exists.
6. Re-run Workers Builds on this branch to verify the missing-previews-block error is cleared; then provision a dedicated preview D1 and preview-only secrets before testing authenticated routes. GitHub Actions success is not a Cloudflare deployment.
7. Run HTTP handler, authentication/authorization, browser, concurrency, and rollback tests against isolated resources.
8. Human owner verifies domain routing, TLS, D1 binding, AI binding, and smoke tests.

## Explicit non-actions
- No production D1 migration or write.
- No Worker upload, deployment, traffic shift, binding or secret change.
- No DNS, route, Pages or Workers Build dashboard setting changes.
- No PR merge or production approval.

## Rollback
Before migration/deploy: close or revert this Candidate PR/branch; Production remains unchanged.
After any future approved preview migration: discard only the disposable preview database and recreate it from a clean baseline. Never drop/rebuild Production tables as Candidate rollback.
After a future approved Worker deployment: roll back to the exact prior Worker Version ID after confirming its bindings and compatibility settings.
