# M01 — Supabase Candidate Plan (READ-ONLY FIRST)

**Branch:** `m01-supabase-candidate`  
**Base:** `main`  
**Status:** design/review candidate only — NOT production-approved.

## 1. Verified repository state

- Worker entry point: `src/index.js`.
- `wrangler.toml` declares a Cloudflare Worker and documents a D1 binding named `DB`.
- The smoke test expects `503 DATABASE_NOT_BOUND` when D1 is absent.
- No Supabase SQL migration or verified Supabase schema file was present in the repository tree at the time of this audit.
- The current Worker is D1-oriented. Its database adapter cannot be switched to Supabase by adding only a Supabase URL/key.

## 2. M01 objective

Prepare a separate Supabase integration candidate while preserving the existing D1 implementation and all original files. No production database, Worker, DNS, secrets, or deployment target is changed by this branch.

## 3. Required implementation sequence

1. Obtain and review the authoritative Supabase schema/migrations and current table/constraint/policy definitions.
2. Map every D1 table, query, transaction, and data type used by `src/index.js` to the approved PostgreSQL schema.
3. Define a repository interface and implement a Supabase/PostgREST adapter in new files; do not overwrite the D1 adapter.
4. Define timestamp, ID, uniqueness, ownership, and transaction semantics explicitly.
5. Add unit tests with mocked Supabase responses and contract tests against a disposable non-production Supabase project.
6. Run syntax, security, authorization, data-integrity, regression, and failure-mode tests.
7. Only after review, propose a separate preview integration. Production changes require a separate explicit approval.

## 4. Security constraints

- Never commit Supabase service-role keys, anon keys, passwords, access tokens, or connection strings.
- Keep secrets in the target platform's secret manager only.
- Enforce row ownership and authorization server-side; do not rely only on client-side filtering.
- Review Row Level Security (RLS), grants, indexes, constraints, and function privileges before any live test.
- Do not run destructive or schema-changing SQL as part of this audit.

## 5. Current release gate

**BLOCKED:** The authoritative Supabase schema and complete data-access contract have not yet been verified. The companion SQL file in this branch is strictly read-only and is intended to inventory a Supabase project's existing schema. It is not a migration.

## 6. Rollback

This branch is isolated from `main`. Rollback is to stop using this branch and continue from `main`; no production resources are modified by the branch creation or documentation files.
