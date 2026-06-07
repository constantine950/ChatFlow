"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { useMessageStore } from "../../lib/store/messageStore";
import { useAuthStore } from "../../lib/store/authStore";
import { messageApi, Message } from "../../lib/api/message";
import MessageItem from "./MessageItem";
import ThreadDrawer from "../threads/ThreadDrawer";
import { MessageListSkeleton } from "../ui/Skeleton";
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

  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [threadMessage, setThreadMessage] = useState<Message | null>(null);

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const channelMessages = messages[channelId] ?? [];
  const typing = typingUsers[channelId] ?? [];

  useEffect(() => {
    setInitialLoad(true);
    setHasMore(true);
    setNextCursor(null);
    messageApi.list(channelId).then((res) => {
      setMessages(channelId, [...res.data].reverse());
      setHasMore(res.has_more);
      setNextCursor(res.next_cursor);
      setInitialLoad(false);
    });
  }, [channelId]);

  useEffect(() => {
    if (!initialLoad && channelMessages.length > 0) {
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({
          index: channelMessages.length - 1,
          behavior: "smooth",
        });
      }, 50);
    }
  }, [channelMessages.length, initialLoad]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await messageApi.list(channelId, nextCursor);
      prependMessages(channelId, [...res.data].reverse());
      setHasMore(res.has_more);
      setNextCursor(res.next_cursor);
    } finally {
      setLoadingMore(false);
    }
  }, [channelId, hasMore, loadingMore, nextCursor]);

  // Show skeleton while loading
  if (initialLoad) {
    return (
      <div className="flex flex-1 overflow-hidden">
        <MessageListSkeleton />
      </div>
    );
  }

  type RenderItem =
    | { kind: "divider"; date: string; key: string }
    | { kind: "message"; message: Message; isGrouped: boolean; key: string };

  const items: RenderItem[] = [];
  channelMessages.forEach((msg, i) => {
    const prev = channelMessages[i - 1];
    const showDivider = !prev || !isSameDay(prev.created_at, msg.created_at);
    const isGrouped =
      !!prev && !showDivider && isSameAuthorWithinMinutes(prev, msg);
    if (showDivider) {
      items.push({
        kind: "divider",
        date: msg.created_at,
        key: `divider-${msg.id}`,
      });
    }
    items.push({ kind: "message", message: msg, isGrouped, key: msg.id });
  });

  const totalCount = items.length + (typing.length > 0 ? 1 : 0);

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <Virtuoso
          ref={virtuosoRef}
          style={{ flex: 1 }}
          totalCount={totalCount}
          initialTopMostItemIndex={Math.max(0, items.length - 1)}
          startReached={loadMore}
          components={{
            Header: () => (
              <div className="flex justify-center py-3">
                {loadingMore && (
                  <div
                    className="h-4 w-4 animate-spin rounded-full border-2
                                  border-[var(--border)] border-t-[var(--accent)]"
                  />
                )}
                {!hasMore && channelMessages.length > 0 && (
                  <p className="text-xs text-[var(--text-muted)]">
                    Beginning of channel
                  </p>
                )}
              </div>
            ),
          }}
          itemContent={(index) => {
            if (index === items.length && typing.length > 0) {
              return (
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
              );
            }

            const item = items[index];
            if (!item) return <div />;

            if (item.kind === "divider") {
              return (
                <div className="flex items-center gap-3 px-6 py-3">
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    {dayDivider(item.date)}
                  </span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>
              );
            }

            return (
              <MessageItem
                message={item.message}
                isGrouped={item.isGrouped}
                currentUserId={user?.id ?? ""}
                onThreadOpen={setThreadMessage}
              />
            );
          }}
        />
      </div>

      <ThreadDrawer
        parentMessage={threadMessage}
        onClose={() => setThreadMessage(null)}
      />
    </div>
  );
}
