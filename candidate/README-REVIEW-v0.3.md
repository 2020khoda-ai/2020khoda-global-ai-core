# 2020KHODA Candidate v0.3 — Lead Approval Workflow

## Scope and provenance
- Review-only GitHub candidate branch. No merge, deployment, Worker, D1, DNS, Cloudflare, Supabase, or secret changes.
- The complete tested package is attached separately in the ChatGPT conversation as `2020KHODA_Candidate_v0.3.zip`.
- This branch stores the source patch and review evidence. The patch is generated against the local `src-index.v0.2-baseline.js` preserved in the package. It must not be applied blindly to another source revision.
- Before integrating, verify the patch base against the target branch's exact source blob and resolve any context mismatch.

## Workflow intent
`DRAFT → PENDING_REVIEW → APPROVED → CRM_REGISTERED`

- Public submissions enter `lead_drafts`; they do not create CRM records.
- Draft review endpoints require the existing Admin authorization guard.
- Admin approval creates the CRM lead and sales pipeline record in one D1 batch, then verifies the final state.
- Repeated approval of a `CRM_REGISTERED` draft is idempotent.
- Admin rejection records the review decision without creating CRM records.

## Local validation evidence
- `node --check src/index.js`: PASS.
- `npm test`: 5/5 PASS, isolated in-memory SQLite fixture.
- No live D1 writes or Cloudflare preview deployment were performed.
- The local package uses Node.js 22 for the `node:sqlite` test harness.

## Known review gates
1. Verify exact patch base and apply to the current source revision.
2. Review Admin identity and audit attribution; current candidate uses shared `ADMIN_TOKEN` and `reviewer_id='admin'`.
3. Verify all public lead forms accept the `202` response and pending-review contract.
4. Run full regression and isolated non-production D1 integration tests.
5. Confirm correct D1 binding before any preview Worker test.

## Release decision
**NO-GO for Production.** This PR is draft-only and is not authorization to merge, deploy, migrate D1, or change live configuration.
