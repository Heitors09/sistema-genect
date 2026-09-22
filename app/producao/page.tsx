"use client";

import { AdaptiveBoard } from "@/components/board/adaptive-board";
import { PageHeader } from "@/components/ui";

export default function ProducaoPage() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden p-3 md:gap-4 md:p-4">
      <div className="shrink-0">
        <PageHeader
          kicker="Produção"
          title="Chão de fábrica"
          description="Visão das etapas do dia, atados e posição de cada OP no fluxo."
        />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <AdaptiveBoard />
      </div>
    </div>
  );
}
