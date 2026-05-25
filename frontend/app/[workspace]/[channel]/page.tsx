"use client";
import { useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useWorkspaceStore } from "@/lib/store/workspaceStore";
import { useWS } from "@/lib/hooks/WSContext";
import MessageList from "@/components/messages/MessageList";
import MessageInput from "@/components/messages/MessageInput";

export default function ChannelPage() {
  const params = useParams();
  const channelId = params?.channel as string;

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
    <div className="flex h-full flex-col overflow-hidden">
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

      {channelId && <MessageList channelId={channelId} />}

      {activeChannel && (
        <MessageInput
          channelId={channelId}
          channelName={activeChannel.name}
          onSend={handleSend}
          onTyping={handleTyping}
        />
      )}
    </div>
  );
}
