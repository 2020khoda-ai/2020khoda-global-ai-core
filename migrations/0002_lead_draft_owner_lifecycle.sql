-- Candidate-only additive migration. NOT executed against any remote D1 database.
-- Existing drafts are deliberately assigned to a non-user legacy principal.
-- They must remain Admin-visible but cannot be accessed by user/guest owner routes.
ALTER TABLE lead_drafts ADD COLUMN owner_type TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE lead_drafts ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'unassigned';
ALTER TABLE lead_drafts ADD COLUMN chat_id TEXT;
ALTER TABLE lead_drafts ADD COLUMN submitted_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_lead_drafts_owner_v05
  ON lead_drafts(owner_type, owner_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_lead_drafts_review_v05
  ON lead_drafts(status, submitted_at);
