"use client";

import { use } from "react";
import { InsumoForm } from "@/components/insumos/insumo-form";
import { Card, PageHeader, Stat } from "@/components/ui";
import { brl } from "@/lib/format";
import { useStore } from "@/lib/store/store";

export default function InsumoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state } = useStore();
  const insumo = state.insumos.find((i) => i.id === id);
  if (!insumo) return <p className="p-6 text-sm text-mute">Insumo não encontrado.</p>;
  const lotes = state.lotes.filter((l) => l.insumoId === insumo.id);
  const fornecedor = state.fornecedores.find((f) => f.id === insumo.fornecedorId);

  return (
    <div className="space-y-4 p-4">
      <PageHeader kicker={insumo.codigo} title={insumo.descricao} description={fornecedor?.razaoSocial} />
      <div className="grid gap-2 sm:grid-cols-3">
        <Stat label="Disponível" value={`${(insumo.estoqueAtual - insumo.reservado).toLocaleString("pt-BR")} ${insumo.unidadeCompra}`} />
        <Stat label="Reservado" value={insumo.reservado.toLocaleString("pt-BR")} tone="amber" />
        <Stat label="Custo médio" value={brl.format(insumo.custoMedio)} />
      </div>
      <Card className="p-4 text-[13px]">
        <p className="kicker">Lotes</p>
        <ul className="mt-2 space-y-2">
          {lotes.map((l) => (
            <li key={l.id} className="flex justify-between border-b border-line py-1">
              <span>{l.loteFabricante} · NF {l.nf}</span>
              <span className="text-mute">{l.quantidadeRestante} {l.unidade}</span>
            </li>
          ))}
        </ul>
      </Card>
      <InsumoForm initial={insumo} />
    </div>
  );
}
