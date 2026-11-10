# 2020KHODA GLOBAL AI CORE — Candidate v0.6 Release Readiness

**Status:** Candidate-only. Not merged. Not deployed.  
**Parent:** v0.5 owner lifecycle Candidate.  
**Production changes:** None.

## Evidence-backed repair in this Candidate

The Cloudflare Workers Build for v0.5 failed while executing:

```sh
npx wrangler preview
```

Cloudflare's build log reported that the Wrangler configuration was missing a `previews` block. This Candidate adds the required `[previews]` table and explicitly configures the Workers AI Preview binding as `AI`.

Wrangler is pinned to `4.159.0`, matching the version recorded in the failed build log, rather than relying on `npx` to fetch an unpinned package at build time.

## Preview data isolation

- Production D1 remains configured only in the top-level `[[d1_databases]]` binding named `DB`.
- The Preview configuration intentionally does **not** bind D1 and does not include `preview_database_id`.
- This prevents a branch Preview from reading or writing the production CRM database.
- Until a separate non-production D1 database is provisioned and its schema is migrated, DB-backed Preview routes are expected to be unavailable. This is intentional fail-closed behavior, not a fully functional integration Preview.
- Workers AI is configured for Preview. Running inference can incur account usage charges; CI does not call AI.

## Architecture boundary

The repository README and Worker source describe Worker-rendered HTML. No separately buildable static Pages frontend is established by the repository at this Candidate head. Therefore this change does not alter the unrelated Cloudflare Pages project, its build command, domains, or DNS. The previous Pages diagnosis must not be conflated with the Workers Preview failure documented above.

## Remaining release gates

1. **Admin reviewer identity — BLOCKED:** current authorization still uses the shared `ADMIN_TOKEN`. Individual reviewer identity and an auditable human principal are not implemented. Do not claim named reviewer attribution.
2. **D1 migration — PENDING:** migration `0002_lead_draft_owner_lifecycle.sql` has not been applied to the production database. Validate it against an isolated non-production D1 database first. Never apply the reconstructed baseline to an existing database.
3. **Preview D1 integration — BLOCKED:** no dedicated non-production D1 database was found during the audit. Provisioning and seeding one requires a separate explicit candidate-infrastructure action.
4. **Runtime parity — NOT VERIFIED:** the active Worker source has not been retrieved and proven identical to this Candidate.
5. **Functional tests — PENDING:** HTTP handler tests, auth/authorization tests, browser E2E, concurrency/idempotency tests, and live D1 integration tests remain required.
6. **Workers Builds Preview — PENDING:** rerun after this Candidate commit and inspect the new build logs. A green GitHub Actions run alone is not a Cloudflare Preview success.
7. **Production release — HUMAN APPROVAL REQUIRED:** no merge, D1 migration, Worker upload/deployment, route, DNS, secret, Pages setting, or traffic change is included.

## Candidate validation

GitHub Actions must verify:
- Wrangler TOML parsing and expected production D1 binding metadata;
- explicit Preview block and AI binding;
- absence of any Preview D1 binding;
- pinned Wrangler version;
- Worker syntax and existing smoke/schema/owner lifecycle tests.

These checks do not prove a live Cloudflare runtime or release readiness.

## Rollback

This Candidate is isolated on its own branch. Close its draft PR or revert its Candidate-only commits if validation fails. No production data or deployment rollback is required because no Production resource is changed.
