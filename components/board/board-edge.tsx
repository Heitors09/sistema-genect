"use client";

import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow, type EdgeProps } from "@xyflow/react";
import { X } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store/store";
import { cn } from "../ui";

export function BoardEdge({
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
}: EdgeProps) {
  const { isAdmin, dispatch } = useStore();
  const { setEdges } = useReactFlow();
  const [hovered, setHovered] = useState(false);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  function disconnect(e: { stopPropagation: () => void; preventDefault: () => void }) {
    e.preventDefault();
    e.stopPropagation();
    dispatch({ type: "REMOVE_EDGE", id });
    setEdges((eds) => eds.filter((edge) => edge.id !== id));
  }

  const showX = isAdmin && (hovered || selected);

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
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {isAdmin ? (
        <EdgeLabelRenderer>
          <button
            type="button"
            className={cn(
              "nodrag nopan z-10 grid h-6 w-6 place-items-center rounded-md border border-line bg-elevated text-mute shadow-[0_4px_12px_rgb(0_0_0_/_0.4)] transition-opacity duration-150 hover:border-rose/40 hover:bg-rose/15 hover:text-rose",
              showX ? "opacity-100" : "opacity-0",
            )}
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: showX ? "all" : "none",
            }}
            tabIndex={showX ? 0 : -1}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
            onMouseDown={disconnect}
            onClick={disconnect}
            aria-label="Desconectar etapas"
          >
            <X size={11} />
          </button>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
