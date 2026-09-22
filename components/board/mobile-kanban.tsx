"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeftRight, ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { nInt, stageKindLabel, uid } from "@/lib/format";
import { atadosInStage, isSplitOp, opsInStage, pecasInStage } from "@/lib/op-flow";
import type { BoardNode, OrdemProducao, StageKind } from "@/lib/types";
import { newStage, useLookups, useStore } from "@/lib/store/store";
import { Button, cn } from "../ui";

const kinds: StageKind[] = [
  "recebimento",
  "corte",
  "costura",
  "faccao",
  "acabamento",
  "revisao",
  "embalagem",
  "expedicao",
  "custom",
];

function orderStages(nodes: BoardNode[], edges: { source: string; target: string }[]) {
  const incoming = new Map(nodes.map((n) => [n.id, 0]));
  const outgoing = new Map<string, string[]>();
  for (const e of edges) {
    incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1);
    outgoing.set(e.source, [...(outgoing.get(e.source) ?? []), e.target]);
  }
  const starts = nodes
    .filter((n) => (incoming.get(n.id) ?? 0) === 0)
    .sort((a, b) => a.x - b.x || a.y - b.y);
  const seen = new Set<string>();
  const out: BoardNode[] = [];
  const queue = [...starts];
  while (queue.length) {
    const node = queue.shift();
    if (!node || seen.has(node.id)) continue;
    seen.add(node.id);
    out.push(node);
    for (const id of outgoing.get(node.id) ?? []) {
      const next = nodes.find((n) => n.id === id);
      if (next && !seen.has(next.id)) queue.push(next);
    }
  }
  return [...out, ...nodes.filter((n) => !seen.has(n.id))];
}

function visibleOps(ops: OrdemProducao[], stageId: string, isAdmin: boolean, terceirizadoId?: string) {
  return opsInStage(ops, stageId).filter((o) => {
    if (!isAdmin && terceirizadoId) return o.terceirizadoIds.includes(terceirizadoId);
    return true;
  });
}

