// lib/utils/time.ts
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";

export function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return formatDistanceToNow(date, { addSuffix: true });
  if (isYesterday(date)) return `Yesterday at ${format(date, "h:mm a")}`;
  return format(date, "MMM d, yyyy");
}

export function messageTime(dateStr: string): string {
  return format(new Date(dateStr), "h:mm a");
}

export function dayDivider(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMMM d");
}

export function isSameDay(a: string, b: string): boolean {
  return (
    format(new Date(a), "yyyy-MM-dd") === format(new Date(b), "yyyy-MM-dd")
  );
}

export function isSameAuthorWithinMinutes(
  a: { user_id: string; created_at: string },
  b: { user_id: string; created_at: string },
  minutes = 5,
): boolean {
  if (a.user_id !== b.user_id) return false;
  const diff = Math.abs(
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  return diff < minutes * 60 * 1000;
}
