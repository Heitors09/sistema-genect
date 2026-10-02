"use client";

import { useSearchParams } from "next/navigation";
import { OpForm } from "@/components/ops/op-form";
import { PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store/store";

export default function NovaOpPage() {
  const { isAdmin } = useStore();
  const roteiroSel = useSearchParams().get("roteiro");
  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Produção"
        title="Nova ordem de produção"
        description="Cliente, produto e o roteiro: o caminho da peça, setor a setor ou terceirizado a terceirizado."
      />
      {isAdmin ? (
        <OpForm roteiroSel={roteiroSel} />
      ) : (
        <p className="text-sm text-mute">Apenas o administrador cria OPs.</p>
      )}
    </div>
  );
}
