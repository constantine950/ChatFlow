"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useWorkspaceStore } from "../../lib/store/workspaceStore";
import { channelApi, Channel } from "../../lib/api/workspace";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

function authFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("access_token");
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...((options.headers as Record<string, string>) ?? {}),
    },
  });
}

export default function ChannelList() {
  const router = useRouter();
  const params = useParams();
  const activeChannelId = params?.channel as string;

  const {
    channels,
    setChannels,
    activeWorkspace,
    setActiveChannel,
    unreadCounts,
    setUnreadCount,
    clearUnread,
    addChannel,
  } = useWorkspaceStore();

  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // Refresh channel list every 30s to pick up channels created by others
  useEffect(() => {
    if (!activeWorkspace) return;

    function refresh() {
      channelApi.list(activeWorkspace!.id).then(({ data }) => {
        setChannels(data);
      });
    }

    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [activeWorkspace?.id]);

  // Load unread counts
  useEffect(() => {
    if (!channels.length) return;
    async function fetchUnread() {
      await Promise.all(
        channels.map(async (ch) => {
          try {
            const res = await authFetch(`/channels/${ch.id}/unread`);
            const data = await res.json();
            setUnreadCount(ch.id, data.unread ?? 0);
          } catch {}
        }),
      );
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [channels]);

  async function navigate(channelId: string) {
    const ch = channels.find((c) => c.id === channelId);
    if (!ch || !activeWorkspace) return;
    setActiveChannel(ch);
    clearUnread(channelId);
    try {
      await authFetch(`/channels/${channelId}/read`, { method: "POST" });
    } catch {}
    router.push(`/${activeWorkspace.slug}/${channelId}`);
  }

  async function handleJoin(ch: Channel) {
    setJoiningId(ch.id);
    try {
      await channelApi.join(ch.id);
      // Refresh channel list to reflect membership
      if (activeWorkspace) {
        const { data } = await channelApi.list(activeWorkspace.id);
        setChannels(data);
      }
      navigate(ch.id);
    } catch (err: any) {
      // Already a member — just navigate
      navigate(ch.id);
    } finally {
      setJoiningId(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !activeWorkspace) return;
    setError("");
    setCreating(true);
    try {
      const ch = await channelApi.create(
        activeWorkspace.id,
        newName.trim(),
        newTopic.trim() || undefined,
      );
      // Refresh full list so all users see it
      const { data } = await channelApi.list(activeWorkspace.id);
      setChannels(data);
      setShowModal(false);
      setNewName("");
      setNewTopic("");
      router.push(`/${activeWorkspace.slug}/${ch.id}`);
    } catch (err: any) {
      setError(err.message ?? "Could not create channel");
    } finally {
      setCreating(false);
    }
  }

  // Split into joined and unjoined
  // The API returns channels the user can see (public + their private ones)
  // We determine "joined" by checking channel_members via unread endpoint success
  // Simpler: track which ones we can navigate to vs need to join
  // Since the API already filters, all returned channels are visible
  // We need a separate "all public channels" endpoint — workaround: show join button
  // for channels where we haven't loaded messages yet (first visit)
  const publicChannels = channels.filter((c) => !c.is_dm && !c.is_private);
  const privateChannels = channels.filter((c) => !c.is_dm && c.is_private);

  return (
    <>
      <div className="px-2">
        {/* Header */}
        <div className="mb-1 flex items-center justify-between px-2 py-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Channels
          </span>
          <button
            onClick={() => setShowModal(true)}
            title="Create channel"
            className="flex h-5 w-5 items-center justify-center rounded text-[var(--text-muted)]
                       hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        {/* Public channels */}
        {publicChannels.map((channel) => {
          const isActive = channel.id === activeChannelId;
          const unread = unreadCounts[channel.id] ?? 0;

          return (
            <div key={channel.id} className="group flex items-center gap-1">
              <button
                onClick={() => navigate(channel.id)}
                className={`flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left
                            text-sm transition-colors
                            ${
                              isActive
                                ? "bg-[var(--bg-active)] text-[var(--text-primary)]"
                                : unread > 0
                                  ? "text-[var(--text-primary)] font-medium hover:bg-[var(--bg-hover)]"
                                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                            }`}
              >
                <span
                  className={
                    unread > 0 && !isActive
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-muted)]"
                  }
                >
                  #
                </span>
                <span className="flex-1 truncate">{channel.name}</span>
                {unread > 0 && !isActive && (
                  <span
                    className="flex h-4 min-w-4 items-center justify-center rounded-full
                                   bg-[var(--accent)] px-1 text-[10px] font-semibold text-white"
                  >
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </button>

              {/* Join button for channels user hasn't visited */}
              <button
                onClick={() => handleJoin(channel)}
                disabled={joiningId === channel.id}
                title="Join channel"
                className="hidden group-hover:flex h-5 w-5 items-center justify-center
                           rounded text-[var(--text-muted)] hover:text-[var(--accent)]
                           transition-colors flex-shrink-0"
              >
                {joiningId === channel.id ? (
                  <div className="h-3 w-3 animate-spin rounded-full border border-[var(--accent)] border-t-transparent" />
                ) : (
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                )}
              </button>
            </div>
          );
        })}

        {/* Private channels */}
        {privateChannels.length > 0 && (
          <>
            <div className="mb-1 mt-3 flex items-center px-2 py-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Private
              </span>
            </div>
            {privateChannels.map((channel) => {
              const isActive = channel.id === activeChannelId;
              const unread = unreadCounts[channel.id] ?? 0;
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
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-[var(--text-muted)] flex-shrink-0"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span className="flex-1 truncate">{channel.name}</span>
                  {unread > 0 && !isActive && (
                    <span
                      className="flex h-4 min-w-4 items-center justify-center rounded-full
                                     bg-[var(--accent)] px-1 text-[10px] font-semibold text-white"
                    >
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* Create channel modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setShowModal(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm mx-4 rounded-xl border border-[var(--border)]
                       bg-[var(--bg-secondary)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">
              Create a channel
            </h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Channel name
                </label>
                <div
                  className="flex items-center rounded-lg border border-[var(--border)]
                                bg-[var(--bg-tertiary)] px-3 py-2.5
                                focus-within:border-[var(--accent)] focus-within:ring-2
                                focus-within:ring-[var(--accent-dim)] transition-all"
                >
                  <span className="mr-1 text-sm text-[var(--text-muted)]">
                    #
                  </span>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) =>
                      setNewName(
                        e.target.value.toLowerCase().replace(/\s+/g, "-"),
                      )
                    }
                    placeholder="new-channel"
                    required
                    autoFocus
                    className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none
                               placeholder:text-[var(--text-muted)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Topic{" "}
                  <span className="text-[var(--text-muted)]">(optional)</span>
                </label>
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="What's this channel about?"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)]
                             px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none
                             placeholder:text-[var(--text-muted)]
                             focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-dim)]
                             transition-all"
                />
              </div>

              {error && (
                <p
                  className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2
                              text-xs text-red-400"
                >
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2
                             text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]
                             transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="flex-1 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm
                             font-medium text-white hover:bg-[var(--accent-hover)]
                             disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
