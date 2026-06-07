"use client";

interface Props {
  className?: string;
}

// Base skeleton pulse block
export function Skeleton({ className = "" }: Props) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[var(--bg-hover)] ${className}`}
    />
  );
}

// Message skeleton — mimics a single message row
export function MessageSkeleton({ grouped = false }: { grouped?: boolean }) {
  if (grouped) {
    return (
      <div className="flex items-start gap-3 px-6 py-0.5">
        <div className="w-9 flex-shrink-0" />
        <div className="flex-1 space-y-1.5 py-0.5">
          <Skeleton className="h-3.5 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 px-6 py-1.5">
      {/* Avatar */}
      <Skeleton className="h-9 w-9 flex-shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2 py-0.5">
        {/* Name + timestamp */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-12" />
        </div>
        {/* Content lines */}
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
    </div>
  );
}

// Sidebar channel skeleton
export function ChannelSkeleton() {
  return (
    <div className="flex items-center gap-2 px-4 py-1.5">
      <Skeleton className="h-3 w-3 rounded" />
      <Skeleton className="h-3.5 w-28" />
    </div>
  );
}

// Member list skeleton
export function MemberSkeleton() {
  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5">
      <Skeleton className="h-7 w-7 flex-shrink-0 rounded-full" />
      <Skeleton className="h-3.5 w-24" />
    </div>
  );
}

// Full message list skeleton — shown on channel open
export function MessageListSkeleton() {
  return (
    <div className="flex flex-1 flex-col py-2">
      <MessageSkeleton />
      <MessageSkeleton grouped />
      <MessageSkeleton grouped />
      <MessageSkeleton />
      <MessageSkeleton grouped />
      <MessageSkeleton />
      <MessageSkeleton />
      <MessageSkeleton grouped />
      <MessageSkeleton grouped />
      <MessageSkeleton />
    </div>
  );
}
