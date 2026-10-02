"use client";

import { InsumoForm } from "@/components/insumos/insumo-form";
import { PageHeader } from "@/components/ui";

export default function NovoInsumoPage() {
  return (
    <div className="space-y-4 p-4">
      <PageHeader kicker="Insumos" title="Novo insumo" description="Código gerado se vazio. Unidade de consumo vale na ficha do produto e na baixa da OP." />
      <InsumoForm />
    </div>
  );
}
