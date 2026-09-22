"use client";

import dynamic from "next/dynamic";
import { useIsDesktop } from "@/lib/hooks";
import { MobileKanban } from "./mobile-kanban";

const DesktopBoard = dynamic(
  () => import("./production-board").then((m) => m.ProductionBoard),
  {
    ssr: false,
    loading: () => (
      <div className="surface grid h-full min-h-0 place-items-center rounded-md text-sm text-mute">
        Carregando fluxograma…
      </div>
    ),
  },
);

export function AdaptiveBoard() {
  const desktop = useIsDesktop("(min-width: 1024px)");
  if (desktop === null) {
    return (
      <div className="surface grid h-full min-h-0 place-items-center rounded-md text-sm text-mute">
        Carregando o fluxo do dia…
      </div>
    );
  }
  if (!desktop) return <MobileKanban />;
  return <DesktopBoard />;
}
