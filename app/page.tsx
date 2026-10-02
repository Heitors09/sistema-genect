"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Maximize2, Minimize2 } from "lucide-react";
import { MacroKanban, type PainelFiltro } from "@/components/board/macro-kanban";
import { useKanbanFull } from "@/components/board/kanban-full";
import { Badge, Button, ButtonLink, CreatableSelect, PageHeader, cn } from "@/components/ui";
import { opAtrasada } from "@/lib/prazos";
import { uid } from "@/lib/format";
import { useStore } from "@/lib/store/store";

export default function HomePage() {
  const { state, dispatch, isAdmin } = useStore();
  const router = useRouter();
  const { full, toggleFull } = useKanbanFull();
  const [filtro, setFiltro] = useState<PainelFiltro>("todas");
  const [terceirizadoId, setTerceirizadoId] = useState("");

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
        o.micros.some((m) => m.status === "pendencia" || (m.terceirizadoId && m.status === "aguardando")),
      ).length,
      aberta: abertas.length,
    };
  }, [state.ops]);

  if (!isAdmin) return null;

  const chips: { id: PainelFiltro; label: string; count: number; tone?: "rose" | "amber" | "sky" | "mute" }[] = [
    { id: "todas", label: "Em aberto", count: counts.aberta },
    { id: "producao", label: "Em produção", count: counts.producao, tone: "sky" },
    { id: "urgente", label: "Urgentes", count: counts.urgente, tone: "rose" },
    { id: "prioridade", label: "Prioridade", count: counts.prioridade, tone: "amber" },
    { id: "atrasada", label: "Atrasadas", count: counts.atrasada, tone: "rose" },
    { id: "aguardando", label: "Aguardando terceirizado", count: counts.aguardando, tone: "amber" },
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
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFiltro(chip.id)}
              className={cn(
                "motion-press inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 text-[12px] leading-none",
                filtro === chip.id ? "border-line-strong bg-elevated text-ink" : "border-line text-mute hover:bg-elevated/60",
              )}
            >
              {chip.label}
              <Badge tone={chip.tone} size="sm">
                {chip.count}
              </Badge>
            </button>
          ))}
          <CreatableSelect
            className="w-full md:w-[min(15.5rem,100%)]"
            triggerClassName="h-8 min-h-8 px-2.5 text-[12px] md:h-8 md:min-h-0 md:text-[12px]"
            value={terceirizadoId}
            emptyLabel="Todos os terceirizados"
            addLabel="+ Novo terceirizado"
            addPlaceholder="Nome do terceirizado"
            options={state.terceirizados.filter((t) => t.ativo).map((t) => ({ value: t.id, label: t.nome }))}
            onChange={setTerceirizadoId}
            onAdd={(nome) => {
              const id = uid("ter");
              dispatch({
                type: "SAVE_TERCEIRIZADO",
                terceirizado: {
                  id,
                  nome,
                  servicos: [],
                  especialidade: "",
                  valorPorPeca: 0,
                  ativo: true,
                },
              });
              setTerceirizadoId(id);
            }}
          />
        </div>
        <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:shrink-0 md:gap-3">
          <Button
            type="button"
            variant="ghost"
            className="h-8 min-h-8 w-full px-3 text-[12px] md:w-auto"
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
          <ButtonLink href="/ops/nova" className="h-8 min-h-8 w-full px-3 text-[12px] md:w-auto">
            Nova OP
          </ButtonLink>
        </div>
      </div>

      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        <MacroKanban filtro={filtro} terceirizadoId={terceirizadoId || undefined} />
      </div>
    </div>
  );
}
