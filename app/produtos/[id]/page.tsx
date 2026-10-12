"use client";

import { use, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ProdutoForm } from "@/components/produtos/produto-form";
import { Badge, Card, PageHeader } from "@/components/ui";
import { brl, categoriaLabel, nInt, tipoNegocioLabel } from "@/lib/format";
import { estoqueDoProduto } from "@/lib/estoque-produto";
import { fichaLinhas } from "@/lib/ficha";
import { useLookups, useStore } from "@/lib/store/store";

export default function ProdutoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const voltar = useSearchParams().get("voltar");
  const { state } = useStore();
  const { insumo } = useLookups();
  const produto = state.produtos.find((p) => p.id === id);
  const faturados = useMemo(() => new Set(state.faturamentos.map((f) => f.opId)), [state.faturamentos]);
  const estoque = produto ? estoqueDoProduto(produto, state.ops, faturados) : [];
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
                  {ins ? categoriaLabel[ins.categoria] ?? ins.categoria : "Insumo"}
                  {" · "}
                  {a.consumoPorPeca} {ins?.unidadeConsumo ?? ""}
                  {ins?.cor ? ` · ${ins.cor}` : ""}
                </li>
              );
            })}
            {!fichaLinhas(produto).length ? <li>Nenhum insumo cadastrado</li> : null}
          </ul>
          <p className="mt-3">{produto.precoVenda ? `Venda ${brl.format(produto.precoVenda)}` : "Preço não informado"}</p>
          {produto.descricao ? <p className="mt-2 text-mute">{produto.descricao}</p> : null}
        </Card>
        <Card className="p-4 text-[13px]">
          <p className="kicker">Fotos</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {produto.imagens.length
              ? produto.imagens.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={src.slice(0, 24)} src={src} alt="" className="h-20 w-20 rounded-md object-cover" />
                ))
              : <p className="text-mute">Nenhuma foto</p>}
          </div>
          <p className="kicker mt-4">Estoque por variação</p>
          <p className="mb-2 text-[11px] text-faint">Produzido menos o que já foi faturado (venda).</p>
          <ul className="mt-1 space-y-1 text-mute">
            {estoque.map((s) => (
              <li key={`${s.tamanho}-${s.cor}`} className="flex justify-between gap-3">
                <span>{[s.tamanho, s.cor].filter(Boolean).join(" · ") || "Sem grade"}</span>
                <span className="tabular-nums text-ink">{nInt.format(s.saldo)} pç</span>
              </li>
            ))}
            {!estoque.length ? <li>Nenhuma variação</li> : null}
          </ul>
        </Card>
      </div>
      <ProdutoForm initial={produto} voltar={voltar} />
    </div>
  );
}
