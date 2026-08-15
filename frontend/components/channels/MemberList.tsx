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

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

function authFetch(path: string) {
  const token = localStorage.getItem("access_token");
  return fetch(API_BASE + path, {
    headers: { Authorization: "Bearer " + token },
  });
}

export default function MemberList() {
  const { activeWorkspace, onlineUsers } = useWorkspaceStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!activeWorkspace) return;
    authFetch("/workspaces/" + activeWorkspace.id + "/members")
      .then((r) => r.json())
      .then((res) => setMembers(res.data ?? []));
  }, [activeWorkspace?.id]);

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

  function copyInviteLink() {
    if (!activeWorkspace) return;
    const link = window.location.origin + "/join/" + activeWorkspace.id;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const online = members.filter((m) => onlineUsers.includes(m.user_id));
  const offline = members.filter((m) => !onlineUsers.includes(m.user_id));

  const colors = [
    "bg-indigo-500",
    "bg-violet-500",
    "bg-blue-500",
    "bg-teal-500",
    "bg-emerald-500",
    "bg-orange-500",
  ];

  function Avatar({ name }: { name: string }) {
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    const color = colors[name.charCodeAt(0) % colors.length];
    return (
      <div
        className={
          "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full " +
          color +
          " text-xs font-semibold text-white"
        }
      >
        {initials}
      </div>
    );
  }

  function MemberRow({ member }: { member: Member }) {
    return (
      <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-[var(--bg-hover)] transition-colors">
        <div className="relative flex-shrink-0">
          <Avatar name={member.display_name} />
          <div className="absolute -bottom-0.5 -right-0.5">
            <OnlineDot online={onlineUsers.includes(member.user_id)} />
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
    <div className="flex h-full w-56 flex-shrink-0 flex-col border-l border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Members -- {members.length}
        </p>
        <button
          onClick={copyInviteLink}
          title={copied ? "Copied!" : "Copy invite link"}
          className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
        >
          {copied ? (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-[var(--online)]"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          )}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {online.length > 0 && (
          <>
            <p className="mb-1 px-2 text-[11px] font-medium text-[var(--text-muted)]">
              Online -- {online.length}
            </p>
            {online.map((m) => (
              <MemberRow key={m.user_id} member={m} />
            ))}
          </>
        )}
        {offline.length > 0 && (
          <>
            <p className="mb-1 mt-3 px-2 text-[11px] font-medium text-[var(--text-muted)]">
              Offline -- {offline.length}
            </p>
            {offline.map((m) => (
              <MemberRow key={m.user_id} member={m} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
