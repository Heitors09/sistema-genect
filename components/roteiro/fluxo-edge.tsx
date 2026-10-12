"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import { X } from "lucide-react";
import { useState } from "react";
import { cn } from "../ui";

export type FluxoEdgeData = {
  deletable?: boolean;
  onDelete?: (edgeId: string) => void;
  labelText?: string;
};

export type FluxoFlowEdge = Edge<FluxoEdgeData, "fluxo">;

export function FluxoEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  selected,
  data,
}: EdgeProps<FluxoFlowEdge>) {
  const [hovered, setHovered] = useState(false);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const label = data?.labelText;
  const canDelete = Boolean(data?.deletable && data?.onDelete);
  const showX = canDelete && (hovered || selected);

  return (
    <>
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={28}
        className="react-flow__edge-interaction"
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      />
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {label || canDelete ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute flex items-center gap-1"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: showX || label ? "all" : "none",
            }}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
          >
            {label ? (
              <span className="rounded bg-well/95 px-1 text-[10px] font-semibold text-mute shadow-sm">
                {label}
              </span>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                title="Desconectar seta"
                aria-label="Desconectar"
                tabIndex={showX ? 0 : -1}
                className={cn(
                  "grid h-6 w-6 place-items-center rounded-full border border-rose/35 bg-card text-rose shadow-sm ring-2 ring-well transition-opacity duration-150 hover:border-rose hover:bg-rose/15",
                  showX ? "opacity-100" : "pointer-events-none opacity-0",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  data?.onDelete?.(id);
                }}
              >
                <X size={12} strokeWidth={2.75} />
              </button>
            ) : null}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
