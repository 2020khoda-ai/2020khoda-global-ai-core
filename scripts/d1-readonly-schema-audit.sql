-- READ-ONLY D1 schema audit for a disposable shell or D1 query console.
-- No CREATE, ALTER, INSERT, UPDATE, DELETE, DROP, or migration statements.
SELECT name, sql
FROM sqlite_master
WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
ORDER BY name;

PRAGMA table_info(users);
PRAGMA table_info(auth_sessions);
PRAGMA table_info(chat_sessions);
PRAGMA table_info(messages);
PRAGMA table_info(user_memory);
PRAGMA table_info(leads);
PRAGMA table_info(sales_pipeline);
PRAGMA table_info(conversions);
PRAGMA table_info(referrals);
PRAGMA table_info(follow_ups);
PRAGMA table_info(settings);
PRAGMA foreign_key_check;

-- Inspect migration history without changing it.
SELECT version, applied_at
FROM schema_migrations
ORDER BY version;
