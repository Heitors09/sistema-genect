"use client";

import { use } from "react";
import { OpForm } from "@/components/ops/op-form";
import { PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store/store";

export default function EditarOpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state, isAdmin } = useStore();
  const op = state.ops.find((o) => o.id === id);

  if (!op) return <p className="p-6 text-sm text-mute">OP não encontrada.</p>;
  if (!isAdmin) return <p className="p-6 text-sm text-mute">Apenas o administrador edita o cadastro da OP.</p>;

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Produção"
        title={`Editar ${op.numero}`}
        description="Altere cliente, produto, quantidade, roteiro e demais dados de cadastro."
      />
      <OpForm initial={op} />
    </div>
  );
}
