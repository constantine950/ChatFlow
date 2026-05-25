"use client";

interface Props {
  online: boolean;
  size?: "sm" | "md";
}

export default function OnlineDot({ online, size = "sm" }: Props) {
  const dim = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";
  return (
    <span
      className={`${dim} rounded-full flex-shrink-0 ${
        online
          ? "bg-[var(--online)] shadow-[0_0_0_1.5px_var(--bg-secondary)]"
          : "bg-[var(--text-muted)] shadow-[0_0_0_1.5px_var(--bg-secondary)]"
      }`}
    />
  );
}
