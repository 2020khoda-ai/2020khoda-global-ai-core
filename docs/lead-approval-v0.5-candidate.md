# Lead Approval Workflow — Candidate v0.5

**Status:** Candidate-only; not merged or deployed.  
**Parent:** Candidate v0.4 PR #6, head `ab4423d10e515b36acdeac29613b407b2162c444`.  
**Purpose:** Add owner-bound draft lifecycle while preserving Admin-only CRM registration.

## Changes in this candidate

- Adds an additive D1 migration for `owner_type`, `owner_id`, `chat_id`, and `submitted_at`, plus owner/review indexes.
- Existing rows receive `owner_type='legacy'` and `owner_id='unassigned'`. Historical records are not attributed to a user or guest.
- Owner identity is derived server-side:
  - Authenticated account: `authGetUser()` result.
  - Guest: verified HttpOnly guest cookie resolved through `guest_sessions`.
  - Request JSON fields such as `owner_id`, `owner_type`, and `approved_by` are never used as identity.
- Adds owner endpoints:
  - `POST /api/lead-drafts` — create a DRAFT.
  - `GET /api/lead-drafts/:id` — read only the caller's draft.
  - `PATCH /api/lead-drafts/:id` — edit only DRAFT; increments `version` and clears previous review metadata.
  - `POST /api/lead-drafts/:id/submit` — transition DRAFT to PENDING_REVIEW with version guard.
  - `POST /api/lead-drafts/:id/cancel` — cancel only DRAFT/PENDING_REVIEW.
- Existing public `POST /api/lead` remains compatible as intake-to-review and now stores verified owner attribution.
- Admin list/review routes remain Admin-only. Reviewer attribution is now the honest generic label `admin_token`; it is not an individual identity.

## State and integrity

- CRM registration remains behind the existing Admin approval path.
- Owner read/edit/cancel queries constrain both draft ID and server-derived owner type/ID.
- Edit increments the draft version and invalidates previous review metadata.
- Submit and cancel use status/version conditions and post-write read-back.
- Existing expiry timestamp is enforced by owner read/edit/submit/cancel paths; this candidate returns HTTP 410 for expired drafts without rewriting status.

## Migration safety

Run locally only with the isolated fixture:

```bash
python3 tests/lead-draft-owner-migration.test.py
```

The migration is additive and has not been run against Cloudflare D1. Existing drafts are assigned to the non-user `legacy/unassigned` principal, so owner APIs cannot expose them. No Production migration, Worker upload, DNS, secrets, or deployment occurred.

## Validation scope and limitations

- `node --check src/index.js`: syntax validation.
- `node tests/lead-draft-owner-contract.test.mjs`: static source-contract assertions.
- `python3 tests/lead-draft-owner-migration.test.py`: SQLite fixture migration and SQL behavior test.
- These checks do **not** constitute Cloudflare D1 integration, HTTP handler execution, browser E2E, concurrency, or deployed runtime verification.
- The current Admin mechanism remains a shared `ADMIN_TOKEN`. `admin_token` is a generic principal label, not a person. Individual reviewer identity requires a separate authenticated Admin identity design.
- The existing D1 status CHECK constraint does not include `EXPIRED`; expiry is enforced as an access gate but is not persisted as a distinct state.
- Existing legacy drafts cannot be claimed by a user; a separately authorized reconciliation process would be required if any exist.
- `chat_id` is reserved in the schema; this iteration does not attach drafts to a chat because the current public form contract does not establish a trusted chat-to-draft relationship.

## Rollback

Candidate rollback: close the draft PR or revert the Candidate commits/branch. The migration has not been applied, so no D1 rollback is required. Do not drop or rebuild any production table as part of Candidate rollback.