export function MobileKanban() {
  const { state, dispatch, isAdmin, currentUser } = useStore();
  const { produto } = useLookups();
  const [selected, setSelected] = useState<{ opId: string; fromStageId: string } | null>(null);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<StageKind>("custom");
  const [composer, setComposer] = useState(false);

  const stages = useMemo(
    () => orderStages(state.boardNodes, state.boardEdges),
    [state.boardNodes, state.boardEdges],
  );

  function moveSelected(stageId: string) {
    if (!selected) return;
    dispatch({ type: "MOVE_OP", opId: selected.opId, stageId, fromStageId: selected.fromStageId });
    setSelected(null);
  }

  function swap(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= stages.length) return;
    const a = stages[i];
    const b = stages[j];
    dispatch({
      type: "SET_BOARD",
      nodes: state.boardNodes.map((n) => {
        if (n.id === a.id) return { ...n, x: b.x, y: b.y };
        if (n.id === b.id) return { ...n, x: a.x, y: a.y };
        return n;
      }),
      edges: state.boardEdges,
    });
  }

  function linkTo(source: string, target: string) {
    if (!target || source === target) return;
    if (state.boardEdges.some((e) => e.source === source && e.target === target)) return;
    dispatch({
      type: "SET_BOARD",
      nodes: state.boardNodes,
      edges: [...state.boardEdges, { id: uid("e"), source, target }],
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {selected ? (
        <div className="surface flex items-center gap-2 rounded-md px-3 py-2 text-[12px]">
          <ArrowLeftRight size={14} className="shrink-0 text-ink" />
          <span className="min-w-0 flex-1 truncate">
            Toque numa etapa para mover os atados de {state.ops.find((o) => o.id === selected.opId)?.numero} que estão em{" "}
            {state.boardNodes.find((n) => n.id === selected.fromStageId)?.label}
          </span>
          <button type="button" className="text-mute" onClick={() => setSelected(null)}>
            Cancelar
          </button>
        </div>
      ) : (
        <p className="px-1 text-[11px] text-faint">
          Deslize as etapas. Use Mover e depois toque na coluna de destino.
        </p>
      )}

      <div
        className="flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch]"
        style={{ touchAction: "pan-x" }}
      >
        {stages.map((stage, index) => {
          const ops = visibleOps(state.ops, stage.id, isAdmin, currentUser.terceirizadoId);
          const pecas = ops.reduce((a, o) => a + pecasInStage(o, stage.id), 0);
          const links = state.boardEdges.filter((e) => e.source === stage.id);
          return (
            <section
              key={stage.id}
              className={cn(
                "surface flex w-[78vw] max-w-[340px] shrink-0 snap-center flex-col overflow-hidden rounded-md",
                selected && "shadow-[0_0_0_1px_rgb(255_255_255_/_0.12)]",
              )}
            >
              <button
                type="button"
                onClick={() => selected && moveSelected(stage.id)}
                className="flex items-center gap-2 border-b border-line px-3 py-2.5 text-left"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: stage.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold tracking-[-0.02em]">{stage.label}</p>
                  <p className="mt-0.5 text-[10px] text-faint">
                    {ops.length} OP · {nInt.format(pecas)} pç
                  </p>
                </div>
                {isAdmin ? (
                  <span className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded-md text-mute"
                      onClick={() => swap(index, -1)}
                      aria-label="Mover etapa à esquerda"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded-md text-mute"
                      onClick={() => swap(index, 1)}
                      aria-label="Mover etapa à direita"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded-md text-faint"
                      onClick={() => dispatch({ type: "REMOVE_STAGE", id: stage.id })}
                      aria-label="Remover etapa"
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                ) : null}
              </button>

              {isAdmin ? (
                <div className="flex flex-wrap items-center gap-1 border-b border-line px-3 py-2">
                  {links.length === 0 ? <span className="text-[10px] text-faint">Sem ligação</span> : null}
                  {links.map((e) => {
                    const t = state.boardNodes.find((n) => n.id === e.target);
                    return (
                      <span
                        key={e.id}
                        className="inline-flex items-center gap-1 rounded-md bg-elevated px-1.5 py-0.5 text-[10px] text-mute"
                      >
                        → {t?.label}
                        <button
                          type="button"
                          className="grid h-4 w-4 place-items-center rounded-md text-faint hover:bg-panel hover:text-rose"
                          aria-label={`Desligar ${t?.label ?? "etapa"}`}
                          onClick={() => dispatch({ type: "REMOVE_EDGE", id: e.id })}
                        >
                          <X size={10} />
                        </button>
                      </span>
                    );
                  })}
                  <select
                    className="well ml-auto h-8 max-w-[42%] rounded-md border border-line px-1 text-[11px]"
                    defaultValue=""
                    onChange={(ev) => {
                      linkTo(stage.id, ev.target.value);
                      ev.target.value = "";
                    }}
                    aria-label={`Ligar ${stage.label}`}
                  >
                    <option value="">Ligar a…</option>
                    {stages
                      .filter((n) => n.id !== stage.id)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.label}
                        </option>
                      ))}
                  </select>
                </div>
              ) : null}

              <div
                className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2"
                style={{ touchAction: "pan-y" }}
                onClick={() => selected && moveSelected(stage.id)}
              >
                {ops.length === 0 ? (
                  <p className="px-1 py-6 text-center text-[12px] text-faint">Nenhuma OP nesta etapa</p>
                ) : (
                  ops.map((op) => {
                    const prod = produto(op.produtoId);
                    const pct = Math.min(100, Math.round((op.quantidadeProduzida / Math.max(op.quantidade, 1)) * 100));
                    return (
                      <div
                        key={op.id}
                        className={cn(
                          "rounded-md border bg-panel/80 p-2.5 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)]",
                          isSplitOp(op) ? "border-amber/35 border-l-2 border-l-amber" : "border-line",
                          selected?.opId === op.id && selected.fromStageId === stage.id && "border-line-strong",
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-start gap-2">
                          <Link href={`/ops/${op.id}`} className="min-w-0 flex-1">
                            <p className="font-mono text-[12px]">
                              {op.numero}
                              {isSplitOp(op) ? (
                                <span className="ml-1 text-[9px] uppercase text-amber">parcial</span>
                              ) : null}
                            </p>
                            <p className="truncate text-[11px] text-mute">{prod?.nome}</p>
                            {isSplitOp(op) ? (
                              <p className="truncate text-[10px] text-amber">
                                também em{" "}
                                {[
                                  ...new Set(
                                    op.atados
                                      .filter((a) => a.status !== "concluido" && a.stageId !== stage.id)
                                      .map((a) => a.stageId),
                                  ),
                                ]
                                  .map((id) => state.boardNodes.find((n) => n.id === id)?.label)
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            ) : null}
                          </Link>
                          {isAdmin ? (
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                className={cn(
                                  "h-9 rounded-md px-3 text-[11px] font-medium",
                                  selected?.opId === op.id && selected.fromStageId === stage.id
                                    ? "bg-[#f3f4f6] text-[#0c0d10]"
                                    : "border border-line bg-elevated text-mute",
                                )}
                                onClick={() =>
                                  setSelected((cur) =>
                                    cur?.opId === op.id && cur.fromStageId === stage.id
                                      ? null
                                      : { opId: op.id, fromStageId: stage.id },
                                  )
                                }
                              >
                                Mover
                              </button>
                              <button
                                type="button"
                                className="grid h-9 w-9 place-items-center rounded-md text-faint hover:bg-elevated hover:text-rose"
                                aria-label={`Excluir ${op.numero}`}
                                onClick={() => {
                                  if (selected?.opId === op.id) setSelected(null);
                                  dispatch({ type: "DELETE_OP", opId: op.id });
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-elevated">
                          <div className="h-full bg-mint/80" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1 text-[10px] tabular-nums text-faint">
                          {atadosInStage(op, stage.id).length
                            ? `${atadosInStage(op, stage.id).length} atado${atadosInStage(op, stage.id).length > 1 ? "s" : ""} · ${nInt.format(pecasInStage(op, stage.id))} pç nesta etapa`
                            : `${nInt.format(op.quantidadeProduzida)}/${nInt.format(op.quantidade)} pç`}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}

        {isAdmin ? (
          <section className="flex w-[78vw] max-w-[340px] shrink-0 snap-center flex-col justify-center gap-2 rounded-md border border-dashed border-line bg-card/30 p-4">
            {composer ? (
              <>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Nome da coluna"
                  className="well h-11 rounded-md border border-line px-3 text-base"
                />
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as StageKind)}
                  className="well h-11 rounded-md border border-line px-3 text-base"
                >
                  {kinds.map((k) => (
                    <option key={k} value={k}>
                      {stageKindLabel[k]}
                    </option>
                  ))}
                </select>
                <Button
                  className="h-11"
                  onClick={() => {
                    const x = Math.max(0, ...state.boardNodes.map((n) => n.x)) + 280;
                    dispatch({
                      type: "ADD_STAGE",
                      node: newStage(kind, label || stageKindLabel[kind], x, 80),
                    });
                    setLabel("");
                    setComposer(false);
                  }}
                >
                  Criar coluna
                </Button>
                <Button variant="ghost" className="h-11" onClick={() => setComposer(false)}>
                  Fechar
                </Button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setComposer(true)}
                className="flex h-24 flex-col items-center justify-center gap-1 text-mute"
              >
                <Plus size={20} />
                <span className="text-[13px]">Nova etapa</span>
              </button>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
