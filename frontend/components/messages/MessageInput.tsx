"use client";
import { useState, useRef, useEffect } from "react";

interface Props {
  channelId: string;
  channelName: string;
  onSend: (content: string) => void;
  onTyping: () => void;
}

export default function MessageInput({
  channelId,
  channelName,
  onSend,
  onTyping,
}: Props) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const isTyping = useRef(false);

  // Auto-resize textarea
  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    resize();

    // Typing indicator — debounced
    if (!isTyping.current) {
      isTyping.current = true;
      onTyping();
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTyping.current = false;
    }, 2000);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const content = value.trim();
    if (!content) return;
    onSend(content);
    setValue("");
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    isTyping.current = false;
    clearTimeout(typingTimer.current);
  }

  // Focus on channel change
  useEffect(() => {
    textareaRef.current?.focus();
    setValue("");
  }, [channelId]);

  return (
    <div className="px-4 pb-4">
      <div
        className={`flex items-end gap-3 rounded-xl border bg-[var(--bg-secondary)]
                    px-4 py-3 transition-colors
                    ${
                      isFocused
                        ? "border-[var(--accent)] ring-2 ring-[var(--accent-dim)]"
                        : "border-[var(--border)]"
                    }`}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={`Message #${channelName}`}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-[var(--text-primary)]
                     outline-none placeholder:text-[var(--text-muted)] leading-relaxed"
          style={{ maxHeight: "200px" }}
        />

        {/* Send button */}
        <button
          onClick={submit}
          disabled={!value.trim()}
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg
                      transition-all
                      ${
                        value.trim()
                          ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                          : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-not-allowed"
                      }`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      <p className="mt-1.5 px-1 text-[11px] text-[var(--text-muted)]">
        <kbd className="rounded bg-[var(--bg-tertiary)] px-1 py-0.5 text-[10px]">
          Enter
        </kbd>{" "}
        to send
        {" · "}
        <kbd className="rounded bg-[var(--bg-tertiary)] px-1 py-0.5 text-[10px]">
          Shift+Enter
        </kbd>{" "}
        for newline
      </p>
    </div>
  );
}
