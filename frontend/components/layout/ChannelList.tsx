"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useWorkspaceStore } from "../../lib/store/workspaceStore";
import { channelApi } from "../../lib/api/workspace";

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
      addChannel(ch);
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

  return (
    <>
      <div className="px-2">
        {/* Header with + button */}
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

        {/* Channel rows */}
        {channels
          .filter((c) => !c.is_dm)
          .map((channel) => {
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
            );
          })}
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
