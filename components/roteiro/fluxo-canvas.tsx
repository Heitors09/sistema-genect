"use client";

import {
  Background,
  BackgroundVariant,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Node,
} from "@xyflow/react";
import { Focus } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import type { MicroStatus, RoteiroAresta } from "@/lib/types";
import { layoutNodes } from "@/lib/roteiro-graph";
import { Button, cn } from "../ui";
import { FluxoEdge, type FluxoFlowEdge } from "./fluxo-edge";
import { FluxoNode, type FluxoFlowNode, type FluxoNodeData, type FluxoNodeMark } from "./fluxo-node";

const nodeTypes = { fluxo: FluxoNode };
const edgeTypes = { fluxo: FluxoEdge };

export type FluxoEtapaView = {
  id: string;
  nome: string;
  macroId: string;
  terceirizado?: boolean;
  terceirizadoNome?: string;
  servicoNome?: string;
  status?: MicroStatus;
  x?: number;
  y?: number;
  mark?: FluxoNodeMark;
};

function toFlow(
  etapas: FluxoEtapaView[],
  arestas: RoteiroAresta[],
  setorLabel: (macroId: string) => string | undefined,
  opts?: {
    atualId?: string;
    highlightIds?: string[];
    preferPositions?: boolean;
    onDisconnect?: (edgeId: string) => void;
    onDeleteNode?: (nodeId: string) => void;
  },
): { nodes: FluxoFlowNode[]; edges: FluxoFlowEdge[] } {
  const laid = opts?.preferPositions
    ? etapas.map((e) => ({ ...e, x: e.x ?? 0, y: e.y ?? 0 }))
    : layoutNodes(etapas, arestas, opts?.atualId ?? etapas[0]?.id);
  const highlight = new Set(opts?.highlightIds ?? []);
  const canDeleteNode = Boolean(opts?.onDeleteNode);
  const nodes: FluxoFlowNode[] = laid.map((e) => ({
    id: e.id,
    type: "fluxo",
    position: { x: e.x ?? 0, y: e.y ?? 0 },
    data: {
      nome: e.nome,
      setorLabel: setorLabel(e.macroId),
      terceirizado: e.terceirizado,
      terceirizadoNome: e.terceirizadoNome,
      servicoNome: e.servicoNome,
      status: e.status,
      atual: opts?.atualId === e.id,
      ramoFilha: highlight.has(e.id) && !e.mark,
      mark: e.mark,
      deletable: canDeleteNode,
      onDelete: opts?.onDeleteNode,
    },
  }));
  const outs = new Map<string, number>();
  for (const a of arestas) outs.set(a.fromId, (outs.get(a.fromId) ?? 0) + 1);
  const canDisconnect = Boolean(opts?.onDisconnect);
  const edges: FluxoFlowEdge[] = arestas.map((a) => {
    const fork = (outs.get(a.fromId) ?? 0) > 1 || a.kind === "bifurcacao" || a.kind === "filha";
    const labelText = a.label ?? (a.kind === "filha" ? "filha" : fork ? "ou" : undefined);
    return {
      id: a.id,
      type: "fluxo",
      source: a.fromId,
      target: a.toId,
      animated: a.kind === "filha",
      style: {
        stroke: a.kind === "filha" ? "var(--amber)" : fork ? "var(--sky)" : "var(--mute)",
        strokeWidth: fork ? 2 : 1.5,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
        color: fork ? "var(--sky)" : "var(--mute)",
      },
      data: {
        labelText,
        deletable: canDisconnect,
        onDelete: opts?.onDisconnect,
      },
    };
  });
  return { nodes, edges };
}

