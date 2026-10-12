"use client";

import { useSearchParams } from "next/navigation";
import { ProdutoForm } from "@/components/produtos/produto-form";
import { PageHeader } from "@/components/ui";

export default function NovoProdutoPage() {
  const voltar = useSearchParams().get("voltar");
  return (
    <div className="space-y-4 p-4">
      <PageHeader kicker="Produtos" title="Novo produto" description="Número, nome e grade de tamanhos. Variações tamanho×cor, foto, preço e insumos são opcionais." />
      <ProdutoForm voltar={voltar} />
    </div>
  );
}
