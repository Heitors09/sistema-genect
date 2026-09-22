"use client";

import Link from "next/link";
import { Badge, ButtonLink, DataTable, PageHeader, Td } from "@/components/ui";
import { brl, produtoLabel, tipoNegocioLabel } from "@/lib/format";
import { fichaLinhas } from "@/lib/ficha";
import { useStore } from "@/lib/store/store";

export default function ProdutosPage() {
  const { state, isAdmin } = useStore();

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Produtos"
        title="Cadastro e estoque de produtos"
        description="Serviço de costura não exige ficha completa. Fabricação própria usa os insumos para custo."
        actions={
          isAdmin ? <ButtonLink href="/produtos/novo">Novo produto</ButtonLink> : null
        }
      />
      <DataTable headers={["Número", "Modelo", "Tipo", "Cor", "Grade", "Insumos", "Venda"]}>
        {state.produtos.map((p) => (
          <tr key={p.id} className="hover:bg-elevated/50">
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
                {p.cores.map((c) => (
                  <Badge key={c} tone="violet">{c}</Badge>
                ))}
              </div>
            </Td>
            <Td>
              <div className="flex flex-wrap gap-1">
                {p.tamanhos.length ? p.tamanhos.map((t) => (
                  <Badge key={t}>{t}</Badge>
                )) : <span className="text-faint">—</span>}
              </div>
            </Td>
            <Td>{fichaLinhas(p).length ? `${fichaLinhas(p).length} itens` : "—"}</Td>
            <Td>{brl.format(p.precoVenda)}</Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
