"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../lib/store/authStore";
import { workspaceApi } from "../lib/api/workspace";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, setAuth } = useAuthStore();

  useEffect(() => {
    // Rehydrate auth from localStorage on page load
    const token = localStorage.getItem("access_token");
    const refresh = localStorage.getItem("refresh_token");

    if (!token || !refresh) {
      router.replace("/login");
      return;
    }

    // Fetch workspaces to confirm token is valid + get first workspace
    workspaceApi
      .list()
      .then(({ data }) => {
        if (data.length === 0) {
          router.replace("/create-workspace");
        } else {
          router.replace(`/${data[0].slug}`);
        }
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex items-center gap-3 text-[var(--text-secondary)]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
        <span className="text-sm">Loading...</span>
      </div>
    </div>
  );
}
