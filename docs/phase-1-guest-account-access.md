# Phase 1 — Guest Chat + Account Access Candidate

**Status:** Candidate specification only — not production-ready, not deployed.
**Decision:** Public conversation is available without registration. Personal features require an authenticated account.
**Base:** `candidate/supabase-native-2026-11-07`
**Production impact:** None. This branch is isolated.

## 1. User access model

### Guest (no registration)
- Public entry point: `GET /`
- Guest session bootstrap: `GET /api/public/session`
- Public AI chat: `POST /api/public/chat`
- Guest conversation state is separate from authenticated chat history and CRM.
- Guest session cookie is HttpOnly, Secure, SameSite=Lax and scoped to the host.
- Current source sets a 14-day guest-session lifetime, keeps at most 20 history messages for model context, and applies IP/session rate limits.

### Registered account
- Account entry point: `GET /account`
- Authentication endpoints are under `/api/auth/*`.
- Authenticated conversation history uses `/api/chats`, `/api/chats/:id`, and `/api/chat`.
- Personal memory endpoints are under `/api/memory/*`.
- Account session configuration currently specifies 7 days.
- All personal resources must be authorized against the authenticated user on every request.

## 2. Security boundaries

1. Guest endpoints must never return account profiles, account chat history, personal memory, CRM records, admin data, or another guest's records.
2. Account endpoints must reject unauthenticated requests.
3. A guest cookie is an opaque random token; only its hash may be stored.
4. Cookie attributes must remain HttpOnly, Secure and SameSite; production origin and proxy assumptions require verification.
5. Apply rate limits at both IP and guest-session levels. Confirm the deployed proxy provides a trustworthy client IP.
6. Enforce request size and message-length limits; validate same-origin requests for browser endpoints.
7. Never expose the Supabase service-role key to browser code. It may only be used server-side.
8. Supabase Row Level Security (RLS), grants, ownership checks and service-role access paths must be reviewed before wiring the adapter into request handlers.
9. Guest-to-account history migration is out of scope for Phase 1 unless a separate, explicit consent and ownership design is approved.

## 3. Existing implementation facts

- The current Worker already renders a public guest-chat page and a separate account page.
- Guest session and message handlers already exist in `src/index.js`.
- Guest storage currently uses D1 tables `guest_sessions` and `guest_messages`.
- Guest IP/session throttling currently uses the D1 `rate_limits` table.
- Authenticated chat, authentication and memory handlers also use the D1 helper layer.
- The Supabase REST adapter exists at `src/lib/supabase-rest.js`, but is not wired into the Worker router.
- The adapter allowlist currently contains: `profiles`, `leads`, `properties`, `referrals`, `deals`, `conversations`, `messages`, `follow_ups`, `human_approvals`, `audit_events`.
- The adapter does not currently allow `guest_sessions`, `guest_messages`, or `rate_limits`.
- The repository does not contain a verified Supabase migration set for the full Worker schema.

## 4. Required implementation before public release

1. Freeze and document the source database contract: columns, types, constraints, indexes, foreign keys, uniqueness and timestamp units.
2. Design Supabase tables and RLS policies for guest sessions/messages, rate limits, profiles, authenticated sessions, chats, messages and memory.
3. Decide whether authentication remains custom Worker-managed auth or moves to Supabase Auth. Do not mix session models without a compatibility plan.
4. Implement a repository interface for both guest and authenticated paths; remove direct D1 SQL only after each query has a tested PostgreSQL equivalent.
5. Add ownership enforcement to every account chat and memory operation.
6. Add privacy notice, retention/deletion behavior and a clear explanation that guest conversations are not account history.
7. Add abuse controls for automated traffic and verify rate-limit behavior under concurrency.
8. Verify Workers AI binding/model availability and safe handling of provider errors.
9. Add integration tests against an isolated non-production Supabase project and a non-production Worker target.

## 5. Phase 1 exclusions

- Full CRM, sales pipeline, conversion and revenue reporting.
- Zapier workflow activation.
- WhatsApp or Telegram automation.
- Cross-device guest history.
- Guest-to-account conversation transfer.
- Production domain, DNS, Cloudflare bindings, secrets or deployment changes.

## 6. Acceptance criteria

- A first-time visitor can start a guest conversation without creating an account.
- Guest session is created securely and can be reused without exposing its raw token.
- Guest chat data is isolated from all account and CRM endpoints.
- A visitor can register/login and access only their own saved chats and personal memory.
- Logout invalidates the account session and does not expose prior account data.
- Invalid origin, oversized payloads, invalid input and rate-limit overflow are rejected.
- AI provider failure returns a safe, non-sensitive error and does not report a successful answer.
- Data retention and deletion behavior is documented and tested.
- All checks pass on isolated infrastructure; no production credentials or data are used.

## 7. Release rule

**NO-GO** until schema, RLS, auth compatibility, guest/account isolation, rate limits, AI provider, browser/mobile and end-to-end tests are verified. This specification does not authorize a production change or deployment.
