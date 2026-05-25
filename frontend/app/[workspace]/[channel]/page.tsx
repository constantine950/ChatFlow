"use client";
import { useEffect, useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { useWorkspaceStore } from "@/lib/store/workspaceStore";
import { useWS } from "@/lib/hooks/WSContext";
import MessageList from "@/components/messages/MessageList";
import MessageInput from "@/components/messages/MessageInput";
import MemberList from "@/components/channels/MemberList";

export default function ChannelPage() {
  const params = useParams();
  const channelId = params?.channel as string;
  const [showMembers, setShowMembers] = useState(true);

  const { channels, setActiveChannel, activeChannel } = useWorkspaceStore();
  const { sendMessage, sendTyping, joinChannel } = useWS();

  useEffect(() => {
    const ch = channels.find((c) => c.id === channelId);
    if (ch) setActiveChannel(ch);
  }, [channelId, channels]);

  useEffect(() => {
    if (channelId) joinChannel(channelId);
  }, [channelId]);

  const handleSend = useCallback(
    (content: string) => {
      sendMessage(channelId, content);
    },
    [channelId, sendMessage],
  );

  const handleTyping = useCallback(() => {
    sendTyping(channelId);
  }, [channelId, sendTyping]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-[var(--border)] px-6">
          <div className="flex items-center min-w-0">
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

          {/* Toggle member list */}
          <button
            onClick={() => setShowMembers((v) => !v)}
            title="Toggle member list"
            className={`rounded-md p-1.5 transition-colors ${
              showMembers
                ? "bg-[var(--bg-active)] text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        {channelId && <MessageList channelId={channelId} />}

        {/* Input */}
        {activeChannel && (
          <MessageInput
            channelId={channelId}
            channelName={activeChannel.name}
            onSend={handleSend}
            onTyping={handleTyping}
          />
        )}
      </div>

      {/* Member list panel */}
      {showMembers && <MemberList />}
    </div>
  );
}
