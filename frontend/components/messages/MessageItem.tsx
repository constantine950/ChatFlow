"use client";
import { Message } from "../../lib/api/message";
import { messageTime } from "../../lib/utils/time";

interface Props {
  message: Message;
  isGrouped: boolean; // true = collapse avatar + name (same author within 5min)
  currentUserId: string;
}

export default function MessageItem({
  message,
  isGrouped,
  currentUserId,
}: Props) {
  const isOwn = message.user_id === currentUserId;

  // Avatar initials
  const initials = message.display_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (isGrouped) {
    return (
      <div className="group flex items-start gap-3 px-6 py-0.5 hover:bg-[var(--bg-hover)] transition-colors">
        {/* Timestamp in place of avatar on hover */}
        <div className="w-9 flex-shrink-0 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] text-[var(--text-muted)]">
            {messageTime(message.created_at)}
          </span>
        </div>
        <p className="flex-1 text-sm text-[var(--text-primary)] leading-relaxed break-words min-w-0">
          {message.content}
        </p>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3 px-6 py-1.5 hover:bg-[var(--bg-hover)] transition-colors">
      {/* Avatar */}
      <div
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center
                      rounded-lg bg-[var(--bg-active)] text-xs font-semibold
                      text-[var(--text-primary)] select-none"
      >
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        {/* Name + timestamp */}
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

        {/* Content */}
        <p className="text-sm text-[var(--text-primary)] leading-relaxed break-words">
          {message.content}
        </p>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5
                            text-xs transition-colors
                            ${
                              r.mine
                                ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
                                : "border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                            }`}
              >
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
