# Admin and Human Reviewer Identity — Candidate Design

**Date:** 2026-11-14  
**Status:** Design only; Candidate branch; not merged or deployed  
**Parent:** `4d209d194423634b57ba92d10f574612f594978b`

## 1. Verified current behavior

Static inspection of `src/index.js` on the parent Candidate found:

- `adminRequired(request, env)` authorizes administrative routes by comparing the request's `X-Admin-Token` header with the shared `env.ADMIN_TOKEN` value.
- Lead-draft approve/reject handlers persist the literal `admin_token` as `reviewer_id`.
- The public registration handler inserts new accounts with the fixed role `user`; it does not accept a caller-supplied role.
- Session authentication already resolves a user record containing `id`, `role`, `status`, and session expiry from D1.

Consequently, the current approval record does not identify an individual reviewer. The shared token proves possession of a shared credential, not the identity or authorization scope of a human reviewer.

## 2. Security impact

- **Non-repudiation gap:** multiple people sharing the same token produce indistinguishable approval records.
- **Credential concentration:** compromise of the shared token grants the same administrative capability to every holder.
- **Least-privilege gap:** the current guard does not distinguish a reviewer from a broader administrator.
- **Audit integrity:** the literal `admin_token` value is a marker, not a verified actor identity.

No exploit or credential compromise is asserted by this design note.

## 3. Target authorization model

For human approval and other privileged actions, the target Candidate design is:

1. Resolve the caller through the existing server-validated D1 session; never trust an actor ID supplied in a request body or header.
2. Require an active account and a server-side role from an explicit allowlist, initially `admin` or `reviewer`.
3. Deny missing, expired, revoked, inactive, or insufficiently privileged sessions.
4. Persist the authenticated `user.id` as the reviewer/actor identifier.
5. Record the decision, entity, request correlation ID, timestamp, and outcome in the audit trail.
6. Apply the same authorization contract consistently to list, approve, reject, and any other privileged review operation.

The global `X-Admin-Token` must not be treated as an individual identity. The final design should remove it as the sole authorization mechanism. Any temporary compatibility path must be separately risk-reviewed, time-bounded, and must not be allowed to create a falsely attributed human approval.

## 4. Provisioning and compatibility constraints

- Public registration must continue to assign only the `user` role.
- There must be no public endpoint that promotes a user to `admin` or `reviewer`.
- Reviewer provisioning requires an explicit, human-controlled identity-verification and authorization process.
- Before implementation, inspect the exact Candidate D1 type and constraints for `lead_drafts.reviewer_id` and `audit_events.actor_id`; do not assume their types or silently coerce values.
- Inventory every `adminRequired` call site and the dashboard/API clients that currently send `X-Admin-Token`.
- Do not cut over the dashboard or automation clients until an individually provisioned reviewer account and a compatible session flow exist.
- No production account, role, token, secret, schema, or data is to be changed as part of this design.

## 5. Required isolated test matrix

| Scenario | Expected result |
|---|---|
| No session | Deny |
| Expired or revoked session | Deny |
| Inactive account | Deny |
| Active `user` role | Deny privileged action |
| Active `reviewer` role | Allow only review permissions |
| Active `admin` role | Allow explicitly defined admin permissions |
| Caller submits another actor ID | Ignore caller value; use session identity |
| Public registration submits `role=admin` | Persist `user` only |
| Shared token without an authorized session | Deny human approval |
| Successful review | Persist authenticated reviewer ID |
| Concurrent/stale review | Preserve optimistic concurrency and idempotency |
| Audit write fails | Do not report a successful approval |

Tests must use disposable D1 fixtures and synthetic users only. No production D1 or Supabase data may be used.

## 6. Release gates

This risk remains **OPEN / HIGH** until all of the following have evidence:

- Candidate implementation uses server-validated session identity and role checks.
- Reviewer provisioning is defined and cannot be self-service.
- Every privileged route has an explicit permission contract.
- Approval records contain the authenticated reviewer ID.
- Negative and positive authorization tests pass.
- Dashboard and automation compatibility is tested.
- D1 fixture schema and rollback are verified.
- Full Candidate CI and regression tests pass on the final integration SHA.

## 7. Rollback

This document changes no runtime behavior or data. Rollback is to close the related Draft PR or revert the documentation commit on its Candidate branch. No database rollback or Production operation is required.

## 8. Explicit non-actions

No main change, merge, release, Worker upload, Cloudflare configuration change, D1 migration, Supabase mutation, DNS change, secret rotation, deployment, or traffic shift is authorized or included.
