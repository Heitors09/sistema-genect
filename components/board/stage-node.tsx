"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Trash2 } from "lucide-react";
import type { OrdemProducao, StageKind } from "@/lib/types";
import { nInt } from "@/lib/format";
import { atadosInStage, isSplitOp, opsInStage, pecasInStage } from "@/lib/op-flow";
import { useLookups, useStore } from "@/lib/store/store";
import { cn } from "../ui";

export type StageData = {
  label: string;
  color: string;
  kind: StageKind;
};

export type StageFlowNode = Node<StageData, "stage">;

function OpChip({
  op,
  stageId,
  canMove,
}: {
  op: OrdemProducao;
  stageId: string;
  canMove: boolean;
}) {
  const router = useRouter();
  const { dispatch } = useStore();
  const { produto, stage } = useLookups();
  const prod = produto(op.produtoId);
  const pct = Math.min(100, Math.round((op.quantidadeProduzida / Math.max(op.quantidade, 1)) * 100));
  const split = isSplitOp(op);
  const here = atadosInStage(op, stageId);
  const pecasAqui = pecasInStage(op, stageId);
  const others = [...new Set(op.atados.filter((a) => a.status !== "concluido" && a.stageId !== stageId).map((a) => a.stageId))]
    .map((id) => stage(id)?.label)
    .filter(Boolean);

  return (
    <div
      draggable={canMove}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/op-id", op.id);
        e.dataTransfer.setData("text/from-stage", stageId);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "nodrag nopan group relative rounded-md border bg-panel/80 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)] hover:border-line-strong",
        split ? "border-amber/35 border-l-2 border-l-amber" : "border-line",
      )}
    >
      <button
        type="button"
        onClick={() => router.push(`/ops/${op.id}`)}
        className="w-full px-2 py-1.5 pr-8 text-left"
      >
        <div className="flex items-center gap-1.5">
          {canMove ? <GripVertical size={11} className="text-faint" /> : null}
          <span className="font-mono text-[11px] text-ink">{op.numero}</span>
          {op.parentOpId ? <span className="text-[9px] text-violet">filha</span> : null}
          {split ? <span className="text-[9px] uppercase tracking-wide text-amber">parcial</span> : null}
          <span className="ml-auto text-[10px] tabular-nums text-mute">{pct}%</span>
        </div>
        <p className="truncate text-[11px] text-mute">{prod?.nome}</p>
        {others.length ? (
          <p className="mt-0.5 truncate text-[10px] text-amber">também em {others.join(" · ")}</p>
        ) : null}
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-elevated">
          <div className="h-full bg-mint/80" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-[10px] tabular-nums text-faint">
          {here.length
            ? `${here.length} atado${here.length > 1 ? "s" : ""} · ${nInt.format(pecasAqui)} pç nesta etapa`
            : `${nInt.format(op.quantidadeProduzida)}/${nInt.format(op.quantidade)} pç`}
        </p>
      </button>
      {canMove ? (
        <button
          type="button"
          className="nodrag nopan absolute right-1 top-1.5 grid h-6 w-6 place-items-center rounded-md text-faint hover:bg-elevated hover:text-rose"
          aria-label={`Excluir ${op.numero}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: "DELETE_OP", opId: op.id });
          }}
        >
          <Trash2 size={11} />
        </button>
      ) : null}
    </div>
  );
}

function StageNodeInner({ id, data, selected }: NodeProps<StageFlowNode>) {
  const { state, dispatch, isAdmin } = useStore();
  const ops = opsInStage(state.ops, id).filter((o) => isAdmin || matchesTerceiro(state, o));
  const pecas = ops.reduce((a, o) => a + pecasInStage(o, id), 0);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        e.preventDefault();
        const opId = e.dataTransfer.getData("text/op-id");
        const fromStageId = e.dataTransfer.getData("text/from-stage") || undefined;
        if (opId) dispatch({ type: "MOVE_OP", opId, stageId: id, fromStageId });
      }}
      className={cn(
        "surface w-[240px] rounded-md",
        selected && "shadow-[0_0_0_1px_rgb(255_255_255_/_0.14),0_18px_40px_rgb(0_0_0_/_0.45)]",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!-left-1.5"
        style={{ background: data.color }}
      />
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: data.color }} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight tracking-[-0.02em]">{data.label}</p>
          <p className="mt-0.5 text-[10px] text-faint">
            {ops.length} OP · {nInt.format(pecas)} pç
          </p>
        </div>
        {isAdmin ? (
          <button
            type="button"
            className="nodrag grid h-6 w-6 place-items-center rounded-md text-faint hover:bg-elevated hover:text-rose"
            onClick={() => dispatch({ type: "REMOVE_STAGE", id })}
            aria-label="Remover etapa"
          >
            <Trash2 size={12} />
          </button>
        ) : null}
      </div>
      <div className="flex max-h-[280px] flex-col gap-1.5 overflow-y-auto p-2">
        {ops.length === 0 ? (
          <p className="px-1 py-3 text-center text-[11px] text-faint">Solte uma OP aqui</p>
        ) : (
          ops.map((op) => <OpChip key={op.id} op={op} stageId={id} canMove={isAdmin} />)
        )}
      </div>
      <div className="flex justify-between px-3 pb-2 text-[9px] uppercase tracking-wide text-faint">
        <span>Entrada</span>
        <span>Saída</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!-right-1.5"
        style={{ background: data.color }}
      />
    </div>
  );
}

function matchesTerceiro(state: { usuarioId: string; usuarios: { id: string; terceirizadoId?: string }[] }, op: OrdemProducao) {
  const user = state.usuarios.find((u) => u.id === state.usuarioId);
  if (!user?.terceirizadoId) return true;
  return op.terceirizadoIds.includes(user.terceirizadoId);
}

export const StageNode = memo(StageNodeInner);
