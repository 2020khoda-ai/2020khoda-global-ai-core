# Release Readiness Audit Refresh — 2026-11-14

**Status:** Candidate-only audit evidence. No runtime changes.  
**Branch:** `candidate/release-audit-refresh-2026-11-14`  
**Parent:** `c8057252107c81810bcd5e25b4171a8e57508fd3`  
**Repository:** `2020khoda-ai/2020khoda-global-ai-core`

## 1. Safety and scope

This refresh uses GitHub metadata/source reads, Cloudflare GET endpoints, and read-only Supabase project/catalog/advisor queries. It does not read or print secret values. No main change, PR merge, release, Worker deployment, Cloudflare configuration change, DNS change, D1 mutation, Supabase mutation, traffic shift, or production test was performed.

## 2. GitHub branch and PR state

Observed main base commit: `89bfd177e12db39dfcc52fcbd91a969757956f75`.

| PR | Head branch | Head SHA | Base | State | Mergeable | CI |
|---|---|---|---|---|---|---|
| #3 | `candidate/ci-validation-2026-11-09` | `0fd3e3125953f39ccaef5f5a6f37d6089d98f5ab` | main | Open, Draft | Yes | Run 24 PASS |
| #14 | `candidate/security-hardening-2026-11-10` | `1e9eda4a1f1e896743bf637af1737736c09c8922` | main | Open, Draft | Yes | Run 84 PASS |
| #6 | `candidate/lead-approval-v0.4-hardening-ci-2026-11-10` | `ab4423d10e515b36acdeac29613b407b2162c444` | PR #3 branch | Open, Draft | Yes | No PR-triggered run returned for this SHA |
| #10 | `candidate/lead-approval-v0.5-owner-lifecycle-2026-11-10` | `a4f3a47c4a402badbe3486f0adfd926bb5c3fb3b` | PR #6 branch | Open, Draft | Yes | No PR-triggered run returned for this SHA |
| #16 | `candidate/release-audit-matrix-2026-11-11` | `10a61191df0c890144b29294aec823872cfbe42b` | ops-dashboard v0.7 | Open, Draft | Yes | Previously observed Run 103 PASS |
| #17 | `candidate/security-csrf-hardening-2026-11-14` | `4d209d194423634b57ba92d10f574612f594978b` | release-audit-matrix | Open, Draft | Yes | Run 106 PASS |
| #18 | `candidate/admin-reviewer-identity-plan-2026-11-14` | `3defd82c9c62cd006e90bff33b29ecc17a44e370` | security-csrf-hardening | Open, Draft | Yes | Run 109 PASS |
| #19 | `candidate/supabase-grant-matrix-refresh-2026-11-14` | `592a375e7e5b9a3479479be3e9dc0be144c8c828` | release-audit-matrix | Open, Draft | Yes | Run 112 PASS |

Runs 109 and 112 completed their syntax/smoke job and its configured validation steps successfully. PR #18 and #19 change documentation only; their green CI does not validate the runtime implementation of the proposed controls.

The required CI/security branches are not integrated into one release branch. The branch graph is fragmented: #6 is based on #3; #10 on #6; #17 on the release audit branch; #18 on #17; #19 on the release audit branch. All listed PRs remain open and unmerged.

The comparison of `candidate/release-readiness-v0.6-worker-preview-2026-11-10` to `candidate/ops-dashboard-v0.7-2026-11-11` reports the latter five commits ahead and zero behind. This does not establish that the separate PR chains are integrated.

## 3. Cloudflare — GET-only observation

Worker: `2020khoda-global-ai-core`; zone: `2020khoda.com`.

- Latest deployment returned: `fb3acbf0-104f-40c8-b6a6-61018cb60f39`, created `2026-11-11T14:51:21.256011Z`, with version `416a25e7-23c9-413b-bcb9-96a7b8b93972` at 100%.
- The deployment list also returned the preceding deployment with version `d5f8a4de-2fd0-46d5-ac40-910dd5878073` at 100%.
- Current Worker settings expose binding names/types only: `ADMIN_TOKEN: secret_text`, `AI: ai`, `DB: d1`, `OPENAI_API_KEY: secret_text`, `TELEGRAM_BOT_TOKEN: secret_text`. No secret values were read.
- Routes: `crm.2020khoda.com/*` and `www.2020khoda.com` target this Worker.
- DNS: `crm.2020khoda.com` CNAME points to the Workers hostname; root and www point to `2020khoda.pages.dev`; the returned web CNAMEs are proxied.

**Correction to the prior report:** the version-list response did not include version-level binding metadata. Therefore it was not valid to conclude that Version 142 lacked AI or that Version 144 gained AI from that response. The current Worker settings endpoint confirms that AI and D1 bindings are configured by name/type. The exact binding set for each historical version remains unconfirmed from the available version response.

Observability returned one active exception issue titled `HttpServerError · HTTP 503`, count 2. The issue detail endpoint returned no usable detail fields; occurrence IDs were available, but stack traces/log bodies were not inspected. Root cause is **unknown / not verified**.

## 4. Worker runtime path and authorization

Static source inspection of `src/index.js` on `candidate/security-csrf-hardening-2026-11-14` confirms:

