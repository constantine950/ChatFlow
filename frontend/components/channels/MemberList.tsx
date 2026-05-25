"use client";
import { useEffect, useState } from "react";
import { useWorkspaceStore } from "../../lib/store/workspaceStore";
import { workspaceApi } from "../../lib/api/workspace";
import OnlineDot from "../presence/OnlineDot";

interface Member {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
}

export default function MemberList() {
  const { activeWorkspace, onlineUsers } = useWorkspaceStore();
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!activeWorkspace) return;
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${activeWorkspace.id}/members`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      },
    )
      .then((r) => r.json())
      .then((res) => setMembers(res.data ?? []));
  }, [activeWorkspace?.id]);

  // Refresh online users every 30s
  useEffect(() => {
    if (!activeWorkspace) return;
    const refresh = () =>
      workspaceApi
        .getPresence(activeWorkspace.id)
        .then(({ online }) =>
          useWorkspaceStore.getState().setOnlineUsers(online),
        );
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [activeWorkspace?.id]);

  const online = members.filter((m) => onlineUsers.includes(m.user_id));
  const offline = members.filter((m) => !onlineUsers.includes(m.user_id));

  function MemberRow({ member }: { member: Member }) {
    const initials = member.display_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    const isOnline = onlineUsers.includes(member.user_id);

    return (
      <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-[var(--bg-hover)] transition-colors">
        <div className="relative flex-shrink-0">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full
                          bg-[var(--bg-active)] text-xs font-medium text-[var(--text-primary)]"
          >
            {initials}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5">
            <OnlineDot online={isOnline} />
          </div>
        </div>
        <span className="truncate text-sm text-[var(--text-secondary)]">
          {member.display_name}
        </span>
        {member.role === "OWNER" && (
          <span className="ml-auto text-[10px] text-[var(--text-muted)]">
            owner
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex h-full w-56 flex-shrink-0 flex-col border-l border-[var(--border)]
                    bg-[var(--bg-secondary)] overflow-y-auto py-3 px-2"
    >
      <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        Members — {members.length}
      </p>

      {online.length > 0 && (
        <>
          <p className="mb-1 px-2 text-[11px] font-medium text-[var(--text-muted)]">
            Online — {online.length}
          </p>
          {online.map((m) => (
            <MemberRow key={m.user_id} member={m} />
          ))}
        </>
      )}

      {offline.length > 0 && (
        <>
          <p className="mb-1 mt-3 px-2 text-[11px] font-medium text-[var(--text-muted)]">
            Offline — {offline.length}
          </p>
          {offline.map((m) => (
            <MemberRow key={m.user_id} member={m} />
          ))}
        </>
      )}
    </div>
  );
}
