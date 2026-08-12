-- Migration: 002_create_workspaces

CREATE TABLE workspaces (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       TEXT        NOT NULL,
    slug       TEXT        NOT NULL UNIQUE,  -- URL-safe, e.g. "acme-corp"
    owner_id   UUID        NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspaces_slug     ON workspaces (slug);
CREATE INDEX idx_workspaces_owner_id ON workspaces (owner_id);

CREATE TABLE workspace_members (
    workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users (id)      ON DELETE CASCADE,
    role         TEXT NOT NULL DEFAULT 'MEMBER'
                      CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')),
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_user_id ON workspace_members (user_id);