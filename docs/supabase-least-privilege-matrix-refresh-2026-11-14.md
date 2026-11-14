# Supabase Least-Privilege Matrix — Read-only refresh 2026-11-14

**Status:** Candidate-only evidence refresh and access-design proposal.  
**Supersedes:** `docs/supabase-least-privilege-matrix-2026-11-11.md` for the observed privilege snapshot only.  
**Project:** `aelgfwmeerocajszbvhg`  
**Observed:** 2026-11-14; Security Advisor findings timestamped 2026-11-14T06:54:07Z.

## Safety boundary

This document is based on read-only project metadata, table inventory, advisor results, and SELECT-only PostgreSQL catalog queries. No SQL mutation, grant, policy, schema, data, migration, Edge Function, secret, Worker, DNS, deployment, or traffic change was performed.

This is not executable SQL and does not authorize any production change.

## Current project state

- Project status: `ACTIVE_HEALTHY`.
- PostgreSQL: 17.11.
- Public base tables: 10.
- RLS enabled: 10 of 10.
- Policies: 0 across all 10 tables.
- Migration ledger: 0 entries.
- Edge Functions: 0.
- Security Advisor: 10 `rls_enabled_no_policy` findings.
- Performance Advisor: 13 unindexed foreign keys and 12 unused indexes.
- Health Advisor: no findings.
- Role attributes: `anon` and `authenticated` have `rolbypassrls=false`; `service_role` has `rolbypassrls=true`; `postgres` has `rolbypassrls=true`; `supabase_admin` is superuser and bypasses RLS.

A zero-row table inventory does not prove that the schema or its privileges are safe.

## Current table privilege matrix

The read-only `pg_class.relacl` / `aclexplode` inventory confirms the same direct table privileges for each of the three application roles on every table below:

`DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE`.

No direct `PUBLIC` table grant was returned for these tables.

| Public table | anon | authenticated | service_role | PUBLIC |
|---|---|---|---|---|
| `profiles` | Broad set above | Broad set above | Broad set above | None observed |
| `leads` | Broad set above | Broad set above | Broad set above | None observed |
| `properties` | Broad set above | Broad set above | Broad set above | None observed |
| `referrals` | Broad set above | Broad set above | Broad set above | None observed |
| `deals` | Broad set above | Broad set above | Broad set above | None observed |
| `conversations` | Broad set above | Broad set above | Broad set above | None observed |
| `messages` | Broad set above | Broad set above | Broad set above | None observed |
| `follow_ups` | Broad set above | Broad set above | Broad set above | None observed |
| `human_approvals` | Broad set above | Broad set above | Broad set above | None observed |
| `audit_events` | Broad set above | Broad set above | Broad set above | None observed |

RLS currently blocks row access when no applicable policy exists for `anon` and `authenticated`, but it does not constrain `TRUNCATE` or `MAINTAIN`. The broad grants remain an unacceptable default for exposed client roles. `service_role` bypasses RLS and must remain server-side only.

## Current default-privilege matrix

Read-only `pg_default_acl` inspection found default privileges in schema `public` for both object owners `postgres` and `supabase_admin`.

For each owner, the following defaults are granted to `anon`, `authenticated`, and `service_role`:

| Future object type | Observed default privileges |
|---|---|
| Tables (`r`) | `DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE` |
| Sequences (`S`) | `SELECT, UPDATE, USAGE` |
| Functions (`f`) | `EXECUTE` |

No `PUBLIC` grantee appeared in the inspected default ACL entries. The broad defaults mean future objects may inherit access without a table-by-table review.

## Current policy matrix

| Table | RLS | Policies | Current result for anon/authenticated |
|---|---|---:|---|
| `profiles` | Enabled | 0 | No row policy; default deny |
| `leads` | Enabled | 0 | No row policy; default deny |
| `properties` | Enabled | 0 | No row policy; default deny |
| `referrals` | Enabled | 0 | No row policy; default deny |
| `deals` | Enabled | 0 | No row policy; default deny |
| `conversations` | Enabled | 0 | No row policy; default deny |
| `messages` | Enabled | 0 | No row policy; default deny |
| `follow_ups` | Enabled | 0 | No row policy; default deny |
| `human_approvals` | Enabled | 0 | No row policy; default deny |
| `audit_events` | Enabled | 0 | No row policy; default deny |

## Least-privilege target (proposal only)

| Role | Proposed baseline |
|---|---|
| `anon` | No direct privileges on base tables, sequences, or functions. Public discovery should use a deliberately curated Worker response or restricted view. |
| `authenticated` | No direct base-table privileges by default. Add only explicit table/column privileges after trusted identity, ownership, and assignment semantics are proven. |
| `PUBLIC` | No table, sequence, or function privileges by default. Explicitly allow-list any required function execution. |
| `service_role` | Server-only. Do not expose to browsers; it bypasses RLS. Prefer a narrower server role if architecture allows. |
| `postgres` / `supabase_admin` | Administrative/migration identities only. |

Table-specific future access remains as documented in the 2026-11-11 matrix: profiles may expose only own-profile fields; leads/deals/referrals/conversations/messages/follow-ups require verified ownership or staff assignment; properties require a curated public projection; human approvals must be server-mediated and attributable to an individual reviewer; audit events must be append-only and server-written.

Client roles should not receive `TRUNCATE`, `MAINTAIN`, `REFERENCES`, `TRIGGER`, broad `DELETE`, or unrestricted function execution.

## Data-plane finding

The inspected Worker uses Cloudflare D1 via `env.DB`. No Supabase client, project URL/key binding, or Edge Function invocation was evidenced in the inspected Worker source. Supabase is not a verified active CRM persistence path. Keep it out of the request path until a separate architecture decision is approved.

## Required isolated verification before any future proposal

1. Reconcile the intended CRM data plane (D1 or Supabase); do not grant access solely because a Supabase project exists.
2. Define trusted principals, role assignment, ownership, lead assignment, property visibility, referral ownership, reviewer identity, and audit semantics.
3. Test every role against every table for SELECT, INSERT, UPDATE, DELETE, TRUNCATE, MAINTAIN, REFERENCES, TRIGGER, sequence access, and function execution.
4. Include cross-user IDs, unassigned rows, role self-promotion, approval/reward tampering, and function invocation attempts.
5. Test with synthetic data in a disposable project only.
6. Prepare exact table-by-table grants/policies and rollback for review; do not apply them without separate explicit human approval.

## Release gate

**NO-GO for Supabase-backed CRM integration.** This refresh confirms broad direct grants and broad default privileges, zero RLS policies, and no verified Worker integration. It closes only the evidence refresh, not the runtime security gate.

## Rollback

Documentation-only. Revert this single Candidate commit or close its Draft PR. No database rollback is required.
