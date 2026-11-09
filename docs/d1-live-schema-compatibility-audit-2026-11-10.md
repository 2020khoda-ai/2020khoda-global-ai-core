# D1 Live Schema Compatibility Audit — 2026-11-10

## Scope and safety

- Target: Cloudflare D1 database `2020khoda-crm-db`.
- Method: read-only inspection of `sqlite_master`, `PRAGMA table_info`, row counts, migration ledger, and `PRAGMA foreign_key_check`.
- No SQL writes, migrations, DDL, data exports, binding changes, Worker changes, or deployments were performed.
- This document is evidence for a separate Candidate review. It is not approval to apply a migration.

## Observed live data

| Table | Rows observed |
|---|---:|
| users | 1 |
| leads | 18 |
| messages | 1,182 |
| sales_pipeline | 15 |
| conversions | 0 |
| referrals | 0 |
| follow_ups | 0 |
| settings | 3 |

The database also contains application tables including `auth_sessions`, `chat_sessions`, `user_memory`, `guest_sessions`, `guest_messages`, `lead_drafts`, `public_lead_inbox`, `public_rate_limits`, `rate_limits`, `conversations`, `page_views`, `payments`, and `plugin_registry`. Their presence must be preserved during any future migration design.

## Material differences from `migrations/0001_candidate_baseline.sql`

| Area | Live database | Candidate baseline | Risk |
|---|---|---|---|
| `messages` | `session_id` nullable; no declared FK; `created_at` DATETIME | `session_id` NOT NULL with FK to `chat_sessions`; `created_at` TEXT | Existing rows and inserts may fail if baseline assumptions are imposed |
| `chat_sessions` | `owner_id` has no declared FK; timestamps default to unixepoch | FK to `users`; timestamps required | Constraint and insert behavior differs |
| `auth_sessions` | `created_at` and `last_seen_at` default to unixepoch; FK has no ON DELETE CASCADE | `last_seen_at` nullable; FK uses ON DELETE CASCADE | Lifecycle semantics differ |
| `conversions` | `lead_id` NOT NULL, `type`, `value` | nullable `lead_id`, `amount`, `currency`, `status`, `notes` | API queries/inserts are not schema-compatible |
| `referrals` | `referrer_lead_id`, `referred_name`, `referred_phone`, `reward` | `referrer_name`, `referrer_phone`, `lead_id`, `property_code`, `reward_amount`, `currency`, `notes` | Different business model and column names |
| `follow_ups` | Integer autoincrement `id`; Integer `lead_id`; `type`, `sent_at`, `content`; DATETIME fields | Text `id`; nullable Text `lead_id`; `note`; integer timestamps | Identifier type and workflow semantics conflict |
| `sales_pipeline` | `probability` INTEGER; includes `expected_close_date` | `probability` REAL; no `expected_close_date` | Type and field mismatch |
| `leads` | `score` INTEGER; `last_contact` DATETIME; `email` nullable | `score` REAL; `last_contact` INTEGER; includes stricter defaults/constraints | Data type and compatibility assumptions differ |
| `users` | Includes `updated_at` | Baseline omits `updated_at` | Schema drift |

Additional live tables not represented in the baseline include `conversations`, `lead_drafts`, `page_views`, `payments`, `plugin_registry`, `public_lead_inbox`, and `public_rate_limits`. Do not drop or rebuild them as part of a CRM alignment.

## Integrity and migration observations

- The inspected migration ledger contains: `3.0.0-foundation`, `3.0.1-auth-foundation`, and `2020khoda_lead_approval_v1`.
- `PRAGMA foreign_key_check` returned no rows at audit time.
- No conclusion is made about semantic integrity, orphan rows in tables without declared constraints, data quality, or full application correctness.
- The baseline file is explicitly marked as a candidate-only starting point. `CREATE TABLE IF NOT EXISTS` does not reconcile an existing table's columns, types, defaults, or constraints.

## Application query trace (read-only source inspection)

The Candidate `src/index.js` was inspected for the live database access paths:

- `createLead()` inserts into `leads` using `id, name, phone, email, message, source, status, ai_score, score, followup_stage, created_at, updated_at`. These columns exist in the live table.
- The same function inserts into `sales_pipeline` using `id, lead_id, stage, deal_value, currency, probability, notes, created_at, updated_at`. These columns exist in the live table; the live `probability` type is INTEGER rather than the baseline REAL.
- Chat creation writes `chat_sessions` fields that exist in the live table.
- User chat writes `messages(session_id, role, content, channel, created_at)`; all columns exist in the live table. The live table permits NULL session IDs and does not declare the FK assumed by the baseline, but the inspected application write supplies a session ID.
- Authentication and memory code uses the expected columns in `users`, `auth_sessions`, and `user_memory`; live tables contain those columns.
- Current handlers for `conversions`, `referrals`, and `follow_ups` only execute `SELECT * ... ORDER BY rowid DESC LIMIT 200`. The inspected source contains no INSERT into these three tables. Their column differences are therefore schema-drift / future-write risks, not a proven failure of those current list queries.
- `settings` is handled adaptively by inspecting its key/value column names.

**Interpretation:** the inspected core lead/chat write statements appear column-compatible with the live schema. This is not an end-to-end test and does not prove that runtime behavior, bindings, authorization, data semantics, or all other SQL paths work. The baseline migration is still not an accurate description of the existing database and must not be applied to it.

## Required next engineering steps

1. Trace every SQL statement in `src/index.js` for `conversions`, `referrals`, `follow_ups`, `messages`, `sales_pipeline`, `leads`, and `settings`.
2. Produce a query-to-live-schema compatibility matrix, including INSERT/UPDATE/SELECT projections and all required columns.
3. Choose one of two safe designs for each mismatch:
   - adapt application queries to the live schema while preserving its semantics; or
   - design a versioned, additive migration with explicit backfill, validation, and rollback on an isolated preview copy.
4. Do not rename, drop, rebuild, or coerce production columns based only on this audit.
5. Add integration tests against a disposable D1 database seeded with a schema snapshot and synthetic data (no production records).
6. Re-run syntax, unit, integration, security, regression, and rollback checks before requesting human release approval.

## Release decision

**NO-GO for Production.** This Candidate branch records the live-schema evidence only. It does not modify Worker logic, D1, Cloudflare bindings, secrets, DNS, or Production.
