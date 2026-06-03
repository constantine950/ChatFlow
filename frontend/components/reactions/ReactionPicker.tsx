"use client";

const EMOJIS = [
  "👍",
  "👎",
  "❤️",
  "🔥",
  "🎉",
  "😂",
  "😮",
  "😢",
  "🤔",
  "👀",
  "✅",
  "🚀",
];

interface Props {
  onPick: (emoji: string) => void;
}

export default function ReactionPicker({ onPick }: Props) {
  return (
    <div
      className="flex flex-wrap gap-1 rounded-lg border border-[var(--border)]
                    bg-[var(--bg-secondary)] p-2 shadow-xl w-48"
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onPick(emoji)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-base
                     hover:bg-[var(--bg-hover)] transition-colors"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
