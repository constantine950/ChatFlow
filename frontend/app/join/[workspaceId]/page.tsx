"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export default function JoinPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params?.workspaceId as string;
  const [status, setStatus] = useState<"joining" | "success" | "error">(
    "joining",
  );
  const [message, setMessage] = useState("Joining workspace...");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login?redirect=/join/" + workspaceId);
      return;
    }

    fetch(API_BASE + "/workspaces/" + workspaceId + "/members", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    })
      .then(async (res) => {
        if (res.ok || res.status === 409) {
          // 409 = already a member, that's fine
          // Get workspace slug to redirect
          const wsRes = await fetch(API_BASE + "/workspaces/" + workspaceId, {
            headers: { Authorization: "Bearer " + token },
          });
          const ws = await wsRes.json();
          setStatus("success");
          setMessage("Joined! Redirecting...");
          setTimeout(() => router.push("/" + ws.slug), 800);
        } else {
          setStatus("error");
          setMessage("Could not join workspace. The link may be invalid.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      });
  }, [workspaceId]);

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--bg-primary)]">
      <div className="text-center">
        <div
          className={
            "inline-flex h-12 w-12 items-center justify-center rounded-full mb-4 " +
            (status === "error" ? "bg-red-500/10" : "bg-[var(--accent-dim)]")
          }
        >
          {status === "joining" && (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent-dim)] border-t-[var(--accent)]" />
          )}
          {status === "success" && (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-[var(--online)]"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {status === "error" && (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-red-400"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
        </div>
        <p className="text-sm text-[var(--text-secondary)]">{message}</p>
        {status === "error" && (
          <button
            onClick={() => router.push("/")}
            className="mt-4 text-sm text-[var(--accent)] hover:underline"
          >
            Go home
          </button>
        )}
      </div>
    </div>
  );
}
