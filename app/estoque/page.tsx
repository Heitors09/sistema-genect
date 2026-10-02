"use client";

import { useState } from "react";
import Link from "next/link";
import { EntradaInsumoModal } from "@/components/insumos/entrada-form";
import { Button, DataTable, PageHeader, Td } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { useStore } from "@/lib/store/store";

export default function EstoquePage() {
  const { state, isAdmin } = useStore();
  const [open, setOpen] = useState(false);
  const compras = state.movimentos.filter((m) => m.tipo === "entrada");

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="Compras"
        actions={isAdmin ? <Button onClick={() => setOpen(true)}>Lançar entrada</Button> : null}
      />

      <DataTable headers={["Data", "Insumo", "Fornecedor", "NF", "Qtd"]}>
        {compras.map((m) => {
          const ins = state.insumos.find((i) => i.id === m.insumoId);
          const lote = state.lotes.find((l) => l.id === m.loteId);
          const fornecedor = state.fornecedores.find((f) => f.id === lote?.fornecedorId);
          return (
            <tr key={m.id}>
              <Td>{formatDate(m.data)}</Td>
              <Td>
                {ins ? (
                  <Link href={`/insumos/${ins.id}`} className="text-sky hover:underline">
                    {ins.codigo} · {ins.descricao}
                  </Link>
                ) : "—"}
              </Td>
              <Td>{fornecedor?.razaoSocial ?? "—"}</Td>
              <Td>{m.nf || "—"}</Td>
              <Td>
                {m.quantidade.toLocaleString("pt-BR")} {ins?.unidadeCompra}
              </Td>
            </tr>
          );
        })}
      </DataTable>

      <EntradaInsumoModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
