"use client";
import { useState } from "react";
import { Message, messageApi } from "../../lib/api/message";
import { messageTime } from "../../lib/utils/time";
import ReactionPicker from "../reactions/ReactionPicker";
import { useMessageStore } from "../../lib/store/messageStore";

interface Props {
  message: Message;
  isGrouped: boolean;
  currentUserId: string;
  onThreadOpen: (message: Message) => void;
}

export default function MessageItem({
  message,
  isGrouped,
  currentUserId,
  onThreadOpen,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [reactions, setReactions] = useState(message.reactions ?? []);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const { updateMessage, removeMessage } = useMessageStore();
  const isOwn = message.user_id === currentUserId;

  const initials = message.display_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const colors = [
    "bg-indigo-500",
    "bg-violet-500",
    "bg-blue-500",
    "bg-teal-500",
    "bg-emerald-500",
    "bg-orange-500",
  ];
  const avatarColor =
    colors[message.display_name.charCodeAt(0) % colors.length];

  async function handleReaction(emoji: string) {
    setShowPicker(false);
    try {
      const res = await messageApi.toggleReaction(
        message.id,
        emoji,
        message.channel_id,
      );
      setReactions(res.reactions);
    } catch {}
  }

  async function handleSaveEdit() {
    const content = editContent.trim();
    if (!content || content === message.content) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    try {
      const updated = await messageApi.edit(message.id, content);
      updateMessage(message.channel_id, {
        id: message.id,
        content: updated.content,
        edited_at: updated.edited_at,
      });
      setIsEditing(false);
    } catch {
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await messageApi.delete(message.id);
      removeMessage(message.channel_id, message.id);
      setDeleted(true);
    } catch {
      setShowDeleteConfirm(false);
    }
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === "Escape") {
      setIsEditing(false);
      setEditContent(message.content);
    }
  }

  if (deleted) return null;

  const ActionBar = () => (
    <div
      className="absolute right-4 -top-4 hidden group-hover:flex items-center gap-1
                    rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]
                    px-1.5 py-1 shadow-lg z-10"
    >
      {/* React */}
      <div className="relative">
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)]
                     hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
          title="Add reaction"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M8 13s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </button>
        {showPicker && (
          <div className="absolute right-0 top-8 z-20">
            <ReactionPicker onPick={handleReaction} />
          </div>
        )}
      </div>

      {/* Reply in thread */}
      <button
        onClick={() => onThreadOpen(message)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)]
                   hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
        title="Reply in thread"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <polyline points="9 17 4 12 9 7" />
          <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
        </svg>
      </button>

      {/* Edit — only for own messages */}
      {isOwn && (
        <button
          onClick={() => {
            setIsEditing(true);
            setShowPicker(false);
          }}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)]
                     hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
          title="Edit message"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      )}

      {/* Delete — only for own messages */}
      {isOwn && (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)]
                     hover:bg-red-500/10 hover:text-red-400 transition-colors"
          title="Delete message"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      )}
    </div>
  );

  // Edit mode input
  const EditInput = () => (
    <div className="mt-1">
      <textarea
        value={editContent}
        onChange={(e) => setEditContent(e.target.value)}
        onKeyDown={handleEditKeyDown}
        autoFocus
        rows={2}
        className="w-full rounded-lg border border-[var(--accent)] bg-[var(--bg-tertiary)]
                   px-3 py-2 text-sm text-[var(--text-primary)] outline-none
                   ring-2 ring-[var(--accent-dim)] resize-none leading-relaxed"
        style={{ maxHeight: "200px" }}
      />
      <div className="mt-1.5 flex items-center gap-2">
        <button
          onClick={handleSaveEdit}
          disabled={saving}
          className="rounded-md bg-[var(--accent)] px-3 py-1 text-xs font-medium
                     text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={() => {
            setIsEditing(false);
            setEditContent(message.content);
          }}
          className="rounded-md px-3 py-1 text-xs text-[var(--text-secondary)]
                     hover:text-[var(--text-primary)] transition-colors"
        >
          Cancel
        </button>
        <span className="text-[10px] text-[var(--text-muted)]">
          Esc to cancel · Enter to save
        </span>
      </div>
    </div>
  );

  // Delete confirmation
  const DeleteConfirm = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={() => setShowDeleteConfirm(false)}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm mx-4 rounded-xl border border-[var(--border)]
                   bg-[var(--bg-secondary)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
          Delete message?
        </h3>
        <p className="mb-4 text-xs text-[var(--text-secondary)] leading-relaxed">
          This will permanently delete your message. This action cannot be
          undone.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2
                       text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium
                       text-white hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );

  const messageContent = (
    <>
      {isEditing ? (
        <EditInput />
      ) : (
        <p className="text-sm text-[var(--text-primary)] leading-relaxed break-words">
          {message.content}
        </p>
      )}

      {/* Reactions */}
      {reactions.length > 0 && !isEditing && (
        <div className="mt-1 flex flex-wrap gap-1">
          {reactions.map((r) => (
            <button
              key={r.emoji}
              onClick={() => handleReaction(r.emoji)}
              className={
                "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors " +
                (r.mine
                  ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:border-[var(--border-light)]")
              }
            >
              <span>{r.emoji}</span>
              <span>{r.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Reply count */}
      {message.reply_count > 0 && !isEditing && (
        <button
          onClick={() => onThreadOpen(message)}
          className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <polyline points="9 17 4 12 9 7" />
            <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
          </svg>
          {message.reply_count}{" "}
          {message.reply_count === 1 ? "reply" : "replies"}
        </button>
      )}
    </>
  );

  if (isGrouped) {
    return (
      <>
        <div className="group relative flex items-start gap-3 px-6 py-0.5 hover:bg-[var(--bg-hover)] transition-colors">
          <div className="w-9 flex-shrink-0 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-[var(--text-muted)]">
              {messageTime(message.created_at)}
            </span>
          </div>
          <div className="flex-1 min-w-0">{messageContent}</div>
          {!isEditing && <ActionBar />}
        </div>
        {showDeleteConfirm && <DeleteConfirm />}
      </>
    );
  }

  return (
    <>
      <div className="group relative flex items-start gap-3 px-6 py-1.5 hover:bg-[var(--bg-hover)] transition-colors">
        <div
          className={
            "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg " +
            avatarColor +
            " text-xs font-semibold text-white select-none"
          }
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {message.display_name}
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">
              {messageTime(message.created_at)}
            </span>
            {message.edited_at && (
              <span className="text-[10px] text-[var(--text-muted)] italic">
                (edited)
              </span>
            )}
          </div>
          {messageContent}
        </div>
        {!isEditing && <ActionBar />}
      </div>
      {showDeleteConfirm && <DeleteConfirm />}
    </>
  );
}
