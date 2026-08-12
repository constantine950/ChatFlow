
ALTER TABLE channel_members
    ADD COLUMN IF NOT EXISTS last_read_message_id UUID
        REFERENCES messages (id) ON DELETE SET NULL;