- The Worker uses Cloudflare D1 through `env.DB`.
- AI inference uses `env.AI.run()`.
- No Supabase client, Supabase URL/key binding, or Supabase Edge Function invocation was found in the inspected Worker source. Supabase is not a verified active CRM data plane.
- Cookie sessions are resolved from D1 using the hashed `khoda_session` token; the session query checks expiry and active user status.
- Registration assigns the fixed `user` role; it does not accept a caller-supplied role.
- Administrative endpoints still use a shared `X-Admin-Token` compared with `env.ADMIN_TOKEN`.
- Lead-draft approve/reject writes the literal `admin_token` into `reviewer_id`, not the authenticated human's user ID. Individual reviewer attribution and least-privilege admin roles are therefore not implemented.
- Cookie-authenticated routes and preflight requests have same-origin checks through `src/security/origin.js`; the current tests cover origin classification and route wiring. This does not close the separate shared-admin-identity gap.

### Preview and AI limitation

The Candidate Preview configuration deliberately excludes D1 to avoid binding Production D1. `wrangler.local.toml` likewise has no D1 binding, while it declares the AI binding as remote.

However, `handlePublicChat()` calls `getOrCreateGuest()`, `requireDB(env)`, and D1-backed rate limiting/history writes before it calls `callWorkersAI()`. Therefore an actual public-chat AI inference through this Preview configuration cannot complete without a disposable non-production D1 binding. The existing SQLite fixture test verifies SQL/schema contracts; it does not execute the full Worker request path or a real Workers AI inference.

This is a **HIGH release gate**: preserve Production D1 isolation, provision a disposable Candidate D1 fixture or implement a fully mocked request-path test, and prove the AI call without touching Production.

## 5. D1 schema and migration evidence

- Candidate files include `migrations/0001_candidate_baseline.sql`, `migrations/0002_lead_draft_owner_lifecycle.sql`, `migrations/candidate/0001_schema_snapshot.sql`, and `tests/fixtures/d1-live-schema.sql`.
- The Candidate SQLite compatibility test creates an in-memory database, inserts synthetic account/session/chat/lead/memory/rate-limit rows, exercises approval/rejection workflow, and checks foreign-key integrity.
- The test uses synthetic fixtures only. It is not a live Production D1 schema query.
- Production D1 schema parity is **unknown / not verified** in this audit. No D1 query or migration was run.

## 6. Supabase read-only status

Project `aelgfwmeerocajszbvhg`:

- Status: `ACTIVE_HEALTHY`; PostgreSQL 17.11.
- Ten public tables; all ten have RLS enabled; all ten currently have zero policies.
- Migration ledger: zero entries; Edge Functions: zero.
- Read-only `pg_class.relacl` / `aclexplode` query confirms direct grants to `anon`, `authenticated`, and `service_role` on every table: `DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE`.
- Read-only `pg_default_acl` inspection confirms broad default table, sequence, and function privileges for `anon`, `authenticated`, `service_role`, and the owning roles under `postgres` and `supabase_admin`.
- Security Advisor: 10 `rls_enabled_no_policy` findings; observed `2026-11-14T07:03:15.782Z`.
- Performance Advisor: 13 unindexed foreign-key findings and 12 unused-index findings; observed `2026-11-14T07:03:16.488Z`.
- Health Advisor: no findings.

RLS with no policies blocks normal row access for client roles, but it does not neutralize broad table-level privileges such as `TRUNCATE` and `MAINTAIN`. No policy/grant/default-privilege change is proposed as executable SQL here.

## 7. Release gates — current disposition

| Gate | Status | Evidence / remaining work |
|---|---|---|
| Main untouched | PASS | All work described is on Candidate refs |
| Candidate CI | PARTIAL PASS | PR #3/#14/#17/#18/#19 runs pass; #6/#10 have no run returned |
| Branch integration | OPEN | One coherent Candidate integration SHA is not yet established |
| Cookie CSRF / origin | PARTIAL PASS | Same-origin module and tests exist; full browser integration regression still required |
| Human reviewer identity | OPEN / HIGH | Shared token and literal reviewer ID remain in runtime source |
| D1 schema parity | OPEN | Fixture tests exist; live Production schema was not queried |
| Preview AI request path | OPEN / HIGH | Preview has no D1, but public chat requires D1 before AI |
| Cloudflare Observability | OPEN | One active HTTP 503 issue; root cause unavailable |
| Supabase least privilege | OPEN / HIGH | Broad direct/default grants and zero RLS policies |
| Supabase integration | NOT CONNECTED / NOT EVIDENCED | No Worker-side Supabase client or binding found |
| Production operations | PASS | No Production operation performed |

## 8. Rollback

This refresh is documentation-only. Revert the single documentation commit on this Candidate branch or close its Draft PR. No database, Worker, DNS, secret, or Production rollback is required.

## 9. Next actions

1. Create one isolated integration Candidate based on the latest selected Worker/dashboard baseline, preserving every source branch and recording exact merge/cherry-pick ancestry.
2. Implement individual reviewer authorization only on that Candidate branch, using the server-validated D1 session identity and role; keep public registration fixed to `user`.
3. Add disposable D1-backed Preview/integration tests so the full request path reaches the AI binding without Production D1.
4. Re-run complete syntax, security, compatibility, and regression CI on the single integration SHA.
5. Resolve or explicitly waive the active HTTP 503 issue with evidence.
6. Keep Supabase out of the runtime until the architecture and least-privilege design are approved and tested in a disposable project.

**Current overall decision: NO-GO for Release Candidate / Production.**
