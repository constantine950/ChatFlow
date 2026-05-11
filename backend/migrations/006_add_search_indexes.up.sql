-- Migration: 006_add_read_receipts
-- Adds the last_read_message_id column used for unread badge counts.
-- Kept as a separate migration so it's easy to understand the intent.

ALTER TABLE channel_members
    ADD COLUMN IF NOT EXISTS last_read_message_id UUID
        REFERENCES messages (id) ON DELETE SET NULL;

-- Fast lookup: "how many unread messages does user X have in channel Y?"
-- Query pattern: SELECT count(*) FROM messages
--   WHERE channel_id = ? AND created_at > (SELECT last_read_at FROM channel_members ...)
-- The idx_messages_channel_created index from migration 004 already covers this.
-- No new index needed.