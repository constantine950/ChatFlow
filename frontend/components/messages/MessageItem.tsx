"use client";
import { useState } from "react";
import { Message } from "../../lib/api/message";
import { messageTime } from "../../lib/utils/time";
import ReactionPicker from "../reactions/ReactionPicker";
import { messageApi } from "../../lib/api/message";

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

  const ActionBar = () => (
    <div
      className="absolute right-4 -top-4 hidden group-hover:flex items-center gap-1
                    rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]
                    px-1.5 py-1 shadow-lg z-10"
    >
      {/* React button */}
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

      {/* Reply in thread button */}
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
    </div>
  );

  const messageContent = (
    <>
      <p className="text-sm text-[var(--text-primary)] leading-relaxed break-words">
        {message.content}
      </p>

      {/* Reactions */}
      {reactions.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {reactions.map((r) => (
            <button
              key={r.emoji}
              onClick={() => handleReaction(r.emoji)}
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5
                          text-xs transition-colors
                          ${
                            r.mine
                              ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
                              : "border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:border-[var(--border-light)]"
                          }`}
            >
              <span>{r.emoji}</span>
              <span>{r.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Reply count — shows how many threaded replies exist */}
      {message.reply_count > 0 && (
        <button
          onClick={() => onThreadOpen(message)}
          className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--accent)]
                     hover:underline transition-colors"
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
      <div
        className="group relative flex items-start gap-3 px-6 py-0.5
                      hover:bg-[var(--bg-hover)] transition-colors"
      >
        <div
          className="w-9 flex-shrink-0 flex items-center justify-end
                        opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <span className="text-[10px] text-[var(--text-muted)]">
            {messageTime(message.created_at)}
          </span>
        </div>
        <div className="flex-1 min-w-0">{messageContent}</div>
        <ActionBar />
      </div>
    );
  }

  return (
    <div
      className="group relative flex items-start gap-3 px-6 py-1.5
                    hover:bg-[var(--bg-hover)] transition-colors"
    >
      <div
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center
                      rounded-lg ${avatarColor} text-xs font-semibold text-white select-none`}
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
      <ActionBar />
    </div>
  );
}
