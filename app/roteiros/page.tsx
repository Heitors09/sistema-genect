"use client";

import Link from "next/link";
import { FluxoMini } from "@/components/roteiro/fluxo-canvas";
import { ButtonLink, PageHeader } from "@/components/ui";
import { ensureRoteiroGraph } from "@/lib/roteiro-graph";
import { useStore } from "@/lib/store/store";

export default function RoteirosPage() {
  const { state, isAdmin } = useStore();

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Produção"
        title="Roteiros"
        description="Fluxogramas do caminho da peça — retos ou com bifurcações para OP filha."
        actions={isAdmin ? <ButtonLink href="/roteiros/novo">Novo roteiro</ButtonLink> : null}
      />
      {state.roteiros.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {state.roteiros.map((raw) => {
            const r = ensureRoteiroGraph(raw);
            return (
              <Link
                key={r.id}
                href={`/roteiros/${r.id}`}
                className="group surface rounded-lg border border-line p-3 transition hover:border-line-strong"
              >
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <p className="truncate font-medium text-ink group-hover:text-sky">{r.nome}</p>
                  <span className="shrink-0 text-[11px] text-faint">
                    {r.etapas.length} {r.etapas.length === 1 ? "etapa" : "etapas"}
                  </span>
                </div>
                <FluxoMini
                  etapas={r.etapas.map((e) => ({
                    id: e.id,
                    nome: e.nome,
                    macroId: e.macroId,
                    terceirizado: e.terceirizado,
                    x: e.x,
                    y: e.y,
                  }))}
                  arestas={r.arestas ?? []}
                />
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-line px-4 py-8 text-center text-[13px] text-mute">
          Nenhum roteiro ainda. Crie o primeiro fluxograma para reutilizar nas OPs.
        </p>
      )}
    </div>
  );
}
