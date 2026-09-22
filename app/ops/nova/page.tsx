"use client";

import { OpForm } from "@/components/ops/op-form";
import { PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store/store";

export default function NovaOpPage() {
  const { isAdmin } = useStore();
  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Produção"
        title="Nova ordem de produção"
        description="Escolha o produto cadastrado. Serviço de costura não exige ficha completa; fabricação reserva os insumos do cadastro."
      />
      {isAdmin ? (
        <OpForm />
      ) : (
        <p className="text-sm text-mute">Apenas o administrador cria OPs.</p>
      )}
    </div>
  );
}
