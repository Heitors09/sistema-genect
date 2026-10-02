"use client";

import { useSearchParams } from "next/navigation";
import { ProdutoForm } from "@/components/produtos/produto-form";
import { PageHeader } from "@/components/ui";

export default function NovoProdutoPage() {
  const voltar = useSearchParams().get("voltar");
  return (
    <div className="space-y-4 p-4">
      <PageHeader kicker="Produtos" title="Novo produto" description="Número e nome. Foto, descrição, preço e insumos são opcionais. A grade liga tamanho à cor no estoque." />
      <ProdutoForm voltar={voltar} />
    </div>
  );
}
