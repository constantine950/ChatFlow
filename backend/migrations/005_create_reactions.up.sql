-- Migration: 005_create_reactions

CREATE TABLE message_reactions (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID        NOT NULL REFERENCES messages (id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users (id)    ON DELETE CASCADE,
    emoji      TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- One reaction per emoji per user per message (toggle behaviour)
    UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX idx_reactions_message_id ON message_reactions (message_id);