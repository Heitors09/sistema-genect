"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Badge, ButtonLink, DataTable, PageHeader, Td } from "@/components/ui";
import { brl, nInt, produtoLabel, tipoNegocioLabel } from "@/lib/format";
import { estoqueDoProduto } from "@/lib/estoque-produto";
import { fichaLinhas } from "@/lib/ficha";
import { useStore } from "@/lib/store/store";

export default function ProdutosPage() {
  const { state, isAdmin } = useStore();
  const faturados = useMemo(() => new Set(state.faturamentos.map((f) => f.opId)), [state.faturamentos]);

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Produtos"
        title="Cadastro e estoque de produtos"
        description="Grade tamanho + cor vira estoque do que foi produzido. A venda gera a conta a receber."
        actions={
          isAdmin ? <ButtonLink href="/produtos/novo">Novo produto</ButtonLink> : null
        }
      />
      <DataTable headers={["Número", "Modelo", "Tipo", "Grade", "Estoque", "Insumos", "Venda"]}>
        {state.produtos.map((p) => {
          const skus = estoqueDoProduto(p, state.ops, faturados);
          const saldo = skus.reduce((a, s) => a + s.saldo, 0);
          return (
            <tr key={p.id}>
              <Td mono>
                <Link href={`/produtos/${p.id}`} className="text-sky hover:underline">
                  {p.referencia}
                </Link>
              </Td>
              <Td>
                <div>
                  {produtoLabel(p.nome)}
                  {p.categoria ? <p className="text-[11px] text-faint">{p.categoria}</p> : null}
                </div>
              </Td>
              <Td>
                <Badge tone={p.tipoNegocio === "fabricacao" ? "amber" : "violet"}>
                  {tipoNegocioLabel[p.tipoNegocio]}
                </Badge>
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {p.variacoes.length
                    ? p.variacoes.map((v) => (
                        <Badge key={v.tamanho}>{v.tamanho} · {v.cores.length || "—"}</Badge>
                      ))
                    : <span className="text-faint">—</span>}
                </div>
              </Td>
              <Td>{saldo ? `${nInt.format(saldo)} pç` : "—"}</Td>
              <Td>{fichaLinhas(p).length ? `${fichaLinhas(p).length} itens` : "—"}</Td>
              <Td>{p.precoVenda ? brl.format(p.precoVenda) : "—"}</Td>
            </tr>
          );
        })}
      </DataTable>
    </div>
  );
}
