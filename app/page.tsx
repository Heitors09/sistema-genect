"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Maximize2, Minimize2 } from "lucide-react";
import { MacroKanban, type PainelFiltro } from "@/components/board/macro-kanban";
import { useKanbanFull } from "@/components/board/kanban-full";
import { Button, ButtonLink, Input, PageHeader, TabPanel, Tabs, cn } from "@/components/ui";
import { opAtrasada } from "@/lib/prazos";
import { useStore } from "@/lib/store/store";

export default function HomePage() {
  const { state, isAdmin } = useStore();
  const router = useRouter();
  const { full, toggleFull } = useKanbanFull();
  const [filtro, setFiltro] = useState<PainelFiltro>("todas");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    if (!isAdmin) router.replace("/ops");
  }, [isAdmin, router]);

  const counts = useMemo(() => {
    const abertas = state.ops.filter((o) => o.status === "aberta" || o.status === "em_producao" || o.status === "revisao");
    return {
      producao: state.ops.filter((o) => o.status === "em_producao" || o.status === "revisao").length,
      urgente: state.ops.filter((o) => o.urgente && o.status !== "finalizada" && o.status !== "cancelada").length,
      prioridade: state.ops.filter((o) => o.prioridade && o.status !== "finalizada" && o.status !== "cancelada").length,
      atrasada: state.ops.filter(opAtrasada).length,
      aguardando: state.ops.filter((o) =>
        o.micros.some((m) => m.status === "pendencia" || m.status === "aguardando"),
      ).length,
      aberta: abertas.length,
    };
  }, [state.ops]);

  if (!isAdmin) return null;

  const chips: { id: PainelFiltro; label: string; count: number }[] = [
    { id: "todas", label: "Em aberto", count: counts.aberta },
    { id: "producao", label: "Em produção", count: counts.producao },
    { id: "urgente", label: "Urgentes", count: counts.urgente },
    { id: "prioridade", label: "Prioridade", count: counts.prioridade },
    { id: "atrasada", label: "Atrasadas", count: counts.atrasada },
    { id: "aguardando", label: "Aguardando / pendência", count: counts.aguardando },
  ];

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden",
        full ? "gap-3 p-4 md:gap-4 md:px-6 md:py-5" : "gap-3 p-3 md:gap-5 md:p-4",
      )}
    >
      {full ? null : (
        <div className="shrink-0">
          <PageHeader
            kicker="Painel"
            title="Kanban de produção"
            description="Arraste as OPs entre os quadros, crie etapas novas e role o kanban pela barra de baixo."
          />
        </div>
      )}

      <div className="flex w-full shrink-0 flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-1.5">
          <Tabs
            value={filtro}
            onChange={setFiltro}
            className="max-w-full overflow-x-auto"
            items={chips.map((c) => ({ id: c.id, label: c.label, count: c.count }))}
          />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar OP, produto…"
            className="h-10 min-h-10 w-full px-2.5 text-[13px] md:h-8 md:min-h-8 md:w-[min(14rem,100%)] md:text-[12px]"
            aria-label="Buscar no Kanban"
          />
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 md:flex md:w-auto md:shrink-0 md:gap-3">
          <Button
            type="button"
            variant="ghost"
            className="hidden h-8 min-h-8 w-full px-3 text-[12px] md:inline-flex md:w-auto"
            onClick={toggleFull}
          >
            {full ? (
              <>
                <Minimize2 size={14} /> Sair da tela cheia
              </>
            ) : (
              <>
                <Maximize2 size={14} /> Tela cheia
              </>
            )}
          </Button>
          <ButtonLink href="/ops/nova" className="h-10 min-h-10 w-full px-3 text-[13px] md:h-8 md:min-h-8 md:w-auto md:text-[12px]">
            Nova OP
          </ButtonLink>
        </div>
      </div>

      <TabPanel value={filtro} className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        <MacroKanban filtro={filtro} busca={busca} />
      </TabPanel>
    </div>
  );
}
