-- Rollback: 006_add_read_receipts
ALTER TABLE channel_members
    DROP COLUMN IF EXISTS last_read_message_id;