"use client";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useWorkspaceStore } from "@/lib/store/workspaceStore";

export default function WorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const { channels, activeWorkspace } = useWorkspaceStore();

  // Redirect to first channel automatically
  useEffect(() => {
    if (channels.length > 0 && activeWorkspace) {
      router.replace(`/${activeWorkspace.slug}/${channels[0].id}`);
    }
  }, [channels, activeWorkspace]);

  return (
    <div className="flex h-full items-center justify-center text-[var(--text-muted)] text-sm">
      <div className="flex items-center gap-3">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
        Loading channels...
      </div>
    </div>
  );
}
