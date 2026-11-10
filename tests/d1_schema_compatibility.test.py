from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parent
schema = (ROOT / "fixtures" / "d1-live-schema.sql").read_text(encoding="utf-8")
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys = ON")
db.executescript(schema)

# Synthetic account and session records only.
db.execute("""INSERT INTO users
(id,email,display_name,password_hash,password_salt,role,status)
VALUES (?,?,?,?,?,?,?)""",
("user-test-001","test@example.invalid","Test User","not-a-real-hash","test-salt","admin","active"))
db.execute("""INSERT INTO auth_sessions (id,user_id,token_hash,expires_at)
VALUES (?,?,?,?)""", ("auth-test-001","user-test-001","synthetic-token-hash",4102444800))
db.execute("""INSERT INTO chat_sessions
(id,owner_id,title,model,archived,created_at,updated_at)
VALUES (?,?,?,?,0,?,?)""",
("chat-test-001","user-test-001","Synthetic test","workers-ai",100,100))

# Mirror the current Worker message write shape.
for role, content in (("user","hello"),("assistant","test response")):
    db.execute("""INSERT INTO messages
    (session_id,role,content,channel,created_at)
    VALUES (?,?,?,'chat',CURRENT_TIMESTAMP)""",
    ("chat-test-001",role,content))

# Mirror createLead() and its paired pipeline insert.
db.execute("""INSERT INTO leads
(id,name,phone,email,message,source,status,ai_score,score,followup_stage,created_at,updated_at)
VALUES (?,?,?,?,?,?,'new',0,0,0,?,?)""",
("lead-test-001","Synthetic Lead","+10000000000",None,"fixture only","test",100,100))
db.execute("""INSERT INTO sales_pipeline
(id,lead_id,stage,deal_value,currency,probability,notes,created_at,updated_at)
VALUES (?,?, 'new',0,'USD',0,'',?,?)""",
("pipeline-test-001","lead-test-001",100,100))

# Mirror user-memory insert and rate-limit upsert patterns.
db.execute("""INSERT INTO user_memory
(id,user_id,category,memory_key,memory_value,source_session_id,status,created_at,updated_at)
VALUES (?,?,?,?,?,?,?, ?, ?)""",
("memory-test-001","user-test-001","project","fixture","synthetic","chat-test-001","pending",100,100))
db.execute("""INSERT INTO rate_limits (ip,window_start,count) VALUES (?,?,1)
ON CONFLICT(ip) DO UPDATE SET
count=CASE WHEN rate_limits.window_start <= ? THEN 1 ELSE rate_limits.count+1 END,
window_start=CASE WHEN rate_limits.window_start <= ? THEN excluded.window_start ELSE rate_limits.window_start END""",
("test-ip",100,50,50))

# The current admin handlers read these tables with SELECT *.
assert db.execute("SELECT * FROM conversions ORDER BY rowid DESC LIMIT 200").fetchall() == []
assert db.execute("SELECT * FROM referrals ORDER BY rowid DESC LIMIT 200").fetchall() == []
assert db.execute("SELECT * FROM follow_ups ORDER BY rowid DESC LIMIT 200").fetchall() == []
assert db.execute("SELECT key,value FROM settings LIMIT 200").fetchall() == []

assert db.execute("SELECT COUNT(*) FROM leads").fetchone()[0] == 1
assert db.execute("SELECT COUNT(*) FROM sales_pipeline").fetchone()[0] == 1
assert db.execute("SELECT COUNT(*) FROM messages").fetchone()[0] == 2
assert db.execute("SELECT COUNT(*) FROM auth_sessions").fetchone()[0] == 1
assert db.execute("SELECT COUNT(*) FROM user_memory").fetchone()[0] == 1
assert db.execute("PRAGMA foreign_key_check").fetchall() == []

# Lead approval workflow: public submission remains outside CRM until approval.
db.execute("""INSERT INTO lead_drafts
(id,lead_id,name,phone,email,message,source,status,version,idempotency_key,created_at,updated_at)
VALUES (?,?,?,?,?,?,?,'DRAFT',1,?,?,?)""",
("draft-pending-001","lead-pending-001","Pending Lead","+10000000001",None,
 "synthetic pending lead","test","idem-pending-001",200,200))
