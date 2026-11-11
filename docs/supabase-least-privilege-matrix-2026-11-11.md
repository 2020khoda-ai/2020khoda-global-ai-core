# Supabase Access Matrix and Least-Privilege Proposal — 2026-11-11

## Status and safety

**Candidate-only design document.** This is an access-design proposal, not an executable migration or authorization change. No SQL mutation, grant, policy, schema, data, Edge Function, secret, Worker, DNS, or deployment operation was performed.

The matrix must be reviewed before any future policy or grant proposal is drafted. It does not authorize applying any change to the connected Supabase project.

## Read-only evidence snapshot

Observed on 2026-11-11 (Asia/Tehran), using Supabase project metadata, table inventory, migration/function listings, security/performance/health advisors, and read-only PostgreSQL catalog queries.

- Project: `aelgfwmeerocajszbvhg`; status `ACTIVE_HEALTHY`; PostgreSQL 17.11.
- Schema: `public`; 10 base tables; all 10 report RLS enabled; each currently reports zero rows.
- Policies: zero policies across all 10 tables.
- Existing table grants: `anon` and `authenticated` each have `DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE` on all 10 tables. `PUBLIC` has no table grants in the inspected role-grant inventory. `service_role` also has broad table privileges.
- Role attributes: `anon` and `authenticated` do not bypass RLS; `service_role` and `postgres` have `BYPASSRLS`; `supabase_admin` is a superuser.
- Default privileges for both `postgres` and `supabase_admin` include broad table privileges for `anon`, `authenticated`, and `service_role`; sequence privileges include `SELECT, UPDATE, USAGE`; function privileges include `EXECUTE`. No `PUBLIC` grantee appeared in the inspected default ACL results.
- Supabase migration ledger returned an empty list. Edge Function inventory returned an empty list. This does not prove that no schema changes were ever made outside the migration ledger.
- Security Advisor: 10 `rls_enabled_no_policy` findings.
- Performance Advisor: 13 unindexed foreign keys and 12 unused indexes (informational; do not drop indexes without workload evidence).
- Health Advisor: no findings.

RLS is not a substitute for least-privilege table grants. In particular, row-level security does not constrain operations such as `TRUNCATE`; the observed client-role table grants therefore remain a material risk if those roles can reach a SQL execution surface.

## Current data-plane decision

The inspected Worker source uses Cloudflare D1 through `env.DB`. No Supabase client, Supabase URL/key binding, or Supabase Edge Function invocation was found in the inspected Worker source or deployed Worker source scan. Supabase is therefore **not a verified active CRM persistence path**.

Until a separate architecture decision authorizes a Supabase integration, the safe default is to keep Supabase out of the request path and grant no direct base-table access to browser roles.

## Role baseline

| Role | Proposed baseline |
|---|---|
| `anon` | No direct privileges on any base table, sequence, or function by default. Public property discovery, if required, should use a deliberately curated read-only view or Worker endpoint rather than exposing base tables. |
| `authenticated` | No direct base-table privileges by default. Add only table- and column-scoped access after ownership, assignment, and role semantics are defined and tested. |
| `PUBLIC` | No table, sequence, or function privileges by default. Function execution must be explicitly allow-listed. |
| `service_role` | Server-side only; never ship to a browser. It bypasses RLS, so do not treat RLS as a safety boundary for requests made with this role. Prefer a dedicated restricted server role for request-scoped access where the architecture permits it. |
| `postgres` / `supabase_admin` | Administrative/migration identities only; never used by application clients. |

## Table-by-table access matrix

The "authenticated future minimum" column describes the narrowest plausible application access after a separate data-ownership design. It is **not enabled now**. Default access remains none.

