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

print("PASS: live-schema fixture supports the inspected core Worker SQL patterns (synthetic data only).")
