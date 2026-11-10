-- 2020KHODA GLOBAL AI CORE
-- Candidate-only D1 schema snapshot.
-- Source: sqlite_master definitions from 2020khoda-crm, read-only audit on 2026-11-10.
-- Schema only: NO production rows, credentials, tokens, or user data are included.
-- This file is an artifact only; it has NOT been applied to any database.

PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE guest_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  last_seen_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE chat_sessions (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'گفتگوی جدید',
  model TEXT DEFAULT 'workers-ai',
  archived INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE conversions (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  type TEXT NOT NULL,
  value REAL DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE follow_ups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER,
  type TEXT DEFAULT 'email',
  status TEXT DEFAULT 'pending',
  scheduled_at DATETIME,
  sent_at DATETIME,
  content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE guest_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(session_id) REFERENCES guest_sessions(id) ON DELETE CASCADE
);

CREATE TABLE lead_drafts (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  message TEXT DEFAULT '',
  source TEXT DEFAULT 'website',
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN (
      'DRAFT', 'PENDING_REVIEW', 'APPROVED',
      'REJECTED', 'CHANGES_REQUESTED',
      'CRM_REGISTERED', 'CANCELLED'
    )),
  version INTEGER NOT NULL DEFAULT 1,
  reviewed_version INTEGER,
  idempotency_key TEXT UNIQUE,
  reviewer_id TEXT,
  review_note TEXT DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  reviewed_at INTEGER,
  registered_at INTEGER,
  expires_at INTEGER
);

CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT DEFAULT '',
  source TEXT DEFAULT 'landing',
  status TEXT DEFAULT 'new',
  ai_score REAL DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  score INTEGER DEFAULT 0,
  followup_stage INTEGER DEFAULT 0,
  last_contact DATETIME,
  email TEXT
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  role TEXT,
  content TEXT,
  channel TEXT DEFAULT 'chat',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE page_views (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  referrer TEXT DEFAULT '',
  country TEXT DEFAULT '',
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER,
  amount INTEGER,
  currency TEXT,
  status TEXT,
  stripe_session_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE plugin_registry (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  enabled INTEGER DEFAULT 0,
  description TEXT DEFAULT '',
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE public_lead_inbox (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  message TEXT,
  source TEXT NOT NULL DEFAULT 'website',
  status TEXT NOT NULL DEFAULT 'new',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE public_rate_limits (
  rate_key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE rate_limits (
  ip TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE referrals (
  id TEXT PRIMARY KEY,
  referrer_lead_id TEXT NOT NULL,
  referred_name TEXT NOT NULL,
  referred_phone TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  reward REAL DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE sales_pipeline (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  stage TEXT DEFAULT 'new',
  deal_value REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  probability INTEGER DEFAULT 0,
  expected_close_date TEXT,
  notes TEXT DEFAULT '',
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_memory (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  memory_key TEXT NOT NULL,
  memory_value TEXT NOT NULL,
  source_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'archived')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (user_id, category, memory_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_auth_sessions_expiry ON auth_sessions(expires_at);
CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX idx_chat_sessions_owner ON chat_sessions(owner_id, updated_at);
CREATE INDEX idx_guest_messages_session ON guest_messages(session_id, created_at);
CREATE INDEX idx_guest_sessions_expiry ON guest_sessions(expires_at);
CREATE INDEX idx_lead_drafts_expires ON lead_drafts(expires_at);
CREATE INDEX idx_lead_drafts_phone ON lead_drafts(phone);
CREATE INDEX idx_lead_drafts_status_created ON lead_drafts(status, created_at);
CREATE INDEX idx_plugins_enabled ON plugin_registry(enabled);
CREATE INDEX idx_public_lead_inbox_status_created ON public_lead_inbox(status, created_at);
CREATE INDEX idx_public_rate_limits_updated_at ON public_rate_limits(updated_at);
CREATE INDEX idx_user_memory_user_status_updated ON user_memory(user_id, status, updated_at DESC);
CREATE INDEX idx_users_email ON users(email);
