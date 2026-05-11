-- =============================================================
--  ChatFlow — development seed data
--  Run AFTER all migrations have been applied.
--
--  Usage:
--    psql $DATABASE_URL -f scripts/seed.sql
--
--  Creates:
--    3 users  (password for all = "password123")
--    1 workspace
--    3 channels (#general, #random, #backend)
--    sample messages
-- =============================================================

-- bcrypt hash of "password123" at cost 12
-- (pre-computed so the seed doesn't need bcrypt at the DB level)
-- In production NEVER store plain or cheaply-hashed passwords.

DO $$
DECLARE
    user_alice   UUID;
    user_bob     UUID;
    user_charlie UUID;
    ws_id        UUID;
    ch_general   UUID;
    ch_random    UUID;
    ch_backend   UUID;
BEGIN

-- ── Users ──────────────────────────────────────────────────────
INSERT INTO users (id, email, password_hash, display_name, avatar_url)
VALUES
    (uuid_generate_v4(), 'alice@chatflow.dev',
     '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2NnHRnB6E6',
     'Alice', null),
    (uuid_generate_v4(), 'bob@chatflow.dev',
     '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2NnHRnB6E6',
     'Bob', null),
    (uuid_generate_v4(), 'charlie@chatflow.dev',
     '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2NnHRnB6E6',
     'Charlie', null)
ON CONFLICT (email) DO NOTHING;

SELECT id INTO user_alice   FROM users WHERE email = 'alice@chatflow.dev';
SELECT id INTO user_bob     FROM users WHERE email = 'bob@chatflow.dev';
SELECT id INTO user_charlie FROM users WHERE email = 'charlie@chatflow.dev';

-- ── Workspace ──────────────────────────────────────────────────
INSERT INTO workspaces (id, name, slug, owner_id)
VALUES (uuid_generate_v4(), 'ChatFlow HQ', 'chatflow-hq', user_alice)
ON CONFLICT (slug) DO NOTHING;

SELECT id INTO ws_id FROM workspaces WHERE slug = 'chatflow-hq';

-- ── Workspace members ──────────────────────────────────────────
INSERT INTO workspace_members (workspace_id, user_id, role)
VALUES
    (ws_id, user_alice,   'OWNER'),
    (ws_id, user_bob,     'MEMBER'),
    (ws_id, user_charlie, 'MEMBER')
ON CONFLICT DO NOTHING;

-- ── Channels ───────────────────────────────────────────────────
INSERT INTO channels (id, workspace_id, name, topic, is_private, is_dm, created_by)
VALUES
    (uuid_generate_v4(), ws_id, 'general', 'Company-wide announcements', false, false, user_alice),
    (uuid_generate_v4(), ws_id, 'random',  'Anything goes',              false, false, user_alice),
    (uuid_generate_v4(), ws_id, 'backend', 'Go, Kafka, Postgres talk',   false, false, user_alice)
ON CONFLICT DO NOTHING;

SELECT id INTO ch_general FROM channels WHERE workspace_id = ws_id AND name = 'general';
SELECT id INTO ch_random  FROM channels WHERE workspace_id = ws_id AND name = 'random';
SELECT id INTO ch_backend FROM channels WHERE workspace_id = ws_id AND name = 'backend';

-- ── Channel members ────────────────────────────────────────────
INSERT INTO channel_members (channel_id, user_id)
VALUES
    (ch_general, user_alice),   (ch_general, user_bob),   (ch_general, user_charlie),
    (ch_random,  user_alice),   (ch_random,  user_bob),
    (ch_backend, user_alice),   (ch_backend, user_charlie)
ON CONFLICT DO NOTHING;

-- ── Sample messages ────────────────────────────────────────────
INSERT INTO messages (id, channel_id, user_id, content)
VALUES
    (uuid_generate_v4(), ch_general, user_alice,   'Welcome to ChatFlow HQ! 🎉'),
    (uuid_generate_v4(), ch_general, user_bob,     'Hey everyone! Excited to be here.'),
    (uuid_generate_v4(), ch_general, user_charlie, 'Same here, let''s build something great.'),
    (uuid_generate_v4(), ch_random,  user_bob,     'Anyone catch the game last night?'),
    (uuid_generate_v4(), ch_random,  user_alice,   'Missed it — was deep in Kafka docs 😅'),
    (uuid_generate_v4(), ch_backend, user_alice,   'Reminder: migrations run with golang-migrate.'),
    (uuid_generate_v4(), ch_backend, user_charlie, 'Got it. Should we add a Makefile target?')
;

-- ── Sample reaction ────────────────────────────────────────────
INSERT INTO message_reactions (message_id, user_id, emoji)
SELECT m.id, user_bob, '👍'
FROM   messages m
WHERE  m.channel_id = ch_general AND m.user_id = user_alice
LIMIT  1
ON CONFLICT DO NOTHING;

RAISE NOTICE 'Seed complete. Workspace: chatflow-hq, Users: alice / bob / charlie (password: password123)';
END $$;