function FluxoInner({
  etapas,
  arestas,
  setorLabel,
  atualId,
  highlightIds,
  editable,
  onConnect,
  onDisconnect,
  onDeleteNode,
  onNodesChangePos,
  onSelect,
  selectedId,
  className,
  height = 320,
  preferPositions,
}: {
  etapas: FluxoEtapaView[];
  arestas: RoteiroAresta[];
  setorLabel: (macroId: string) => string | undefined;
  atualId?: string;
  highlightIds?: string[];
  editable?: boolean;
  onConnect?: (c: Connection) => void;
  onDisconnect?: (edgeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  onNodesChangePos?: (nodes: { id: string; x: number; y: number }[]) => void;
  onSelect?: (id: string | null) => void;
  selectedId?: string | null;
  className?: string;
  height?: number;
  preferPositions?: boolean;
}) {
  const setorLabels = etapas.map((e) => setorLabel(e.macroId) ?? "").join("\0");
  const highlightKey = (highlightIds ?? []).join("\0");
  const disconnectRef = useRef(onDisconnect);
  const deleteNodeRef = useRef(onDeleteNode);
  disconnectRef.current = onDisconnect;
  deleteNodeRef.current = onDeleteNode;
  const canDisconnect = Boolean(onDisconnect);
  const canDeleteNode = Boolean(onDeleteNode);
  const built = useMemo(() => {
    const labels = setorLabels.split("\0");
    const byEtapaId = new Map(etapas.map((e, i) => [e.id, labels[i] || undefined]));
    return toFlow(
      etapas,
      arestas,
      (macroId) => {
        const etapa = etapas.find((e) => e.macroId === macroId);
        return etapa ? byEtapaId.get(etapa.id) : undefined;
      },
      {
        atualId,
        highlightIds: highlightKey ? highlightKey.split("\0").filter(Boolean) : undefined,
        preferPositions,
        onDisconnect: canDisconnect ? (id) => disconnectRef.current?.(id) : undefined,
        onDeleteNode: canDeleteNode ? (id) => deleteNodeRef.current?.(id) : undefined,
      },
    );
  }, [
    etapas,
    arestas,
    atualId,
    preferPositions,
    setorLabels,
    highlightKey,
    canDisconnect,
    canDeleteNode,
  ]);
  const contentKey = useMemo(
    () =>
      JSON.stringify({
        nodes: built.nodes.map((n) => ({
          id: n.id,
          x: n.position.x,
          y: n.position.y,
          data: {
            nome: n.data.nome,
            setorLabel: n.data.setorLabel,
            terceirizado: n.data.terceirizado,
            terceirizadoNome: n.data.terceirizadoNome,
            servicoNome: n.data.servicoNome,
            status: n.data.status,
            atual: n.data.atual,
            ramoFilha: n.data.ramoFilha,
            mark: n.data.mark,
            deletable: n.data.deletable,
          },
        })),
        edges: built.edges.map((e) => ({
          id: e.id,
          s: e.source,
          t: e.target,
          l: e.data?.labelText,
          del: e.data?.deletable,
        })),
      }),
    [built],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(built.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(built.edges);
  const { fitView } = useReactFlow();
  const selectedIdRef = useRef<string | null>(selectedId ?? null);
  const blockPaneClear = useRef(false);
  const structureKey = useMemo(
    () =>
      `${etapas.map((e) => e.id).join("|")}::${arestas.map((a) => `${a.fromId}>${a.toId}`).join("|")}`,
    [etapas, arestas],
  );
  const lastStructure = useRef("");
  const lastContent = useRef("");

  const resolvedSelected =
    selectedId !== undefined ? selectedId : selectedIdRef.current;

  useEffect(() => {
    if (selectedId !== undefined) selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    const keepId = resolvedSelected;
    if (contentKey === lastContent.current) {
      setNodes((prev) => {
        let changed = false;
        const next = prev.map((n) => {
          const selected = keepId ? n.id === keepId : false;
          if (n.selected !== selected) changed = true;
          return selected === n.selected ? n : { ...n, selected };
        });
        return changed ? next : prev;
      });
      return;
    }
    lastContent.current = contentKey;
    setNodes(
      built.nodes.map((n) => ({
        ...n,
        selected: keepId ? n.id === keepId : false,
      })),
    );
    setEdges(built.edges);
    if (preferPositions) return;
    if (structureKey === lastStructure.current) return;
    lastStructure.current = structureKey;
    const t = requestAnimationFrame(() => fitView({ padding: 0.2, duration: 200 }));
    return () => cancelAnimationFrame(t);
  }, [
    built,
    contentKey,
    structureKey,
    resolvedSelected,
    setNodes,
    setEdges,
    fitView,
    preferPositions,
  ]);

  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-line bg-well", className)} style={{ height }}>
      <div className="pointer-events-none absolute right-2 top-2 z-10">
        <Button
          size="sm"
          variant="soft"
          className="pointer-events-auto"
          type="button"
          onClick={() => fitView({ padding: 0.2, duration: 250 })}
        >
          <Focus size={12} /> Enquadrar
        </Button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={editable ? onEdgesChange : undefined}
        onNodeDragStop={
          editable && onNodesChangePos
            ? (_e, _n, all) =>
                onNodesChangePos(
                  all.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y })),
                )
            : undefined
        }
        onConnect={editable ? onConnect : undefined}
        onNodeClick={
          onSelect
            ? (e, node) => {
                e.stopPropagation();
                blockPaneClear.current = true;
                selectedIdRef.current = node.id;
                onSelect(node.id);
                queueMicrotask(() => {
                  blockPaneClear.current = false;
                });
              }
            : undefined
        }
        onPaneClick={
          onSelect
            ? () => {
                if (blockPaneClear.current) return;
                selectedIdRef.current = null;
                onSelect(null);
              }
            : undefined
        }
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.25}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={Boolean(editable)}
        nodesConnectable={Boolean(editable)}
        edgesFocusable={canDisconnect}
        elementsSelectable
        selectNodesOnDrag={false}
        className="board-grid h-full"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="var(--grid-dot)" />
      </ReactFlow>
    </div>
  );
}

