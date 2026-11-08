# M01-C — Supabase Repository Candidate

**Status:** Isolated Candidate implementation; not wired into the Worker router and not production-ready.

## Scope
- Add schema-aware repositories for Supabase `leads`, `conversations`, and `messages`.
- Reuse `src/lib/supabase-rest.js` as the only HTTP transport.
- Validate UUIDs, enums, writable fields, metadata objects, and bounded list limits before network I/O.
- Keep service-role credentials server-side; no credentials are added to source or tests.
- Add deterministic tests with injected fake `fetch`.

## Explicit non-goals
- No D1-to-PostgreSQL compatibility shim.
- No changes to `src/index.js`, Worker routing, auth/session, guest storage, rate limits, or AI provider.
- No automatic mapping of D1 `name`, `ai_score`, or `followup_stage` to Supabase fields. The schemas differ; mapping requires a separately reviewed migration design.
- No migration execution, secret configuration, Cloudflare binding, DNS, merge, or deploy.

## Contract notes
The repository targets columns in `20261107000100_initial_core.sql`. Supabase `leads.full_name` is not interchangeable with D1 `leads.name`; the initial schema has no `ai_score` or `followup_stage`. Unknown legacy fields are rejected rather than silently translated or dropped.

## Validation
Run `npm run check` and `npm test` from the repository root. These are candidate checks only; they do not verify live Supabase connectivity, RLS, ownership, schema deployment, or Worker integration.

## Release gate
Remain **NO-GO** for Production until schema parity, RLS/grants, guest/account isolation, auth compatibility, rate limits, AI provider behavior, privacy/retention, isolated integration tests, and rollback are verified.
