"use client";

import Link from "next/link";
import { Badge, ButtonLink, DataTable, PageHeader, Td } from "@/components/ui";
import { labelCategoria } from "@/lib/format";
import { useStore } from "@/lib/store/store";

export default function InsumosPage() {
  const { state, isAdmin } = useStore();

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Insumos"
        title="Cadastro de insumos"
        description="Código, unidades e mínimo. O saldo sobe em Compras."
        actions={
          isAdmin ? <ButtonLink href="/insumos/novo">Novo insumo</ButtonLink> : null
        }
      />
      <DataTable headers={["Código", "Descrição", "Tipo", "Estoque", "Reservado", "Mínimo"]}>
        {state.insumos.map((i) => {
          const disp = i.estoqueAtual - i.reservado;
          const baixo = disp <= i.estoqueMinimo;
          return (
            <tr key={i.id}>
              <Td mono>
                <Link href={`/insumos/${i.id}`} className="text-sky hover:underline">
                  {i.codigo}
                </Link>
              </Td>
              <Td>{i.descricao}</Td>
              <Td>
                <Badge>{labelCategoria(i.categoria)}</Badge>
              </Td>
              <Td>
                {disp.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} {i.unidadeCompra}
              </Td>
              <Td>
                {i.reservado.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} {i.unidadeCompra}
              </Td>
              <Td>
                {baixo ? (
                  isAdmin ? (
                    <Link href="/estoque" className="text-rose hover:underline">
                      Ponto de pedido
                    </Link>
                  ) : (
                    <span className="text-rose">Ponto de pedido</span>
                  )
                ) : (
                  i.estoqueMinimo
                )}
              </Td>
            </tr>
          );
        })}
      </DataTable>
    </div>
  );
}