export function FluxoCanvas(props: {
  etapas: FluxoEtapaView[];
  arestas: RoteiroAresta[];
  setorLabel: (macroId: string) => string | undefined;
  atualId?: string;
  highlightIds?: string[];
  editable?: boolean;
  onConnect?: (c: Connection) => void;
  onDisconnect?: (edgeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  onNodesChangePos?: (nodes: { id: string; x: number; y: number }[]) => void;
  onSelect?: (id: string | null) => void;
  /** Seleção controlada pelo pai (painel de edição). */
  selectedId?: string | null;
  className?: string;
  height?: number;
  /** Mantém x/y dos nós (modo edição / draft). */
  preferPositions?: boolean;
  /** @deprecated use etapas[].mark */
  marks?: boolean;
}) {
  const { marks: _marks, ...rest } = props;
  return (
    <ReactFlowProvider>
      <FluxoInner {...rest} preferPositions={props.preferPositions ?? props.editable} />
    </ReactFlowProvider>
  );
}

function depthMap(etapas: FluxoEtapaView[], arestas: RoteiroAresta[]) {
  const start = etapas[0]?.id;
  const outs = new Map<string, string[]>();
  for (const a of arestas) {
    const list = outs.get(a.fromId) ?? [];
    list.push(a.toId);
    outs.set(a.fromId, list);
  }
  const depth = new Map<string, number>();
  const lane = new Map<string, number>();
  const laneCount = new Map<number, number>();
  if (!start) return { depth, lane, outs };
  const q = [start];
  depth.set(start, 0);
  while (q.length) {
    const id = q.shift();
    if (!id) break;
    const d = depth.get(id) ?? 0;
    if (!lane.has(id)) {
      const row = laneCount.get(d) ?? 0;
      lane.set(id, row);
      laneCount.set(d, row + 1);
    }
    for (const next of outs.get(id) ?? []) {
      if (!depth.has(next)) {
        depth.set(next, d + 1);
        q.push(next);
      }
    }
  }
  let orphan = (Math.max(0, ...depth.values(), 0) || 0) + 1;
  for (const e of etapas) {
    if (!depth.has(e.id)) {
      depth.set(e.id, orphan++);
      lane.set(e.id, 0);
    }
  }
  return { depth, lane, outs };
}

/** Mini preview estático (lista de roteiros) — chips, sem SVG esticado. */
export function FluxoMini({
  etapas,
  arestas,
  className,
}: {
  etapas: FluxoEtapaView[];
  arestas: RoteiroAresta[];
  className?: string;
}) {
  const { depth, lane } = depthMap(etapas, arestas);
  const cols = new Map<number, FluxoEtapaView[]>();
  for (const e of etapas) {
    const d = depth.get(e.id) ?? 0;
    const list = cols.get(d) ?? [];
    list.push(e);
    cols.set(d, list);
  }
  for (const [d, list] of cols) {
    list.sort((a, b) => (lane.get(a.id) ?? 0) - (lane.get(b.id) ?? 0));
    cols.set(d, list);
  }
  const orderedCols = [...cols.entries()].sort((a, b) => a[0] - b[0]);
  const forkFrom = new Set(
    arestas.filter((a) => a.kind === "bifurcacao" || a.kind === "filha").map((a) => a.fromId),
  );
  const outsCount = new Map<string, number>();
  for (const a of arestas) outsCount.set(a.fromId, (outsCount.get(a.fromId) ?? 0) + 1);

  return (
    <div
      className={cn(
        "flex min-h-[5.5rem] items-center rounded-md border border-line bg-well px-2.5 py-2.5",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
        {orderedCols.map(([col, nodes], colIdx) => (
          <div key={col} className="flex items-center gap-1">
            {colIdx > 0 ? (
              <span className="mx-0.5 text-[10px] text-faint" aria-hidden>
                →
              </span>
            ) : null}
            <div className="flex flex-col gap-1">
              {nodes.map((n, i) => {
                const fork = forkFrom.has(n.id) || (outsCount.get(n.id) ?? 0) > 1;
                const isAlt = nodes.length > 1 && i > 0;
                return (
                  <span key={n.id} className="flex items-center gap-1">
                    {isAlt ? (
                      <span className="text-[9px] font-medium uppercase tracking-wider text-sky">ou</span>
                    ) : null}
                    <span
                      title={n.nome}
                      className={cn(
                        "inline-flex rounded-md border px-2 py-1 text-[11px] font-medium leading-tight text-ink",
                        n.terceirizado ? "border-sky/30 bg-sky/10" : "border-line-strong bg-card",
                        fork && "ring-1 ring-sky/20",
                      )}
                    >
                      {n.nome}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// silence unused Node import if tree-shaken oddly
export type { Node, FluxoNodeData };
