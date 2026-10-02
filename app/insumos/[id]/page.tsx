"use client";

import { use } from "react";
import { InsumoForm } from "@/components/insumos/insumo-form";
import { PageHeader, Stat } from "@/components/ui";
import { useStore } from "@/lib/store/store";

export default function InsumoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state } = useStore();
  const insumo = state.insumos.find((i) => i.id === id);
  if (!insumo) return <p className="p-6 text-sm text-mute">Insumo não encontrado.</p>;
  const fornecedor = state.fornecedores.find((f) => f.id === insumo.fornecedorId);
  const disp = insumo.estoqueAtual - insumo.reservado;
  const baixo = disp <= insumo.estoqueMinimo;

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker={insumo.codigo}
        title={insumo.descricao}
        description={fornecedor?.razaoSocial}
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <Stat
          label="Disponível"
          value={`${disp.toLocaleString("pt-BR")} ${insumo.unidadeCompra}`}
          tone={baixo ? "rose" : "ink"}
        />
        <Stat label="Reservado" value={`${insumo.reservado.toLocaleString("pt-BR")} ${insumo.unidadeCompra}`} tone="amber" />
        <Stat label="Cor" value={insumo.cor || "—"} />
      </div>
      <InsumoForm initial={insumo} />
    </div>
  );
}
