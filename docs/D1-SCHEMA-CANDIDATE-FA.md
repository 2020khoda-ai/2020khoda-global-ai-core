# D1 Candidate Schema — READ-ONLY / PREVIEW GATE

## Purpose
`migrations/0001_candidate_baseline.sql` is a first-pass D1 schema reconstructed from SQL usage in `src/index.js`. It exists only on the candidate branch.

## Scope
The baseline defines the 14 tables referenced by the Worker:
- `users`, `auth_sessions`
- `chat_sessions`, `messages`, `user_memory`
- `rate_limits`
- `leads`, `sales_pipeline`, `conversions`
- `referrals`, `follow_ups`, `settings`
- `guest_sessions`, `guest_messages`

## Validation performed
- The SQL was executed against an isolated in-memory SQLite database using Python's sqlite3 module.
- All CREATE TABLE and CREATE INDEX statements completed successfully.
- This validates basic SQLite syntax and object creation only. It is not a Cloudflare D1 integration test.
- Existing production/preview D1 schema was not queried and has not been changed.

## Mandatory checks before any D1 apply
1. Export/read the actual D1 schema using `sqlite_master` and `PRAGMA table_info(<table>)` for every referenced table.
2. Compare live columns, types, defaults, unique constraints, indexes, and foreign keys against this candidate baseline.
3. Resolve any differences without destructive ALTER/DROP operations.
4. Apply only to a separate disposable preview D1 database after explicit approval.
5. Run Worker integration tests for auth, sessions, chat history, guest chat, lead capture, pipeline, memory, and admin reads.
6. Keep Production database and existing data untouched until all gates pass.

## Known assumptions / limitations
- `conversions`, `referrals`, and `follow_ups` are read by the current API but their full business write contract is not defined in the Worker source. Their candidate columns are provisional.
- The `settings` table uses a key/value baseline inferred from adaptive column detection; compatibility with any existing settings schema is unverified.
- Foreign-key behavior and cleanup order must be tested against the actual D1 database.
- The migration is not a claim that the connected Cloudflare Worker has a D1 binding or that any public endpoint is live.

## Release status
**NO-GO for Production.** This file is a candidate artifact for controlled preview validation only.
