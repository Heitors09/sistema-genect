"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "../ui";

function ChatBubble({ ready }: { ready: boolean }) {
  return (
    <div className="motion-rise-in w-full rounded-md border border-line bg-card px-3.5 py-3 text-[13px] text-ink">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-faint">Assistente</p>
      {ready ? (
        <p className="mt-1.5 leading-relaxed">Olá, em que posso ajudar? 😊</p>
      ) : (
        <div className="mt-2.5 flex h-5 items-center gap-1">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      )}
    </div>
  );
}

function DockBar({
  open,
  draft,
  onDraft,
  onToggle,
  onFocus,
  compact,
}: {
  open: boolean;
  draft: string;
  onDraft: (value: string) => void;
  onToggle: () => void;
  onFocus: () => void;
  compact?: boolean;
}) {
  return (
    <div className="flex w-full items-center gap-2">
      <div
        className={cn(
          "glass-dock flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5",
          compact ? "h-12" : "h-11",
        )}
      >
        <button
          type="button"
          aria-label="Abrir assistente"
          aria-expanded={open}
          onClick={onToggle}
          className={cn(
            "motion-press grid shrink-0 place-items-center rounded-md text-mute hover:bg-elevated hover:text-ink",
            compact ? "h-9 w-9" : "h-8 w-8",
            open && "bg-elevated text-ink",
          )}
        >
          <Sparkles size={compact ? 18 : 16} strokeWidth={1.75} />
        </button>
        <input
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          onFocus={onFocus}
          placeholder="Pergunte algo..."
          aria-label="Mensagem para o assistente"
          className={cn(
            "min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-faint",
            compact ? "h-9 text-[15px]" : "h-8 text-[13px]",
          )}
        />
      </div>
    </div>
  );
}

export function DemoAssistant() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!open) {
      setReady(false);
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setReady(true), reduce ? 0 : 1400);
    return () => window.clearTimeout(timer);
  }, [open]);

  function openChat() {
    setOpen(true);
  }

  function toggleChat() {
    setOpen((atual) => !atual);
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden justify-center px-3 pb-5 md:flex">
        <div className="pointer-events-auto flex w-[min(26rem,calc(100%-0.5rem))] flex-col items-center gap-3">
          {open ? <ChatBubble ready={ready} /> : null}
          <DockBar
            open={open}
            draft={draft}
            onDraft={setDraft}
            onToggle={toggleChat}
            onFocus={openChat}
          />
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 z-20 md:hidden" style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom))" }}>
        <div className="pointer-events-auto border-t border-line bg-sidebar/95 px-3 py-2 backdrop-blur">
          <div className="mx-auto flex w-full max-w-lg flex-col gap-2">
            {open ? <ChatBubble ready={ready} /> : null}
            <DockBar
              compact
              open={open}
              draft={draft}
              onDraft={setDraft}
              onToggle={toggleChat}
              onFocus={openChat}
            />
          </div>
        </div>
      </div>
    </>
  );
}