| Table | Data and ownership signals observed | `anon` | `authenticated` future minimum |
|---|---|---|---|
| `profiles` | Profile fields include display name, phone, role, and status; `id` references `auth.users.id`. | None. | Read own profile; update only allow-listed self-service fields such as display name and phone. Never self-update role or status; no client insert/delete. |
| `leads` | Contact PII, message, source, status, score, consent, metadata; `assigned_to` references profiles. | None. | No direct customer access. Assigned staff may read only assigned records and update a narrow allow-list through the Worker or a reviewed RPC. No client delete or role/assignment escalation. |
| `properties` | Listing, address/location, asking price, status, attributes, and owner lead relation. | None on the base table. | No direct base-table access by default. If public listings are required, expose only approved fields through a safe view/Worker endpoint and only for approved public statuses. |
| `referrals` | Referrer/referred lead IDs, property, referral code, reward amount, status, notes. | None. | No direct access until a trusted referrer-to-user ownership mapping exists. Thereafter, at most read own referral records; reward amount/status changes remain server-controlled. |
| `deals` | Buyer/owner/property links, assigned staff, amount, stage, human-approval fields, notes. | None. | No direct writes. Assigned staff may read scoped deals through the Worker; stage changes and approval fields must use a validated server workflow. |
| `conversations` | Channel, external thread ID, status, metadata, and lead relation. | None. | No direct access until lead/conversation ownership is formally defined. Read/write through the authorized Worker path only. |
| `messages` | Message content, direction, sender type, provider ID, metadata, conversation relation. | None. | No direct base-table access. Read only through a conversation the user is authorized to access; message creation remains server-mediated. |
| `follow_ups` | Lead/deal, assigned staff, due date, status, note. | None. | Assigned staff may read their own follow-ups and update only permitted operational fields after assignment and role checks. No client delete. |
| `human_approvals` | Entity/action/status, requester, reviewer, decision note and timestamps. | None. | Requester may read only their own requests if required. Review/approve/reject operations must be server-mediated and attributable to an individual reviewer; no direct client mutation. |
| `audit_events` | Actor, action, entity, request ID, JSON details, timestamp. | None. | No direct client write/update/delete. Audit readers require a separate, explicitly authorized read-only role or Worker endpoint; append-only writes are server-side. |

## Least-privilege design sequence

1. **Confirm the data plane.** If D1 remains the CRM system of record, keep Supabase disconnected and do not add application grants or policies merely because the project exists.
2. **Define principals and ownership.** Map authenticated user IDs to profiles, staff roles, lead assignment, property visibility, referral ownership, conversation ownership, and reviewer identity. Never trust a client-supplied role or owner ID.
3. **Keep base tables private.** If public property listings are needed, define a separate allow-listed view or Worker response with only approved fields. Do not expose lead contact details, internal notes, reward data, approval records, messages, or audit details.
4. **Use explicit grants only.** Future client access should be limited to the minimum required table/column privileges. Client roles should not receive `TRUNCATE`, `REFERENCES`, `TRIGGER`, `MAINTAIN`, broad `DELETE`, or unrestricted function execution.
5. **Use row ownership and assignment checks.** Any future RLS policy must enforce both row visibility (`USING`) and write eligibility (`WITH CHECK`) using trusted identity/assignment data. Role changes, approvals, rewards, and audit records remain server-controlled.
6. **Constrain default privileges.** New tables, sequences, and functions should not automatically become accessible to `anon`, `authenticated`, or `PUBLIC`. Apply explicit allow-lists only after isolated testing.
7. **Test in a disposable project.** Test every role against every table for SELECT, INSERT, UPDATE, DELETE, TRUNCATE, sequence access, and function execution; include cross-user IDs, unassigned rows, self-promotion attempts, and approval/reward tampering. Verify denial as well as permitted behavior.
8. **Require separate human approval.** Any future production policy, grant, default-privilege, schema, or data change requires a separate explicit approval and a reviewed rollback plan.

## Release gate

**NO-GO for Supabase-backed CRM integration.** The current Worker uses D1, no Supabase integration is evidenced, and the current Supabase privilege/policy state is not suitable for direct client exposure. This document closes only the design-documentation prerequisite; it does not close the runtime security gate.

## Rollback

This file is documentation-only. Rollback is a Git revert of this Candidate commit or removal of this Candidate file. No database rollback is required because no database operation was performed.
