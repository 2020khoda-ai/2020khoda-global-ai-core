# Release Candidate Audit Snapshot — 2026-11-11

## Decision

**Production release: NO-GO.** This snapshot is read-only evidence plus Candidate documentation/test changes only. No merge, release, Production operation, Cloudflare setting change, D1/Supabase mutation, secret access, DNS change, or deployment was performed.

## GitHub state

Repository: `2020khoda-ai/2020khoda-global-ai-core`; default branch: `main`.

- `main` observed at `89bfd177e12db39dfcc52fcbd91a969757956f75` (2026-11-07).
- PR #15 head: `c8057252107c81810bcd5e25b4171a8e57508fd3`, branch `candidate/ops-dashboard-v0.7-2026-11-11`; Open, Draft, not merged, mergeable against its immediate base. It is 47 commits ahead of main.
- PR #15 description reports Candidate CI run #94 as successful. The current connector returned no combined status checks and no PR-triggered run for the exact head SHA; exact-head CI is therefore **not independently verified** in this audit.
- PR #12 head `e9d35baa9a599797e2d2b6cf32124d9c1ff93b4e`; Open, Draft, not merged, currently not mergeable.
- PR #13 was merged into the Candidate v0.5 branch (merge result `a4f3a47c4a402badbe3486f0adfd926bb5c3fb3b`), not into `main`.
- PR #14 head `1e9eda4a1f1e896743bf637af1737736c09c8922`; Open, Draft, not merged, mergeable. GitHub Actions run #84 completed successfully on that head. Its job passed Worker syntax and the smoke/D1 fixture test step.
- PR #3 head `0fd3e3125953f39ccaef5f5a6f37d6089d98f5ab`; Open, Draft, not merged, mergeable. GitHub Actions run #24 completed successfully on that head. Its job passed Worker syntax and the smoke/D1 fixture test step.
- PRs #6 and #10 are Open Drafts and unmerged; their descriptions report runs #43 and #54, respectively, but exact-head checks were not independently retrieved in this audit. PR #11 is Open Draft and not mergeable.

### Candidate branch integration blocker

PR #12 was based on the old v0.5 base SHA `79b0512d91f5f3c419809010152d98500390e2bb`. PR #13 later advanced the v0.5 Candidate branch to `a4f3a47c4a402badbe3486f0adfd926bb5c3fb3b`.

The v0.7 branch is stacked on PR #12, not on the updated v0.5 branch:

- Comparing updated v0.5 merge result `a4f3a47` to PR #12 head `e9d35ba`: diverged, 9 commits ahead and 17 behind.
- Comparing updated v0.5 merge result `a4f3a47` to PR #15 head `c805725`: diverged, 14 commits ahead and 17 behind.
- PR #15 is 5 commits ahead of PR #12 and contains the v0.7 dashboard/AI candidate changes.

**Consequence:** PR #15 being mergeable against PR #12's branch does not prove that the complete v0.7 line includes the later v0.6 human-approval hardening. Integrate and regression-test these Candidate lines before selecting a single Release Candidate SHA. Do not merge either PR as part of this audit.

## Cloudflare Worker

Worker: `2020khoda-global-ai-core`; account inventory was read without exposing secret values.

- Latest production deployment observed: 2026-11-10 20:07:06 UTC; deployment strategy `percentage`; version 142 receives 100% traffic.
- Active version 142 metadata lists `ADMIN_TOKEN: secret_text`, `DB: d1`, `OPENAI_API_KEY: secret_text`, and `TELEGRAM_BOT_TOKEN: secret_text`; it does **not** list `AI`.
- Worker settings inventory currently lists an `AI: ai` binding. This differs from the active version 142 binding inventory and does not, by itself, prove the active deployment has AI.
- Version 143 was created 2026-11-10 20:44:17 UTC, has `has_preview: true`, and lists `AI: ai` plus `DB: d1`. It is a Preview version; no deployment record showed it receiving Production traffic.
- Routes: `crm.2020khoda.com/*` and exact-host `www.2020khoda.com`. The latter is not a wildcard path route.
- DNS inventory includes proxied CNAME records for `2020khoda.com`, `crm.2020khoda.com`, and `www.2020khoda.com`.
- Global Worker observability is disabled. Invocation logs and persistent logs are enabled; Logpush is disabled.
- Worker-specific issue summary: one active issue and two occurrences. Both observed 503s were on the Candidate Preview workers.dev URL (root and `/favicon.ico`) on 2026-11-10 11:39:07–11:39:09 UTC. The Preview intentionally lacks the Production D1 binding, so these are consistent with fail-closed Preview behavior and are not evidence of a Production outage.

No secret/token values were read or returned.

## Worker code and CRM/auth path

The deployed Worker source scan and Candidate source review show:

