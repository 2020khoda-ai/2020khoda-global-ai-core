# Cookie-authenticated route origin guard — Candidate

**Date:** 2026-11-14  
**Status:** Candidate-only; not merged or deployed  
**Base:** `10a61191df0c890144b29294aec823872cfbe42b`

## Audit finding

The previous Candidate accepted requests with no `Origin` header in the shared auth-origin helper. That helper was used by `/api/auth/*`, while the session-authenticated Memory and Chat handlers relied on the session cookie without a route-level origin/Fetch-Metadata guard. Guest and owner-draft handlers already had a stricter same-origin check.

## Candidate change

- Add `src/security/origin.js` with one shared same-origin browser request predicate and a precise cookie-auth route inventory.
- Require an exact serialized `Origin` match to the request origin. If `Origin` is absent, require `Sec-Fetch-Site: same-origin`. Reject opaque, malformed, foreign, cross-site, and metadata-free requests.
- Apply the guard to `/api/auth/*`, `/api/memory*`, `/api/chats*`, and `/api/chat`.
- Reuse the same predicate for guest sessions and owner-bound lead drafts.
- Reject cross-origin OPTIONS requests. Return CORS allow-origin/credentials headers only after same-origin validation.

## Compatibility boundary

The current embedded Worker pages use relative same-origin API fetches. This Candidate deliberately does **not** enable cross-origin access from `app.2020khoda.com` or other hosts. If the CRM UI is later moved to a separate origin, add a separately reviewed exact-origin allowlist and browser E2E tests before that move. Older/non-browser clients that send cookie-authenticated requests without Origin or Fetch Metadata will be rejected; server-to-server integrations should use a separately authenticated endpoint rather than a browser session cookie.

## Validation performed before commit

- Full Worker source parsed in the V8 validation harness after normalizing the module import/export syntax.
- Static integration checks verified auth, guest, memory, chat, and OPTIONS guards are wired before dispatch.
- Node.js 22 unit tests passed for same-origin, cross-origin, opaque Origin, Fetch Metadata fallback, missing metadata, and route classification.
- Existing base Candidate CI passed on `10a61191df0c890144b29294aec823872cfbe42b` (Run #101 / 42972680564). The full repository regression chain will be rerun by Candidate CI on this commit; it has not yet run on the new SHA.

## Scope and rollback

No database, migration, Worker binding, route, DNS, secret, Cloudflare setting, Supabase object, deployment, traffic, or Production change is included. Rollback is to close this Candidate PR or revert this single Candidate commit. No data rollback is required.
