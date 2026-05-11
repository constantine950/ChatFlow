-- Migration: 003_create_channels

CREATE TABLE channels (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    name         TEXT        NOT NULL,
    topic        TEXT,
    is_private   BOOLEAN     NOT NULL DEFAULT false,
    is_dm        BOOLEAN     NOT NULL DEFAULT false,  -- true = direct message channel
    created_by   UUID        NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Channel names must be unique within a workspace
    -- DMs are exempt (they don't have user-facing names)
    UNIQUE NULLS NOT DISTINCT (workspace_id, name)
);

CREATE INDEX idx_channels_workspace_id ON channels (workspace_id);
CREATE INDEX idx_channels_created_by   ON channels (created_by);

-- ─────────────────────────────────────────────
CREATE TABLE channel_members (
    channel_id   UUID        NOT NULL REFERENCES channels (id) ON DELETE CASCADE,
    user_id      UUID        NOT NULL REFERENCES users (id)    ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ,   -- used for unread badge on Day 21
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (channel_id, user_id)
);

CREATE INDEX idx_channel_members_user_id ON channel_members (user_id);