- CRM persistence uses Cloudflare D1 through `env.DB`; AI calls use `env.AI.run()`.
- No Supabase client, Supabase URL/key binding, or Supabase Edge Function call was found. A live Worker-to-Supabase connection is **not evidenced**.
- Public lead intake uses `POST /api/lead` and IP rate limiting. Login/register use a separate rate limit.
- Admin CRM reads and review actions call the shared `adminRequired()` check backed by `X-Admin-Token`. This is not individual reviewer identity; the Candidate workflow records a generic `admin_token` reviewer marker.
- Authenticated chat and memory paths use session ownership checks. The session cookie is `HttpOnly`, `Secure`, and `SameSite=Strict`.
- Explicit `isAllowedOrigin()` enforcement appears in the auth handler; owner lead-draft routes use `guestOriginAllowed()`. Other cookie-authenticated state-changing routes still require complete browser-level CORS/CSRF verification.
- Public `/api/health` reports service version, D1 connectivity, and whether AI is bound. Review whether this operational detail should remain public or be reduced to a minimal liveness response.

No browser E2E, deployed-runtime authorization, concurrency, or live D1 integration test was performed in this audit.

## Supabase and RLS

Project `aelgfwmeerocajszbvhg` reported `ACTIVE_HEALTHY`, PostgreSQL 17.11.

- Ten `public` tables; all report RLS enabled; all currently report zero rows.
- No policies exist on any of the ten tables.
- `anon` and `authenticated` have broad table grants on all ten tables, including `TRUNCATE`; `PUBLIC` has no direct table grant in the inspected catalog result.
- Default privileges for `postgres` and `supabase_admin` are broad for future tables, sequences, and functions, including client roles.
- `service_role` has `BYPASSRLS`; it must remain server-only.
- Migration ledger returned no entries; Edge Function inventory returned none.
- Security Advisor: 10 RLS-enabled/no-policy findings.
- Performance Advisor: 13 unindexed foreign keys and 12 unused indexes.
- Health Advisor: no findings.

The table-by-table least-privilege proposal is recorded in `docs/supabase-least-privilege-matrix-2026-11-11.md`. It is a design document only; no policy, grant, default privilege, or schema change was made.

## Open release risks

1. Candidate branch divergence: v0.7 is missing 17 commits present on the updated v0.5/v0.6 approval line.
2. Active Production Worker version 142 does not list AI, despite the settings inventory listing an AI binding; Preview version 143 does list AI. Production AI readiness is not established.
3. Supabase client-role grants and default privileges are broader than least privilege; no policies exist. Supabase is not the current Worker data plane.
4. Exact-head CI for PR #15 is not independently verified from the current check/run response.
5. Live D1 integration, authentication/authorization HTTP tests, CORS/CSRF browser tests, concurrency tests, and rollback rehearsal remain incomplete.
6. Shared Admin token does not provide individual reviewer attribution.
7. Cloudflare Pages build/source/output configuration remains a documented blocker in the earlier v0.6 Candidate review; it was not revalidated in this audit.
8. Global Worker observability is disabled, limiting ongoing production error visibility.

## Candidate-only work in this change set

- Add a table-by-table Supabase least-privilege access matrix and a staged design plan.
- Add this evidence-backed release audit snapshot.
- Extend the Candidate workflow so pull requests targeting Candidate branches also run the no-deploy validation workflow.
- Add a static documentation-contract test that verifies all ten Supabase tables and role baselines appear in the matrix. This is a documentation completeness test, not a database authorization test.

No runtime Worker code, SQL migration, D1 schema, Supabase schema/data/permissions, Cloudflare settings, DNS, secret, or deployment is changed.

## Rollback

The change set is limited to Candidate documentation, a static documentation test, package test wiring, and a no-deploy workflow trigger filter. Revert the Candidate commit(s) or delete the Candidate branch. No Production rollback is required because no Production resource was touched.

## Next safe actions

1. Integrate the v0.6 human-approval line and v0.7 Preview/dashboard line in a fresh Candidate integration branch; resolve conflicts and run the full regression suite.
2. Verify the exact final Candidate head's GitHub Actions run and Preview build.
3. Run HTTP/auth/CSRF/browser/concurrency tests against disposable resources only.
4. Confirm the active Production AI binding/version mismatch with a separate human-controlled release plan; do not change Worker settings or deploy during this gate.
5. Keep Supabase disconnected unless a separate data-plane decision and isolated least-privilege tests approve its future use.
6. Prepare a single Release Candidate SHA, reproducible CI evidence, change list, residual-risk register, and rollback procedure for human GO/NO-GO review.


## Candidate CI evidence added after this snapshot

- PR #16 run #101, run ID `42972418564`, completed successfully on head `406d4f02bce4ead59447a0a8f43db10e928bb0e0` at 2026-11-11 06:26 UTC.
- Job `Syntax and smoke tests (no deployment)` completed with `success`. Steps passed: Wrangler production/Preview isolation assertions, Worker syntax check, and `npm test`.
- Job logs explicitly show the new `supabase-matrix-contract.test.mjs` passing, alongside the existing smoke, owner-contract, synthetic D1 schema/migration, Preview config, and local config tests.
- This is Candidate CI evidence only. It does not prove live Supabase authorization, live D1 integration, Worker runtime AI inference, browser E2E, or Production readiness.
