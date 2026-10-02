"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { RoteiroForm } from "@/components/ops/roteiro-form";
import { PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store/store";

export default function RoteiroDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const voltar = useSearchParams().get("voltar");
  const { state, hydrated } = useStore();
  const roteiro = state.roteiros.find((r) => r.id === id);
  if (!hydrated) return null;
  if (!roteiro) return <p className="p-6 text-sm text-mute">Roteiro não encontrado.</p>;

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Roteiros"
        title={roteiro.nome}
        description="Altere as etapas deste modelo. As OPs já abertas mantêm o caminho que tinham."
      />
      <RoteiroForm initial={roteiro} voltar={voltar} />
    </div>
  );
}
