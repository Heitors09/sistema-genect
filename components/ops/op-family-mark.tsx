"use client";

import type { OrdemProducao } from "@/lib/types";
import { opFamily } from "@/lib/op-flow";
import { cn } from "../ui";

export function OpFamilyMark({
  op,
  ops,
  className,
}: {
  op: OrdemProducao;
  ops: OrdemProducao[];
  className?: string;
}) {
  const family = opFamily(op, ops);
  if (!family) return null;
  return (
    <p
      title={`Mesmo produto · ${family.label}`}
      className={cn("mt-0.5 flex min-w-0 items-center gap-1 truncate text-[10px] font-medium text-violet", className)}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: family.color }} aria-hidden />
      {family.label}
    </p>
  );
}

export function familyCardClass(op: OrdemProducao, ops: OrdemProducao[]) {
  return opFamily(op, ops) ? "border-violet/40 border-l-2 border-l-violet" : "";
}
