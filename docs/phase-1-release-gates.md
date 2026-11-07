# Phase 1 — Verification and Release Gates

**Release target:** Public guest chat + registered personal account.
**Current status:** BLOCKED / NO-GO. This is a test plan, not evidence of completed tests.

| Gate | Required evidence | Current evidence |
|---|---|---|
| Source syntax | Node syntax check on exact candidate commit | Not run in this session |
| Unit tests | Guest cookie, origin policy, rate-limit and repository tests | Existing tests do not cover these behaviors |
| Database schema | Reviewed Supabase migrations and schema snapshot | Not present/verified |
| RLS and grants | Positive and negative ownership tests | Not present/verified |
| Guest isolation | Guest cannot read account, CRM or other guest data | Not tested |
| Account isolation | User A cannot read/update User B chat or memory | Not tested |
| Authentication | Register/login/logout/session expiry and legacy compatibility | Not tested end-to-end |
| AI provider | Real non-production Workers AI request and failure path | Not verified |
| Abuse controls | IP/session throttling, concurrency and proxy-IP assumptions | Not verified |
| Browser/mobile | Responsive, cookie, navigation and error-state tests | Not tested |
| Privacy | Notice, retention and deletion verified | Not completed |
| Rollback | Previous Worker target and schema rollback/forward plan | Not documented for Supabase migration |

## Required test scenarios

1. Guest opens the home page, starts a session and receives a guest cookie.
2. Guest sends a valid prompt; response is returned and stored only in guest storage.
3. Guest session is reused; raw cookie token is never persisted in the database.
4. Guest request with invalid origin is rejected.
5. Guest request exceeding size/message limits is rejected.
6. IP or session rate limit is exceeded and returns HTTP 429.
7. AI provider failure returns HTTP 503 without leaking upstream details.
8. Guest attempts account chat, memory and CRM endpoints without authentication and is denied.
9. User A attempts to access User B's chat or memory and is denied.
10. Logout invalidates the session; subsequent personal requests are denied.
11. Expired guest records are cleaned up without deleting active records.
12. Supabase outage and timeout paths fail closed and return safe errors.

## Rollback requirements

- Keep the existing `main` and production Worker untouched.
- Keep the D1 implementation and its data intact until a migration is explicitly approved.
- Test rollback on the isolated target before any release approval.
- Do not delete or mutate production data as part of rollback.
- If a schema migration is non-reversible, define a forward-fix and backup restore procedure before approval.

## Approval boundary

This candidate branch and these documents do not authorize merging, changing Cloudflare configuration, changing Supabase production schema, setting secrets, attaching domains or deploying.
