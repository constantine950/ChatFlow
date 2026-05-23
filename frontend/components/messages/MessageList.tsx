"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { useMessageStore } from "../../lib/store/messageStore";
import { useAuthStore } from "../../lib/store/authStore";
import { messageApi } from "../../lib/api/message";
import MessageItem from "./MessageItem";
import {
  dayDivider,
  isSameDay,
  isSameAuthorWithinMinutes,
} from "../../lib/utils/time";

interface Props {
  channelId: string;
}

export default function MessageList({ channelId }: Props) {
  const { messages, setMessages, prependMessages, typingUsers } =
    useMessageStore();
  const { user } = useAuthStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const channelMessages = messages[channelId] ?? [];
  const typing = typingUsers[channelId] ?? [];

  // Initial fetch
  useEffect(() => {
    setInitialLoad(true);
    setHasMore(true);
    setNextCursor(null);

    messageApi.list(channelId).then((res) => {
      // API returns newest first — reverse for display
      setMessages(channelId, [...res.data].reverse());
      setHasMore(res.has_more);
      setNextCursor(res.next_cursor);
      setInitialLoad(false);
    });
  }, [channelId]);

  // Scroll to bottom on initial load and new messages
  useEffect(() => {
    if (!initialLoad) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [channelMessages.length, initialLoad]);

  // Infinite scroll — load older messages when scrolling to top
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !nextCursor) return;
    setLoadingMore(true);

    // Save scroll position before prepending
    const container = containerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;

    try {
      const res = await messageApi.list(channelId, nextCursor);
      prependMessages(channelId, [...res.data].reverse());
      setHasMore(res.has_more);
      setNextCursor(res.next_cursor);

      // Restore scroll position after prepend
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevScrollHeight;
        }
      });
    } finally {
      setLoadingMore(false);
    }
  }, [channelId, hasMore, loadingMore, nextCursor]);

  // IntersectionObserver on the top sentinel
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 0.1 },
    );
    if (topRef.current) observer.observe(topRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  if (initialLoad) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-1 flex-col overflow-y-auto py-2"
    >
      {/* Top sentinel for infinite scroll */}
      <div ref={topRef} className="flex justify-center py-2">
        {loadingMore && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
        )}
        {!hasMore && channelMessages.length > 0 && (
          <p className="text-xs text-[var(--text-muted)]">
            Beginning of channel
          </p>
        )}
      </div>

      {/* Messages */}
      {channelMessages.map((msg, i) => {
        const prev = channelMessages[i - 1];
        const showDivider =
          !prev || !isSameDay(prev.created_at, msg.created_at);
        const isGrouped =
          !!prev && !showDivider && isSameAuthorWithinMinutes(prev, msg);

        return (
          <div key={msg.id}>
            {/* Day divider */}
            {showDivider && (
              <div className="flex items-center gap-3 px-6 py-3">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-xs font-medium text-[var(--text-muted)]">
                  {dayDivider(msg.created_at)}
                </span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>
            )}

            <MessageItem
              message={msg}
              isGrouped={isGrouped}
              currentUserId={user?.id ?? ""}
            />
          </div>
        );
      })}

      {/* Typing indicators */}
      {typing.length > 0 && (
        <div className="flex items-center gap-2 px-6 py-2">
          <div className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)] animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            {typing.map((u) => u.displayName).join(", ")}{" "}
            {typing.length === 1 ? "is" : "are"} typing...
          </span>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}
