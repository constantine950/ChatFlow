-- Migration: 004_create_messages

CREATE TABLE messages (
    id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id        UUID        NOT NULL REFERENCES channels (id) ON DELETE CASCADE,
    user_id           UUID        NOT NULL REFERENCES users (id)    ON DELETE RESTRICT,
    parent_message_id UUID        REFERENCES messages (id)          ON DELETE CASCADE,
    content           TEXT        NOT NULL,
    edited_at         TIMESTAMPTZ,
    deleted_at        TIMESTAMPTZ,  -- soft delete; NULL = not deleted
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Full-text search vector — populated by trigger below
    search_vector     TSVECTOR
);

-- ── Indexes ───────────────────────────────────

-- Primary pagination index: newest messages first within a channel
CREATE INDEX idx_messages_channel_created
    ON messages (channel_id, created_at DESC);

-- Thread lookup: all replies to a given parent
CREATE INDEX idx_messages_parent
    ON messages (parent_message_id)
    WHERE parent_message_id IS NOT NULL;

-- Soft-delete filter: most queries exclude deleted messages
CREATE INDEX idx_messages_not_deleted
    ON messages (channel_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- GIN index for full-text search (Day 13)
CREATE INDEX idx_messages_search
    ON messages USING GIN (search_vector);

-- ── Full-text search trigger ──────────────────
-- Keeps search_vector in sync whenever content changes.
-- Uses English stemming (you can change to 'simple' if multilingual).

CREATE OR REPLACE FUNCTION messages_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', coalesce(NEW.content, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_search_vector_trigger
    BEFORE INSERT OR UPDATE OF content
    ON messages
    FOR EACH ROW EXECUTE FUNCTION messages_search_vector_update();

-- ── File attachments ──────────────────────────
CREATE TABLE file_attachments (
    id          UUID   PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id  UUID   NOT NULL REFERENCES messages (id) ON DELETE CASCADE,
    bucket      TEXT   NOT NULL,        -- MinIO bucket name
    object_key  TEXT   NOT NULL,        -- MinIO object key (not the full URL)
    filename    TEXT   NOT NULL,        -- original filename shown to user
    size_bytes  BIGINT,
    mime_type   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_file_attachments_message_id ON file_attachments (message_id);