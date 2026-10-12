"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { X } from "lucide-react";
import { memo } from "react";
import type { MicroStatus } from "@/lib/types";
import { cn } from "../ui";

export type FluxoNodeMark = "from" | "dest" | "draft" | "reunir";

export type FluxoNodeData = {
  nome: string;
  setorLabel?: string;
  terceirizado?: boolean;
  terceirizadoNome?: string;
  servicoNome?: string;
  status?: MicroStatus;
  atual?: boolean;
  ramoFilha?: boolean;
  selected?: boolean;
  mark?: FluxoNodeMark;
  deletable?: boolean;
  onDelete?: (nodeId: string) => void;
};

export type FluxoFlowNode = Node<FluxoNodeData, "fluxo">;

function FluxoNodeInner({ id, data, selected }: NodeProps<FluxoFlowNode>) {
  const status = data.status;
  const markLabel =
    data.mark === "from"
      ? "filha começa"
      : data.mark === "dest"
        ? "caminho"
        : data.mark === "reunir"
          ? "destino final"
          : data.mark === "draft"
            ? "novo"
            : null;
  return (
    <div
      className={cn(
        "relative min-w-[148px] max-w-[180px] rounded-lg border px-3 py-2.5 shadow-sm transition-shadow",
        data.terceirizado ? "border-sky/30 bg-sky/8" : "border-line bg-card",
        status === "concluida" && "opacity-55",
        status === "em_andamento" && "border-mint/50 bg-mint/10 ring-1 ring-mint/25",
        data.atual && "ring-2 ring-amber/40",
        data.ramoFilha && "border-amber/40",
        data.mark === "from" && "border-amber/55 bg-amber/12 ring-2 ring-amber/35",
        data.mark === "dest" && "border-sky/55 bg-sky/12 ring-2 ring-sky/30",
        data.mark === "reunir" && "border-mint/55 bg-mint/12 ring-2 ring-mint/35",
        data.mark === "draft" && "border-dashed border-sky/50 bg-sky/8 ring-2 ring-sky/25",
        selected && !data.mark && "ring-2 ring-ink/20",
      )}
    >
      {data.deletable && data.onDelete ? (
        <button
          type="button"
          title="Remover card"
          aria-label="Remover card"
          className="nodrag nopan absolute -right-2 -top-2 z-10 grid h-5 w-5 place-items-center rounded-full border border-line bg-card text-faint shadow-sm transition hover:border-rose/40 hover:bg-rose/10 hover:text-rose"
          onClick={(e) => {
            e.stopPropagation();
            data.onDelete?.(id);
          }}
        >
          <X size={10} strokeWidth={2.5} />
        </button>
      ) : null}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-card !bg-mute"
      />
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-faint">
        {markLabel ?? (data.terceirizado ? "Terceirizado" : "Setor")}
        {data.atual && !data.mark ? " · atual" : ""}
      </p>
      <p className="mt-0.5 text-[13px] font-medium leading-snug text-ink">{data.nome}</p>
      {data.terceirizadoNome ? (
        <p className="mt-1 truncate text-[11px] text-sky">{data.terceirizadoNome}</p>
      ) : null}
      {data.servicoNome ? (
        <p className="truncate text-[11px] text-mute">{data.servicoNome}</p>
      ) : null}
      {data.setorLabel ? (
        <p className="mt-1 truncate text-[11px] text-mute">Quadro: {data.setorLabel}</p>
      ) : null}
      {status && !data.mark ? (
        <p className="mt-1 text-[10px] uppercase tracking-wider text-faint">{status.replace("_", " ")}</p>
      ) : null}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-card !bg-mint"
      />
    </div>
  );
}

export const FluxoNode = memo(FluxoNodeInner);
