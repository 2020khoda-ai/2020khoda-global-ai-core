# Architecture Decision Record — 2020KHODA Web, CRM UI, and API

**Status:** Approved target architecture; Candidate documentation only  
**Date:** 2026-11-10  
**Approval scope:** The user approved this logical hostname and service separation. This record does not authorize DNS, Cloudflare project settings, route, deployment, or Production changes.

## Decision

Separate the public website, authenticated application UI, and backend API by responsibility:

| Hostname | Intended responsibility | Hosting target |
|---|---|---|
| `2020khoda.com` | Public brand website, public information, landing pages | Static/site frontend hosting; existing Pages project may be retained after its build configuration and domain mapping are verified |
| `app.2020khoda.com` | Authenticated CRM dashboard and operator interface | Separate frontend application deployment; Pages is acceptable for the existing project once its source/build/output are verified |
| `crm.2020khoda.com` | API, authentication boundary, CRM business logic, integrations, webhooks | Cloudflare Worker |

The Worker is the only public application layer that should access D1. Browser clients must call authenticated HTTPS API endpoints; they must not receive database credentials or connect directly to D1.

## Data and trust boundaries

- Cloudflare D1 remains the system-of-record database for CRM entities.
- The Worker validates inputs, authenticates and authorizes requests, applies rate limits, and enforces business rules before database access.
- The public website and CRM UI are clients, not trusted execution environments.
- Admin actions require server-side authorization. A shared admin token is not sufficient evidence of individual reviewer identity; this remains a release risk until replaced or supplemented with per-user identity and audit attribution.
- Secrets remain in Cloudflare's secret management and must not be committed to Git.
- CORS must be an explicit allowlist for approved application origins; it is not an authentication mechanism.

## Pages project mapping — unresolved

The existing Cloudflare Pages project `2020khoda-crm` currently has a failed build configuration and a configured output directory that was not found in the repository root at audit time. The repository README also describes Worker-rendered HTML and does not currently establish a separately buildable frontend bundle.

Therefore:
1. Do not assume the existing Pages project can host both the public website and CRM application.
2. Do not change its build command, output directory, production branch, preview settings, custom domains, or DNS until the frontend framework, source directory, build command, and output directory are verified from repository files.
3. Determine whether the public site and CRM UI are separate frontend bundles and whether they require one or two Pages projects.
4. Preserve the current Pages project during this investigation; do not delete or disable it.

## API and routing requirements

- Intended API origin: `https://crm.2020khoda.com`.
- Intended CRM UI origin: `https://app.2020khoda.com`.
- Intended public site origin: `https://2020khoda.com`.
- Hostname strings in this document are target architecture only. DNS records, Worker routes, custom domains, certificates, Access policies, and Cloudflare project domain assignments have not been changed or verified by this ADR.
- API route inventory, authentication scheme, CORS allowlist, rate limits, and health-check behavior must be documented and tested before release.
- The API must not expose internal stack traces, secrets, or unnecessary personal data.

## Release and validation gates

Before requesting human release approval:
1. Verify the frontend source layout and choose the correct build tool and output path.
2. Repair the Pages build only in a non-production Candidate/preview configuration, after the source is verified.
3. Diagnose the Cloudflare Workers Builds failure and obtain actionable logs.
4. Verify the Worker D1 binding `DB` on the release candidate without attaching production traffic.
5. Run syntax, unit, isolated D1 integration, auth/authorization, CORS, rate-limit, browser E2E, and regression tests.
6. Verify the intended hostnames and routes in a non-production test plan; do not change DNS or Production as part of these checks.
7. Provide a rollback plan and a human-readable release checklist.

## Current status

- Candidate `wrangler.toml` declares the D1 binding `DB` for the verified `2020khoda-crm` database. It has not been deployed.
- Candidate GitHub Actions run #43 passed its current syntax, smoke, D1 schema fixture, and Wrangler binding validation checks. These are not live D1 or browser E2E tests.
- The current production Worker binding metadata previously inspected did not prove that `DB` is attached to the active version.
- The Pages build is currently blocked by an invalid natural-language build command and an output directory not found at the repository root.
- No DNS, Pages settings, Worker settings, D1 schema/data, secrets, routes, or Production deployment are changed by this ADR.

## Explicit non-goals

This decision does not authorize merging the PR, deploying a Worker or Pages project, changing DNS, creating custom domains, changing Cloudflare settings, applying D1 migrations, or modifying Production traffic. The user will perform the final release action.