db.execute("""UPDATE lead_drafts SET status='PENDING_REVIEW', updated_at=?
WHERE id=? AND status='DRAFT' AND version=1""",(201,"draft-pending-001"))
assert db.execute("SELECT status FROM lead_drafts WHERE id=?",
 ("draft-pending-001",)).fetchone()[0] == "PENDING_REVIEW"
assert db.execute("SELECT COUNT(*) FROM leads WHERE id='lead-pending-001'").fetchone()[0] == 0

# Unique idempotency key prevents duplicate drafts for the same request key.
try:
    db.execute("""INSERT INTO lead_drafts
    (id,lead_id,name,phone,status,version,idempotency_key,created_at,updated_at)
    VALUES (?,?,?,?,'DRAFT',1,?,?,?)""",
    ("draft-duplicate-001","lead-duplicate-001","Duplicate","+10000000002",
     "idem-pending-001",202,202))
    raise AssertionError("duplicate idempotency key was accepted")
except sqlite3.IntegrityError:
    pass

# Mirror the Worker approval batch in one isolated SQLite transaction.
with db:
    db.execute("""UPDATE lead_drafts
      SET status='APPROVED', reviewer_id='shared_admin_token', review_note=?,
          reviewed_at=?, updated_at=?, reviewed_version=version
      WHERE id=? AND status='PENDING_REVIEW' AND version=?""",
      ("synthetic approval",300,300,"draft-pending-001",1))
    db.execute("""INSERT OR IGNORE INTO leads
      (id,name,phone,email,message,source,status,ai_score,score,followup_stage,created_at,updated_at)
      SELECT lead_id,name,phone,email,message,source,'new',0,0,0,created_at,?
      FROM lead_drafts WHERE id=? AND status='APPROVED' AND reviewed_version=version""",
      (300,"draft-pending-001"))
    db.execute("""INSERT OR IGNORE INTO sales_pipeline
      (id,lead_id,stage,deal_value,currency,probability,notes,created_at,updated_at)
      SELECT ?,d.lead_id,'new',0,'USD',0,'',?,?
      FROM lead_drafts d JOIN leads l ON l.id=d.lead_id
      WHERE d.id=? AND d.status='APPROVED' AND d.reviewed_version=d.version""",
      ("pipeline-pending-001",300,300,"draft-pending-001"))
    db.execute("""UPDATE lead_drafts SET status='CRM_REGISTERED',registered_at=?,updated_at=?
      WHERE id=? AND status='APPROVED' AND reviewed_version=version
      AND EXISTS (SELECT 1 FROM leads WHERE leads.id=lead_drafts.lead_id)
      AND EXISTS (SELECT 1 FROM sales_pipeline WHERE sales_pipeline.lead_id=lead_drafts.lead_id)""",
      (300,300,"draft-pending-001"))

assert db.execute("SELECT status FROM lead_drafts WHERE id=?",
 ("draft-pending-001",)).fetchone()[0] == "CRM_REGISTERED"
assert db.execute("SELECT COUNT(*) FROM leads WHERE id='lead-pending-001'").fetchone()[0] == 1
assert db.execute("SELECT COUNT(*) FROM sales_pipeline WHERE lead_id='lead-pending-001'").fetchone()[0] == 1

# Rejection records the decision and must not create CRM records.
db.execute("""INSERT INTO lead_drafts
(id,lead_id,name,phone,status,version,idempotency_key,created_at,updated_at)
VALUES (?,?,?,?,'PENDING_REVIEW',1,?,?,?)""",
("draft-rejected-001","lead-rejected-001","Rejected Lead","+10000000003",
 "idem-rejected-001",400,400))
db.execute("""UPDATE lead_drafts
SET status='REJECTED',reviewer_id='shared_admin_token',review_note=?,
    reviewed_at=?,updated_at=?,reviewed_version=version
WHERE id=? AND status='PENDING_REVIEW' AND version=?""",
("synthetic rejection",401,401,"draft-rejected-001",1))
assert db.execute("SELECT status FROM lead_drafts WHERE id=?",
 ("draft-rejected-001",)).fetchone()[0] == "REJECTED"
assert db.execute("SELECT COUNT(*) FROM leads WHERE id='lead-rejected-001'").fetchone()[0] == 0
assert db.execute("SELECT COUNT(*) FROM sales_pipeline WHERE lead_id='lead-rejected-001'").fetchone()[0] == 0

print("PASS: live-schema fixture supports core Worker SQL and lead approval workflow (synthetic data only).")
