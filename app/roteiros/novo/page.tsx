"use client";

import { useSearchParams } from "next/navigation";
import { RoteiroForm } from "@/components/ops/roteiro-form";
import { PageHeader } from "@/components/ui";

export default function NovoRoteiroPage() {
  const voltar = useSearchParams().get("voltar");
  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Roteiros"
        title="Novo roteiro"
        description="Monte o caminho de ponta a ponta e reutilize nas próximas OPs."
      />
      <RoteiroForm voltar={voltar} />
    </div>
  );
}
