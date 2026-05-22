"use client";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useWorkspaceStore } from "@/lib/store/workspaceStore";

export default function ChannelPage() {
  const params = useParams();
  const channelId = params?.channel as string;
  const { channels, setActiveChannel, activeChannel } = useWorkspaceStore();

  useEffect(() => {
    const ch = channels.find((c) => c.id === channelId);
    if (ch) setActiveChannel(ch);
  }, [channelId, channels]);

  return (
    <div className="flex h-full flex-col">
      {/* Channel header */}
      <div className="flex h-14 flex-shrink-0 items-center border-b border-[var(--border)] px-6">
        <span className="mr-1.5 text-[var(--text-muted)]">#</span>
        <span className="font-semibold text-[var(--text-primary)]">
          {activeChannel?.name ?? "..."}
        </span>
        {activeChannel?.topic && (
          <>
            <span className="mx-3 text-[var(--border-light)]">|</span>
            <span className="text-sm text-[var(--text-secondary)] truncate">
              {activeChannel.topic}
            </span>
          </>
        )}
      </div>

      {/* Message area — Day 16 */}
      <div className="flex flex-1 items-center justify-center text-[var(--text-muted)] text-sm">
        Message list coming on Day 16
      </div>

      {/* Input area — Day 17 */}
      <div className="border-t border-[var(--border)] p-4">
        <div
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3
                        text-sm text-[var(--text-muted)]"
        >
          Message input coming on Day 17
        </div>
      </div>
    </div>
  );
}
