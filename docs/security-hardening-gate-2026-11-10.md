# Security Hardening Gate — 2026-11-10

## Status

Candidate-only security work plan. This document does not change runtime behavior, database permissions, secrets, DNS, Worker bindings, or production deployments.

**Release decision: NO-GO** until every required gate below has evidence.

## Evidence-backed findings

1. The current Worker source uses the D1 binding `env.DB`. No Supabase client, Supabase URL/key binding, or Supabase Edge Function invocation was found in the inspected Worker source. Treat Supabase as a separate project, not as the active CRM persistence path.
2. The Worker reads `env.AI` and throws `WORKERS_AI_NOT_CONFIGURED` when it is absent. The deployed Worker binding inventory inspected on 2026-11-10 did not include an `AI` binding. Chat/AI functionality must not be advertised as operational until verified in a non-production environment.
3. The Worker admin API checks `X-Admin-Token` against `env.ADMIN_TOKEN`. All administrative routes and every state-changing route must be enumerated and tested for authorization, including alternate HTTP methods and identifier-guessing cases.
4. `isAllowedOrigin()` returns true when the request has no `Origin` header. This is not by itself proof of an exploitable CSRF path; assess it together with cookie usage, SameSite behavior, CORS, and all state-changing endpoints.
5. Supabase currently has ten public tables with RLS enabled but no policies. Catalog inspection also found broad table privileges for `anon` and `authenticated`, and broad default privileges. RLS does not protect operations such as TRUNCATE. Do not add policies or change grants until a table-by-table access matrix is reviewed and approved.
6. The current candidate CI runs syntax and smoke/schema-fixture checks only. It does not establish live D1 compatibility, authentication end-to-end, Workers AI availability, Supabase authorization, or production readiness.
7. The D1 compatibility audit reports drift between the repository baseline and the live D1 schema. Do not apply baseline migrations to the existing database without a reviewed, data-preserving migration plan.

## Required gates before GO

### A. Worker authentication and authorization
- Inventory every route and HTTP method.
- Prove all administrative read and write routes reject missing, invalid, and expired credentials.
- Verify public lead intake is narrowly scoped and rate-limited.
- Test user/session ownership checks for chats, memories, and other user-scoped records.
- Test CSRF protections on every cookie-authenticated state-changing route, including requests with absent or forged Origin headers.
- Confirm CORS permits only intended origins and methods.

### B. D1 integrity and compatibility
- Compare live schema to the candidate's expected schema using read-only introspection.
- Identify all missing/extra columns, indexes, constraints, and tables.
- Prepare a separate migration candidate with backup and rollback plan; do not run it against production during this gate.
- Add integration tests against an isolated disposable D1 database.

### C. Workers AI
- Verify the `AI` binding and model availability in a non-production Worker.
- Exercise successful response, provider failure, timeout, and missing-binding behavior.
- Ensure errors do not disclose credentials or sensitive prompts.

### D. Supabase isolation and permissions
- Decide whether Supabase is intentionally unused or is intended to become a CRM data plane.
- If unused, document it as out-of-path and prevent accidental client exposure.
- If intended for future use, create a least-privilege access matrix for each table and role before proposing policies or grants.
- Review default privileges for tables, sequences, and functions owned by each relevant role.
- Verify anon/authenticated cannot perform unauthorized reads, writes, deletes, truncates, or function execution.
- Validate RLS policies with role-scoped tests in an isolated project before any production change.

### E. CI and release provenance
- Pin and review CI actions and supported Node.js runtime.
- Add tests for route authorization, session ownership, CORS/CSRF, rate limits, D1 schema, and AI binding behavior.
- Build the Worker from the reviewed candidate commit and compare its artifact/provenance with the deployed version.
- Keep deployment credentials and production environments unavailable to candidate CI.

## Acceptance criteria

A GO decision requires:
- All critical/high security findings closed with reproducible evidence.
- No unexplained active production errors.
- Passing isolated integration and regression tests.
- Verified deployment provenance and rollback artifact.
- Human approval of the exact commit and release plan.

## Explicit non-actions

No Supabase SQL mutation, policy/grant change, D1 migration, secret access, Worker setting change, DNS change, deployment, merge, or production action is authorized by this document.
