"use client";

import { AdaptiveBoard } from "@/components/board/adaptive-board";
import { ForecastBar } from "@/components/board/forecast";
import { ButtonLink, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store/store";

export default function HomePage() {
  const { isAdmin } = useStore();

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-3 md:gap-5 md:p-4">
      <PageHeader
        kicker="Painel"
        title="Fluxo do chão de fábrica"
        description="Colunas criáveis, reorganizáveis e ligáveis — um kanban em forma de patcher, ajustado às operações do dia."
        actions={
          isAdmin ? (
            <ButtonLink href="/ops/nova" className="w-full sm:w-auto">
              Nova OP
            </ButtonLink>
          ) : null
        }
      />
      <ForecastBar />
      <div className="min-h-0 flex-1">
        <AdaptiveBoard />
      </div>
    </div>
  );
}
