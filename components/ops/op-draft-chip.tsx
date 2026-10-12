"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FilePenLine, X } from "lucide-react";
import {
  OP_NOVA_DRAFT_EVENT,
  clearOpNovaDraft,
  opNovaDraftActive,
  readOpNovaDraft,
} from "@/lib/op-form-draft";
import { cn } from "../ui";

function draftLabel(): string | null {
  const draft = readOpNovaDraft();
  if (!opNovaDraftActive(draft)) return null;
  const n = draft?.numero?.trim();
  return n ? `Rascunho ${n}` : "Rascunho da OP";
}

export function OpDraftChip() {
  const pathname = usePathname();
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    function sync() {
      setLabel(draftLabel());
    }
    sync();
    window.addEventListener(OP_NOVA_DRAFT_EVENT, sync);
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener(OP_NOVA_DRAFT_EVENT, sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  if (!label || pathname.startsWith("/ops/nova")) return null;

  return (
    <div
      className={cn(
        "flex h-8 max-w-[11.5rem] items-stretch overflow-hidden rounded-md border border-line",
        "bg-elevated/50 text-mute shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)]",
      )}
      style={{ animation: "soft-in 220ms cubic-bezier(0.22, 1, 0.36, 1)" }}
    >
      <Link
        href="/ops/nova"
        title="Voltar ao rascunho da OP"
        className="motion-press flex min-w-0 flex-1 items-center gap-1.5 px-2 text-[11px] hover:bg-elevated/80 hover:text-ink"
      >
        <FilePenLine size={12} strokeWidth={1.75} className="shrink-0 text-sky/80" />
        <span className="truncate tracking-[-0.01em]">{label}</span>
      </Link>
      <button
        type="button"
        aria-label="Apagar rascunho da OP"
        title="Apagar rascunho"
        className="motion-press grid w-7 shrink-0 place-items-center border-l border-line text-faint hover:bg-elevated hover:text-rose"
        onClick={() => {
          clearOpNovaDraft();
          setLabel(null);
        }}
      >
        <X size={11} strokeWidth={2} />
      </button>
    </div>
  );
}
