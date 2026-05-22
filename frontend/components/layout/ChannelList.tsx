"use client";
import { useRouter, useParams } from "next/navigation";
import { useWorkspaceStore } from "../../lib/store/workspaceStore";

export default function ChannelList() {
  const router = useRouter();
  const params = useParams();
  const { channels, activeWorkspace, activeChannel, setActiveChannel } =
    useWorkspaceStore();
  const activeChannelId = params?.channel as string;

  function navigate(channelId: string) {
    const ch = channels.find((c) => c.id === channelId);
    if (ch && activeWorkspace) {
      setActiveChannel(ch);
      router.push(`/${activeWorkspace.slug}/${ch.id}`);
    }
  }

  return (
    <div className="px-2">
      <div className="mb-1 flex items-center justify-between px-2 py-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Channels
        </span>
      </div>

      {channels
        .filter((c) => !c.is_dm)
        .map((channel) => {
          const isActive = channel.id === activeChannelId;
          return (
            <button
              key={channel.id}
              onClick={() => navigate(channel.id)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left
                        text-sm transition-colors
                        ${
                          isActive
                            ? "bg-[var(--bg-active)] text-[var(--text-primary)]"
                            : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                        }`}
            >
              <span className="text-[var(--text-muted)]">#</span>
              <span className="truncate">{channel.name}</span>
            </button>
          );
        })}
    </div>
  );
}
