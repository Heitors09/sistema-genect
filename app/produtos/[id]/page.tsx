"use client";

import { use } from "react";
import { ProdutoForm } from "@/components/produtos/produto-form";
import { Badge, Card, PageHeader } from "@/components/ui";
import { brl, categoriaLabel, tipoNegocioLabel } from "@/lib/format";
import { fichaLinhas } from "@/lib/ficha";
import { useLookups, useStore } from "@/lib/store/store";

export default function ProdutoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state } = useStore();
  const { insumo } = useLookups();
  const produto = state.produtos.find((p) => p.id === id);
  if (!produto) return <p className="p-6 text-sm text-mute">Produto não encontrado.</p>;

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker={produto.referencia}
        title={produto.nome}
        description={[tipoNegocioLabel[produto.tipoNegocio], produto.categoria, produto.linha].filter(Boolean).join(" · ") || "Produto"}
      />
      <div className="flex flex-wrap gap-2">
        <Badge tone={produto.tipoNegocio === "fabricacao" ? "amber" : "violet"}>
          {tipoNegocioLabel[produto.tipoNegocio]}
        </Badge>
        {produto.cores.map((c) => (
          <Badge key={c} tone="violet">{c}</Badge>
        ))}
        {produto.tamanhos.map((t) => (
          <Badge key={t}>{t}</Badge>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-4 text-[13px]">
          <p className="kicker">Insumos da ficha</p>
          <ul className="mt-2 space-y-1.5 text-mute">
            {fichaLinhas(produto).map((a) => {
              const ins = insumo(a.insumoId);
              return (
                <li key={a.insumoId}>
                  <span className="text-ink">{ins?.codigo}</span>
                  {" · "}
                  {ins ? categoriaLabel[ins.categoria] : "Insumo"}
                  {" · "}
                  {a.consumoPorPeca} / peça
                </li>
              );
            })}
            {!fichaLinhas(produto).length ? <li>Nenhum insumo cadastrado</li> : null}
          </ul>
          <p className="mt-3">Custo {brl.format(produto.custoEstimado)} · Venda {brl.format(produto.precoVenda)}</p>
        </Card>
        <Card className="p-4 text-[13px]">
          <p className="kicker">Roteiro</p>
          <ol className="mt-2 space-y-1">
            {produto.roteiro.map((r, i) => (
              <li key={r.id}>
                {i + 1}. {r.nome} · {r.minutos} min
              </li>
            ))}
          </ol>
          <p className="mt-3 text-faint">Croqui: {produto.fotoHint || "sem imagem"}</p>
        </Card>
      </div>
      <ProdutoForm initial={produto} />
    </div>
  );
}
