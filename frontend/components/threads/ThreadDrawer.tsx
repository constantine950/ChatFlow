"use client";
import { useEffect, useState } from "react";
import { messageApi, Message } from "../../lib/api/message";
import { useWS } from "../../lib/hooks/WSContext";
import { messageTime } from "../../lib/utils/time";

interface Props {
  parentMessage: Message | null;
  onClose: () => void;
}

export default function ThreadDrawer({ parentMessage, onClose }: Props) {
  const [replies, setReplies] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const { sendMessage } = useWS();

  const fetchReplies = () => {
    if (!parentMessage) return;
    setLoading(true);
    messageApi
      .getThread(parentMessage.id)
      .then((res) => setReplies(res.data ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!parentMessage) return;
    setReplies([]);
    fetchReplies();
  }, [parentMessage?.id]);

  function handleSend() {
    if (!content.trim() || !parentMessage) return;
    sendMessage(parentMessage.channel_id, content.trim(), parentMessage.id);
    setContent("");
    // Refetch after Kafka pipeline delay
    setTimeout(fetchReplies, 800);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function Avatar({ name }: { name: string }) {
    const initials = name
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
    const color = colors[name.charCodeAt(0) % colors.length];
    return (
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center
                       rounded-lg ${color} text-xs font-semibold text-white`}
      >
        {initials}
      </div>
    );
  }

  if (!parentMessage) return null;

  return (
    <div className="flex h-full w-80 flex-shrink-0 flex-col border-l border-[var(--border)] bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-[var(--border)] px-4">
        <span className="font-semibold text-sm text-[var(--text-primary)]">
          Thread
        </span>
        <button
          onClick={onClose}
          className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Parent message */}
        <div className="border-b border-[var(--border)] p-4">
          <div className="flex items-start gap-3">
            <Avatar name={parentMessage.display_name} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {parentMessage.display_name}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  {messageTime(parentMessage.created_at)}
                </span>
              </div>
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                {parentMessage.content}
              </p>
            </div>
          </div>
        </div>

        {/* Replies count */}
        {replies.length > 0 && (
          <div className="px-4 py-2 border-b border-[var(--border)]">
            <span className="text-xs font-medium text-[var(--text-muted)]">
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </span>
          </div>
        )}

        {/* Replies list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="flex justify-center py-4">
              <div
                className="h-4 w-4 animate-spin rounded-full border-2
                              border-[var(--border)] border-t-[var(--accent)]"
              />
            </div>
          )}

          {!loading && replies.length === 0 && (
            <p className="text-center text-sm text-[var(--text-muted)] py-4">
              No replies yet. Start the thread!
            </p>
          )}

          {replies.map((reply) => (
            <div key={reply.id} className="flex items-start gap-3">
              <Avatar name={reply.display_name} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {reply.display_name}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {messageTime(reply.created_at)}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-primary)] leading-relaxed break-words">
                  {reply.content}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Reply input */}
        <div className="border-t border-[var(--border)] p-3">
          <div
            className="flex items-end gap-2 rounded-lg border border-[var(--border)]
                          bg-[var(--bg-tertiary)] px-3 py-2 focus-within:border-[var(--accent)]
                          focus-within:ring-1 focus-within:ring-[var(--accent-dim)] transition-all"
          >
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Reply in thread..."
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-[var(--text-primary)]
                         outline-none placeholder:text-[var(--text-muted)] leading-relaxed"
              style={{ maxHeight: "120px" }}
            />
            <button
              onClick={handleSend}
              disabled={!content.trim()}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-all flex-shrink-0
                          ${
                            content.trim()
                              ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                              : "bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-not-allowed"
                          }`}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
            <kbd className="rounded bg-[var(--bg-tertiary)] px-1 py-0.5 text-[10px]">
              Enter
            </kbd>{" "}
            to reply
            {" · "}
            <kbd className="rounded bg-[var(--bg-tertiary)] px-1 py-0.5 text-[10px]">
              Shift+Enter
            </kbd>{" "}
            for newline
          </p>
        </div>
      </div>
    </div>
  );
}
