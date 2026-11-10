from pathlib import Path
import sqlite3

root = Path(__file__).resolve().parent
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys = ON")
db.executescript((root / "fixtures" / "d1-live-schema.sql").read_text(encoding="utf-8"))

# Legacy row proves the additive migration does not assign historical data to a real owner.
db.execute("""INSERT INTO lead_drafts
(id,lead_id,name,phone,status,version,created_at,updated_at)
VALUES ('legacy-draft','legacy-lead','Legacy','+10000000000','PENDING_REVIEW',1,1,1)""")

migration = (root.parent / "migrations" / "0002_lead_draft_owner_lifecycle.sql").read_text(encoding="utf-8")
db.executescript(migration)

legacy = db.execute(
    "SELECT owner_type, owner_id FROM lead_drafts WHERE id='legacy-draft'"
).fetchone()
assert legacy == ("legacy", "unassigned")

# Two separate principals can own drafts; cross-owner reads must return no row.
db.execute("""INSERT INTO lead_drafts
(id,lead_id,owner_type,owner_id,name,phone,status,version,created_at,updated_at,expires_at)
VALUES ('draft-a','lead-a','user','user-a','A','+10000000001','DRAFT',1,10,10,9999999999)""")
db.execute("""INSERT INTO lead_drafts
(id,lead_id,owner_type,owner_id,name,phone,status,version,created_at,updated_at,expires_at)
VALUES ('draft-b','lead-b','guest','guest-b','B','+10000000002','DRAFT',1,10,10,9999999999)""")

assert db.execute(
    "SELECT id FROM lead_drafts WHERE id=? AND owner_type=? AND owner_id=?",
    ("draft-a", "user", "user-a")
).fetchone() == ("draft-a",)
assert db.execute(
    "SELECT id FROM lead_drafts WHERE id=? AND owner_type=? AND owner_id=?",
    ("draft-a", "guest", "guest-b")
).fetchone() is None

# Edit increments version; a stale version cannot submit.
db.execute("""UPDATE lead_drafts SET version=version+1, updated_at=11
WHERE id='draft-a' AND owner_type='user' AND owner_id='user-a'
AND status='DRAFT' AND version=1""")
assert db.execute("SELECT version FROM lead_drafts WHERE id='draft-a'").fetchone() == (2,)
db.execute("""UPDATE lead_drafts SET status='PENDING_REVIEW', submitted_at=12
WHERE id='draft-a' AND owner_type='user' AND owner_id='user-a'
AND status='DRAFT' AND version=1""")
assert db.execute("SELECT status FROM lead_drafts WHERE id='draft-a'").fetchone() == ("DRAFT",)

# Correct current version submits; cancellation is limited to non-registered drafts.
db.execute("""UPDATE lead_drafts SET status='PENDING_REVIEW', submitted_at=12
WHERE id='draft-a' AND owner_type='user' AND owner_id='user-a'
AND status='DRAFT' AND version=2""")
assert db.execute("SELECT status FROM lead_drafts WHERE id='draft-a'").fetchone() == ("PENDING_REVIEW",)
db.execute("""UPDATE lead_drafts SET status='CANCELLED'
WHERE id='draft-a' AND owner_type='user' AND owner_id='user-a'
AND status IN ('DRAFT','PENDING_REVIEW')""")
assert db.execute("SELECT status FROM lead_drafts WHERE id='draft-a'").fetchone() == ("CANCELLED",)

assert db.execute("PRAGMA foreign_key_check").fetchall() == []
print("PASS: additive owner migration, legacy isolation, owner scoping, version gate, submit and cancel SQL.")
