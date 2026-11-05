# 2020KHODA® GLOBAL AI CORE — Candidate Repository

**Status:** isolated source candidate; not production-approved.

This repository contains the supplied Worker source from `020.txt` with only two syntax-level repairs:

1. Removed a duplicated `requireUser` fragment outside the function.
2. Repaired the malformed comment preceding `handleLeadUpdate`.

The original source was not overwritten. No database schema, authentication logic, password hashing, routes, lead logic, or business rules were intentionally changed.

## Architecture represented
- Cloudflare Workers module entry point
- D1 access through `env.DB`
- Workers AI access through `env.AI`
- Authentication, sessions, chat, memory, lead capture, CRM/admin endpoints
- Persian account, public AI and dashboard HTML rendered by the Worker

## Local checks
Requires Node.js 20 or newer.

```bash
npm run check
npm test
```

The smoke test only checks the expected response when D1 is not bound. It does not prove D1 schema compatibility, AI operation, authentication, or production readiness.

## Cloudflare connection — before any deployment
1. Connect this private GitHub repository to a **new or non-production Worker build target** first.
2. Entry point: `src/index.js`.
3. Add a D1 binding named `DB` only after verifying the actual database and schema. This repository does not include a verified migration set.
4. If using Workers AI, add binding `AI` separately.
5. Configure `ADMIN_TOKEN` only as a Cloudflare secret after reviewing admin authentication. Never commit it.
6. Do not attach production domains or deploy to production until schema, bindings, security controls, and end-to-end tests pass.

**Important:** Without `DB`, the Worker intentionally returns `503 DATABASE_NOT_BOUND` for all requests.

## Known blockers / unverified
- Exact D1 schema and migrations have not been supplied or verified.
- Cloudflare bindings, account settings, routes, Access/WAF/rate limiting, and secrets are unknown.
- Admin endpoints use `X-Admin-Token`; hardening and platform-level protection need review.
- Public lead capture has IP rate limiting and basic validation; anti-abuse controls need review.
- `requestIP()` falls back to `unknown` if `CF-Connecting-IP` is absent; proxy assumptions need verification.
- No real D1, Workers AI, browser, mobile, authentication, or end-to-end tests have been performed.
- Worker-rendered interfaces are included; no separate Pages static asset bundle is included.

## Release decision
**NO-GO for production.** This repository is for source control and controlled integration review only.
