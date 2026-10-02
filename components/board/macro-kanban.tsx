"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type DragEvent } from "react";
import {
  Check,
  ChevronDown,
  GripVertical,
  Pause,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { microStatusLabel, nInt, stageKindLabel } from "@/lib/format";
import { servicosDe } from "@/lib/migrate";
import { sortFamilyFirst } from "@/lib/op-flow";
import { opAtrasada } from "@/lib/prazos";
import type { MicroEtapa, MicroStatus, OrdemProducao, StageKind } from "@/lib/types";
import { newStage, useLookups, useStore } from "@/lib/store/store";
import { familyCardClass, OpFamilyMark } from "../ops/op-family-mark";
import { Button, cn } from "../ui";

export type PainelFiltro =
  | "todas"
  | "producao"
  | "urgente"
  | "prioridade"
  | "atrasada"
  | "aguardando"
  | "aberta";

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

function matchesFiltro(op: OrdemProducao, filtro: PainelFiltro) {
  if (op.status === "cancelada") return false;
  if (filtro === "todas") return op.status !== "finalizada";
  if (filtro === "producao") return op.status === "em_producao" || op.status === "revisao";
  if (filtro === "urgente") return op.urgente && op.status !== "finalizada";
  if (filtro === "prioridade") return op.prioridade && op.status !== "finalizada";
  if (filtro === "atrasada") return opAtrasada(op);
  if (filtro === "aguardando") {
    return op.micros.some((m) => m.status === "pendencia" || (m.terceirizadoId && m.status === "aguardando"));
  }
  return op.status === "aberta";
}

function statusTone(status: MicroStatus) {
  if (status === "concluida") return "text-mint";
  if (status === "pendencia") return "text-rose";
  if (status === "em_andamento") return "text-sky";
  if (status === "pausada") return "text-amber";
  return "text-faint";
}

function MicroBlock({
  opId,
  micros,
  canAct,
  onAct,
}: {
  opId: string;
  micros: MicroEtapa[];
  canAct: (micro: MicroEtapa) => boolean;
  onAct: (opId: string, microId: string, status: MicroStatus) => void;
}) {
  const { state } = useStore();
  return (
    <div className="space-y-1.5">
      {micros.map((micro) => {
        const t = state.terceirizados.find((x) => x.id === micro.terceirizadoId);
        const servico = t ? servicosDe(t).find((s) => s.id === micro.servicoId) : undefined;
        const actions: { status: MicroStatus; label: string; icon: typeof Play }[] = [];
        if (micro.status !== "em_andamento" && micro.status !== "concluida") {
          actions.push({ status: "em_andamento", label: "Iniciar", icon: Play });
        }
        if (micro.status === "em_andamento") {
          actions.push({ status: "pausada", label: "Pausar", icon: Pause });
        }
        if (micro.status !== "concluida") {
          actions.push({ status: "concluida", label: "Finalizar", icon: Check });
        }
        const done = micro.status === "concluida";
        return (
          <div
            key={micro.id}
            className={cn(
              "rounded-md border px-2.5 py-2",
              done ? "border-mint/25 bg-mint/5" : "border-line bg-card/80",
            )}
          >
            <div className="min-w-0 text-left">
              <p className="flex items-center gap-1.5 truncate text-[12px] font-medium leading-tight text-ink">
                {done ? <Check size={13} className="shrink-0 text-mint" /> : null}
                <span className="truncate">{micro.nome}</span>
              </p>
              <p className={cn("mt-0.5 text-[10px] font-medium leading-tight", statusTone(micro.status))}>
                {microStatusLabel[micro.status]}
                {micro.terceirizadoId ? " · Terceirizado" : " · Setor"}
              </p>
              {t ? (
                <p className="mt-1 truncate text-[10px] leading-tight text-faint">
                  {t.nome}
                  {servico ? ` · ${servico.nome}` : ""}
                </p>
              ) : null}
            </div>
            {canAct(micro) && actions.length ? (
              <div className={cn("mt-2 grid gap-1", actions.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                {actions.map((action) => (
                  <Button
                    key={action.status}
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 w-full justify-center px-2"
                    onClick={() => onAct(opId, micro.id, action.status)}
                  >
                    <action.icon size={12} />
                    {action.label}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function MacroKanban({
  filtro,
  terceirizadoId,
}: {
  filtro: PainelFiltro;
  terceirizadoId?: string;
}) {
  const { state, dispatch, isAdmin } = useStore();
  const { produto, cliente } = useLookups();
  const [openOp, setOpenOp] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [composer, setComposer] = useState(false);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<StageKind>("custom");
  const scroller = useRef<HTMLDivElement>(null);
  const scrollDir = useRef(0);
  const scrollRaf = useRef(0);

  const stages = useMemo(
    () => [...state.boardNodes].sort((a, b) => a.x - b.x || a.y - b.y),
    [state.boardNodes],
  );

  const ops = useMemo(() => {
    return state.ops.filter((op) => {
      if (!matchesFiltro(op, filtro)) return false;
      if (
        terceirizadoId &&
        !op.terceirizadoIds.includes(terceirizadoId) &&
        !op.micros.some((m) => m.terceirizadoId === terceirizadoId)
      ) {
        return false;
      }
      return true;
    });
  }, [state.ops, filtro, terceirizadoId]);

  function stopAutoScroll() {
    scrollDir.current = 0;
    if (scrollRaf.current) {
      cancelAnimationFrame(scrollRaf.current);
      scrollRaf.current = 0;
    }
  }

  function tickScroll() {
    const el = scroller.current;
    if (!el || !scrollDir.current) {
      scrollRaf.current = 0;
      return;
    }
    el.scrollLeft += scrollDir.current * 12;
    scrollRaf.current = requestAnimationFrame(tickScroll);
  }

  function act(opId: string, microId: string, status: MicroStatus) {
    dispatch({ type: "MICRO_ACTION", opId, microId, status });
  }

  function moveOp(opId: string, stageId: string) {
    const op = state.ops.find((o) => o.id === opId);
    if (!op || op.stageId === stageId) return;
    dispatch({ type: "MOVE_OP", opId, stageId, fromStageId: op.stageId });
  }

  function onBoardDragOver(e: DragEvent<HTMLDivElement>) {
    const el = scroller.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = e.clientX > rect.right - 80 ? 1 : e.clientX < rect.left + 80 ? -1 : 0;
    scrollDir.current = next;
    if (next && !scrollRaf.current) scrollRaf.current = requestAnimationFrame(tickScroll);
    if (!next) stopAutoScroll();
  }

  function addColumn() {
    const x = Math.max(0, ...state.boardNodes.map((n) => n.x), 0) + 280;
    const node = newStage(kind, label.trim() || stageKindLabel[kind], x, 140);
    const last = stages[stages.length - 1];
    dispatch({
      type: "SET_BOARD",
      nodes: [...state.boardNodes, node],
      edges: last
        ? [...state.boardEdges, { id: `e-${node.id}`, source: last.id, target: node.id }]
        : state.boardEdges,
    });
    setLabel("");
    setComposer(false);
  }

  return (
    <div
      ref={scroller}
      onDragOver={onBoardDragOver}
      onDragEnd={stopAutoScroll}
      className="kanban-h-scroll flex h-full min-h-0 w-full flex-1 snap-x snap-mandatory gap-2 md:snap-none md:gap-3"
    >
      {stages.map((stage) => {
        const unique = sortFamilyFirst(
          ops,
          ops.filter((op) => op.stageId === stage.id),
        );
        const isOver = overStage === stage.id && dragging && dragging !== stage.id;
        return (
          <section
            key={stage.id}
            onDragOver={(e) => {
              if (!isAdmin) return;
              e.preventDefault();
              setOverStage(stage.id);
            }}
            onDragLeave={() => setOverStage((cur) => (cur === stage.id ? null : cur))}
            onDrop={(e) => {
              e.preventDefault();
              const opId = e.dataTransfer.getData("text/op-id") || dragging;
              if (opId) moveOp(opId, stage.id);
              setDragging(null);
              setOverStage(null);
              stopAutoScroll();
            }}
            className={cn(
              "kanban-col surface flex h-full w-full shrink-0 snap-start flex-col overflow-hidden rounded-md md:w-[18.5rem]",
              isOver && "is-over",
            )}
          >
            <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: stage.color }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{stage.label}</p>
                <p className="text-[10px] text-faint">{unique.length} OP</p>
              </div>
              {isAdmin ? (
                <button
                  type="button"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-faint hover:bg-elevated hover:text-rose"
                  aria-label={`Remover ${stage.label}`}
                  onClick={() => dispatch({ type: "REMOVE_STAGE", id: stage.id })}
                >
                  <Trash2 size={13} />
                </button>
              ) : null}
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
              {unique.length === 0 ? (
                <p className="kanban-empty px-1 py-8 text-center text-[12px] text-faint">
                  {isOver ? "Solte a OP aqui" : "Nenhuma OP · arraste para cá"}
                </p>
              ) : (
                unique.map((op) => {
                  const prod = produto(op.produtoId);
                  const micros = op.micros.filter((m) => m.macroId === stage.id);
                  const visibleMicros = terceirizadoId
                    ? micros.filter((m) => m.terceirizadoId === terceirizadoId)
                    : micros;
                  const panelMicros = visibleMicros.length ? visibleMicros : micros;
                  const open = openOp === op.id || Boolean(terceirizadoId);
                  const done = micros.filter((m) => m.status === "concluida").length;
                  return (
                    <div
                      key={op.id}
                      draggable={isAdmin}
                      onDragStart={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest("button, a, input")) {
                          e.preventDefault();
                          return;
                        }
                        e.dataTransfer.setData("text/op-id", op.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDragging(op.id);
                      }}
                      onDragEnd={() => {
                        setDragging(null);
                        setOverStage(null);
                        stopAutoScroll();
                      }}
                      className={cn(
                        "kanban-card rounded-md border bg-panel/80 p-2",
                        familyCardClass(op, state.ops) || "border-line",
                        isAdmin && "cursor-grab active:cursor-grabbing",
                        dragging === op.id && "is-dragging",
                      )}
                    >
                      <div className="flex items-start gap-1.5">
                        {isAdmin ? (
                          <GripVertical size={14} className="mt-0.5 shrink-0 text-faint" />
                        ) : null}
                        <Link href={`/ops/${op.id}`} className="min-w-0 flex-1" onClick={(e) => dragging && e.preventDefault()}>
                          <p className="font-mono text-[12px]">
                            {op.numero}
                            {op.urgente ? <span className="ml-1 text-[9px] uppercase text-rose">urgente</span> : null}
                            {op.prioridade ? <span className="ml-1 text-[9px] uppercase text-amber">prio</span> : null}
                            {opAtrasada(op) ? <span className="ml-1 text-[9px] uppercase text-rose">atraso</span> : null}
                          </p>
                          <p className="truncate text-[11px] text-mute">{prod?.nome}</p>
                          <OpFamilyMark op={op} ops={state.ops} />
                          <p className="truncate text-[10px] text-faint">{cliente(op.clienteId)?.nome}</p>
                        </Link>
                        <div className="flex flex-col items-end gap-1">
                          <p className="text-[10px] tabular-nums text-faint">{nInt.format(op.quantidade)} pç</p>
                          {op.micros.length && !terceirizadoId ? (
                            <button
                              type="button"
                              aria-expanded={open}
                              aria-label={open ? `Recolher etapas de ${op.numero}` : `Ampliar etapas de ${op.numero}`}
                              onClick={() => setOpenOp((cur) => (cur === op.id ? null : op.id))}
                              className="grid h-7 w-7 place-items-center rounded-md text-faint hover:bg-elevated hover:text-ink"
                            >
                              <ChevronDown
                                size={14}
                                className={cn("kanban-chevron", open && "is-open")}
                              />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {!open && micros.length ? (
                        <p className="mt-1 text-[10px] text-faint">
                          {done}/{micros.length} micro-etapas
                        </p>
                      ) : null}
                      <div className={cn("kanban-fold", open && "is-open")} {...(open ? {} : { inert: true })}>
                        <div className="kanban-fold-inner">
                          {panelMicros.length ? (
                            <div className="pt-2">
                              <MicroBlock
                                opId={op.id}
                                micros={panelMicros}
                                canAct={(micro) => isAdmin || Boolean(terceirizadoId && micro.terceirizadoId === terceirizadoId)}
                                onAct={act}
                              />
                            </div>
                          ) : (
                            <p className="pt-2 text-[10px] text-faint">Sem micro-etapas nesta coluna.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        );
      })}

      {isAdmin ? (
        <section className="kanban-col flex h-full w-full shrink-0 snap-start flex-col justify-center gap-2 rounded-md border border-dashed border-line bg-card/30 p-4 md:w-[18.5rem]">
          {composer ? (
            <div className="kanban-composer flex flex-col gap-2">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Nome do quadro"
                className="well h-10 rounded-md border border-line px-3 text-[13px]"
              />
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as StageKind)}
                className="well h-10 rounded-md border border-line px-3 text-[13px]"
              >
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {stageKindLabel[k]}
                  </option>
                ))}
              </select>
              <Button onClick={addColumn}>Criar quadro</Button>
              <Button variant="ghost" onClick={() => setComposer(false)}>
                Fechar
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setComposer(true)}
              className="flex min-h-[8rem] flex-col items-center justify-center gap-1 text-mute hover:text-ink"
            >
              <Plus size={20} />
              <span className="text-[13px]">Novo quadro</span>
            </button>
          )}
        </section>
      ) : null}
    </div>
  );
}
