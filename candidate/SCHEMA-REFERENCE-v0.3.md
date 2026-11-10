# D1 Schema Reference — Candidate v0.3

The candidate targets the observed Cloudflare D1 database named `2020khoda-crm`.

Required existing tables and observed columns used by the approval workflow:

- `lead_drafts`: id, lead_id, name, phone, email, message, source, status, version, reviewed_version, idempotency_key, reviewer_id, review_note, created_at, updated_at, reviewed_at, registered_at.
- `leads`: id, name, phone, email, message, source, status, ai_score, score, followup_stage, created_at, updated_at.
- `sales_pipeline`: id, lead_id, stage, deal_value, currency, probability, notes, created_at, updated_at.

Observed live schema and data were queried read-only. The candidate does not include or apply a D1 migration. The D1 binding name on the Worker remains unverified; do not assume `DB` is configured.
