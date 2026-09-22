"use client";

import {
  Background,
  BackgroundVariant,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Focus, RotateCcw } from "lucide-react";
import { stageColors, stageKindLabel, uid } from "@/lib/format";
import type { StageKind } from "@/lib/types";
import { newStage, useStore } from "@/lib/store/store";
import { Button } from "../ui";
import { BoardEdge } from "./board-edge";
import { StageNode, type StageFlowNode } from "./stage-node";

const nodeTypes = { stage: StageNode };
const edgeTypes = { board: BoardEdge };

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

function toFlow(nodes: ReturnType<typeof useStore>["state"]["boardNodes"]): StageFlowNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: "stage",
    position: { x: n.x, y: n.y },
    data: { label: n.label, color: n.color, kind: n.kind },
  }));
}

function toFlowEdges(edges: ReturnType<typeof useStore>["state"]["boardEdges"], nodes: StageFlowNode[]): Edge[] {
  return edges.map((e) => {
    const color = nodes.find((n) => n.id === e.source)?.data.color ?? "#8a8f9c";
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: "board",
      animated: true,
      style: { stroke: color, strokeWidth: 2.2 },
    };
  });
}

function BoardInner() {
  const { state, dispatch, isAdmin } = useStore();
  const { fitView, screenToFlowPosition, getNodes, getEdges } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<StageFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [kind, setKind] = useState<StageKind>("custom");
  const [label, setLabel] = useState("");
  const didFit = useRef(false);

  useEffect(() => {
    const nextNodes = toFlow(state.boardNodes);
    setNodes(nextNodes);
    setEdges(toFlowEdges(state.boardEdges, nextNodes));
  }, [state.boardNodes, state.boardEdges, setNodes, setEdges]);

  useEffect(() => {
    if (didFit.current || nodes.length === 0) return;
    didFit.current = true;
    const t = window.setTimeout(() => fitView({ padding: 0.12, duration: 250 }), 80);
    return () => window.clearTimeout(t);
  }, [nodes, fitView]);

  const persist = useCallback(
    (nextNodes: StageFlowNode[], nextEdges: Edge[]) => {
      dispatch({
        type: "SET_BOARD",
        nodes: nextNodes.map((n) => ({
          id: n.id,
          kind: n.data.kind,
          label: n.data.label,
          color: n.data.color,
          x: n.position.x,
          y: n.position.y,
        })),
        edges: nextEdges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
        })),
      });
    },
    [dispatch],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!isAdmin) return;
      setEdges((eds) => {
        const color = nodes.find((n) => n.id === connection.source)?.data.color ?? "#8a8f9c";
        const next = addEdge(
          {
            ...connection,
            id: uid("e"),
            type: "board",
            animated: true,
            style: { stroke: color, strokeWidth: 2.2 },
          },
          eds,
        );
        persist(nodes, next);
        return next;
      });
    },
    [isAdmin, nodes, persist, setEdges],
  );

  const addColumn = useCallback(
    (k: StageKind, name?: string) => {
      const pos = screenToFlowPosition({ x: 420, y: 220 });
      const node = newStage(k, name || (k === "custom" ? "Nova etapa" : stageKindLabel[k]), pos.x, pos.y);
      dispatch({ type: "ADD_STAGE", node });
      setLabel("");
    },
    [dispatch, screenToFlowPosition],
  );

  const palette = useMemo(() => kinds, []);

  return (
    <div className="surface flex h-full min-h-0 overflow-hidden rounded-md bg-[#0a0b10]">
      {isAdmin ? (
        <div className="hidden w-[196px] shrink-0 overflow-y-auto border-r border-line bg-sidebar/80 p-2 xl:block">
          <div className="mb-2 flex flex-col gap-1">
            <Button
              size="sm"
              variant="soft"
              className="w-full"
              onClick={() => fitView({ padding: 0.16, duration: 250 })}
            >
              <Focus size={12} /> Enquadrar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="w-full"
              onClick={() => {
                persist(
                  nodes.map((n) => ({ ...n, position: { ...n.position } })),
                  edges,
                );
              }}
            >
              <RotateCcw size={12} /> Salvar layout
            </Button>
          </div>
          <p className="kicker px-1 pb-2">
            Etapas
          </p>
          <div className="flex flex-col gap-1">
            {palette.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => addColumn(k)}
                className="flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-left text-[12px] text-mute hover:border-line hover:bg-panel hover:text-ink"
              >
                <span className="h-2 w-2 rounded-full" style={{ background: stageColors[k] }} />
                {stageKindLabel[k]}
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-1.5 border-t border-line pt-3">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Nome da coluna"
              className="well h-8 w-full rounded-md border border-line px-2 text-[12px] outline-none"
            />
            <Button
              size="sm"
              className="w-full"
              onClick={() => addColumn(kind, label || undefined)}
            >
              <Plus size={12} />
              Criar coluna
            </Button>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as StageKind)}
              className="well h-8 w-full rounded-md border border-line px-2 text-[12px] outline-none"
            >
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {stageKindLabel[k]}
                </option>
              ))}
            </select>
            <p className="px-1 pt-1 text-[10px] leading-relaxed text-faint">
              Arraste as colunas e ligue as saídas nas entradas.
            </p>
          </div>
        </div>
      ) : null}

      <div className="relative h-full min-h-0 min-w-0 flex-1">
        {!isAdmin ? (
          <div className="pointer-events-none absolute right-3 top-3 z-10">
            <Button
              size="sm"
              variant="soft"
              className="pointer-events-auto"
              onClick={() => fitView({ padding: 0.16, duration: 250 })}
            >
              <Focus size={12} /> Enquadrar
            </Button>
          </div>
        ) : null}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={(changes) => {
            onNodesChange(changes);
          }}
          onEdgesChange={(changes) => {
            if (!isAdmin) return;
            onEdgesChange(changes);
          }}
          onNodeDragStop={() => persist(getNodes() as StageFlowNode[], getEdges())}
          onEdgesDelete={(deleted) => {
            const ids = new Set(deleted.map((e) => e.id));
            persist(
              getNodes() as StageFlowNode[],
              getEdges().filter((e) => !ids.has(e.id)),
            );
          }}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: "board", interactionWidth: 28 }}
          minZoom={0.15}
          maxZoom={1.75}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={isAdmin}
          nodesConnectable={isAdmin}
          edgesReconnectable={isAdmin}
          elementsSelectable
          deleteKeyCode={isAdmin ? ["Backspace", "Delete"] : null}
          className="board-grid h-full"
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="rgba(255,255,255,0.08)" />
        </ReactFlow>
      </div>
    </div>
  );
}

export function ProductionBoard() {
  return (
    <ReactFlowProvider>
      <BoardInner />
    </ReactFlowProvider>
  );
}
