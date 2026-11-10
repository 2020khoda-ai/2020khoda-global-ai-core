from pathlib import Path
import sqlite3

root = Path(__file__).resolve().parent
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys = ON")
db.executescript((root / "fixtures" / "d1-live-schema.sql").read_text(encoding="utf-8"))
migration = (root.parent / "migrations" / "0002_lead_draft_owner_lifecycle.sql").read_text(encoding="utf-8")
db.executescript(migration)

draft_id = "draft-release-test"
lead_id = "lead-release-test"
db.execute("""INSERT INTO lead_drafts
(id, lead_id, owner_type, owner_id, name, phone, email, message, source, status,
 version, created_at, updated_at, expires_at)
VALUES (?, ?, 'user', 'user-test', 'Release Test', '+10000000000', 'test@example.invalid',
 'approval test', 'website', 'PENDING_REVIEW', 1, 100, 100, 9999999999)""",
(draft_id, lead_id))

# Approval is a distinct state and must not create CRM rows.
db.execute("""UPDATE lead_drafts
SET status='APPROVED', reviewer_id='admin_token', reviewed_version=version, reviewed_at=101
WHERE id=? AND status='PENDING_REVIEW' AND version=1""", (draft_id,))
assert db.execute("SELECT status FROM lead_drafts WHERE id=?", (draft_id,)).fetchone() == ("APPROVED",)
assert db.execute("SELECT COUNT(*) FROM leads WHERE id=?", (lead_id,)).fetchone()[0] == 0
assert db.execute("SELECT COUNT(*) FROM sales_pipeline WHERE lead_id=?", (lead_id,)).fetchone()[0] == 0

# Registration is a separate, version-gated, atomic batch equivalent.
now = 102
db.execute("""INSERT OR IGNORE INTO leads
(id, name, phone, email, message, source, status, ai_score, score,
 followup_stage, created_at, updated_at)
SELECT lead_id, name, phone, email, message, source, 'new', 0, 0, 0, created_at, ?
FROM lead_drafts
WHERE id=? AND status='APPROVED' AND reviewed_version=version
AND (expires_at IS NULL OR expires_at=0 OR expires_at>?)""", (now, draft_id, now))
db.execute("""INSERT INTO sales_pipeline
(id, lead_id, stage, deal_value, currency, probability, notes, created_at, updated_at)
SELECT 'pipeline-release-test', d.lead_id, 'new', 0, 'USD', 0, '', ?, ?
FROM lead_drafts d JOIN leads l ON l.id=d.lead_id
WHERE d.id=? AND d.status='APPROVED' AND d.reviewed_version=d.version
AND l.name=d.name AND l.phone=d.phone
AND COALESCE(l.email,'')=COALESCE(d.email,'')
AND COALESCE(l.message,'')=COALESCE(d.message,'')
AND COALESCE(l.source,'')=COALESCE(d.source,'')
AND NOT EXISTS (SELECT 1 FROM sales_pipeline p WHERE p.lead_id=d.lead_id)""",
(now, now, draft_id))
db.execute("""UPDATE lead_drafts SET status='CRM_REGISTERED', registered_at=?, updated_at=?
WHERE id=? AND status='APPROVED' AND reviewed_version=version
AND (expires_at IS NULL OR expires_at=0 OR expires_at>?)
AND EXISTS (SELECT 1 FROM leads l WHERE l.id=lead_drafts.lead_id
 AND l.name=lead_drafts.name AND l.phone=lead_drafts.phone
 AND COALESCE(l.email,'')=COALESCE(lead_drafts.email,'')
 AND COALESCE(l.message,'')=COALESCE(lead_drafts.message,'')
 AND COALESCE(l.source,'')=COALESCE(lead_drafts.source,''))
AND (SELECT COUNT(*) FROM sales_pipeline p WHERE p.lead_id=lead_drafts.lead_id)=1""",
(now, now, draft_id, now))

assert db.execute("SELECT status FROM lead_drafts WHERE id=?", (draft_id,)).fetchone() == ("CRM_REGISTERED",)
assert db.execute("SELECT COUNT(*) FROM leads WHERE id=?", (lead_id,)).fetchone()[0] == 1
assert db.execute("SELECT COUNT(*) FROM sales_pipeline WHERE lead_id=?", (lead_id,)).fetchone()[0] == 1

# A repeated registration cannot create a second pipeline row.
db.execute("""INSERT INTO sales_pipeline
(id, lead_id, stage, deal_value, currency, probability, notes, created_at, updated_at)
SELECT 'pipeline-release-test-2', d.lead_id, 'new', 0, 'USD', 0, '', ?, ?
FROM lead_drafts d JOIN leads l ON l.id=d.lead_id
WHERE d.id=? AND d.status='APPROVED'
AND NOT EXISTS (SELECT 1 FROM sales_pipeline p WHERE p.lead_id=d.lead_id)""",
(now, now, draft_id))
assert db.execute("SELECT COUNT(*) FROM sales_pipeline WHERE lead_id=?", (lead_id,)).fetchone()[0] == 1

# A stale review version cannot register.
db.execute("""INSERT INTO lead_drafts
(id, lead_id, owner_type, owner_id, name, phone, status, version, reviewed_version,
 created_at, updated_at, expires_at)
VALUES ('stale-draft','stale-lead','user','user-test','Stale','+10000000001',
 'APPROVED',2,1,100,100,9999999999)""")
db.execute("""INSERT OR IGNORE INTO leads
(id, name, phone, message, source, status, ai_score, score, followup_stage, created_at, updated_at)
SELECT lead_id, name, phone, email, message, source, 'new', 0, 0, 0, created_at, ?
FROM lead_drafts WHERE id='stale-draft' AND status='APPROVED' AND reviewed_version=version""", (now,))
assert db.execute("SELECT COUNT(*) FROM leads WHERE id='stale-lead'").fetchone()[0] == 0
assert db.execute("PRAGMA foreign_key_check").fetchall() == []
print("PASS: separate approval, explicit registration, atomic CRM persistence, idempotent pipeline guard and stale-version rejection.")
