"use client";

import { ProdutoForm } from "@/components/produtos/produto-form";
import { PageHeader } from "@/components/ui";

export default function NovoProdutoPage() {
  return (
    <div className="space-y-4 p-4">
      <PageHeader kicker="Produtos" title="Novo produto" description="Padrão: serviço de costura. Número, cor e preço são obrigatórios. A ficha completa fica para fabricação própria." />
      <ProdutoForm />
    </div>
  );
}
