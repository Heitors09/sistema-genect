"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, ButtonLink, DataTable, Input, PageHeader, Select, Td } from "@/components/ui";
import { brl, formatDate, nInt, produtoLabel, statusOpLabel, tipoNegocioLabel } from "@/lib/format";
import { opStageLabels } from "@/lib/op-flow";
import { useLookups, useStore } from "@/lib/store/store";

export default function OpsPage() {
  const { state, isAdmin, currentUser } = useStore();
  const { empresa, cliente, produto, stage } = useLookups();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("todas");

  const rows = useMemo(() => {
    return state.ops.filter((op) => {
      if (!isAdmin && currentUser.terceirizadoId && !op.terceirizadoIds.includes(currentUser.terceirizadoId)) {
        return false;
      }
      if (status !== "todas" && op.status !== status) return false;
      const prod = produto(op.produtoId);
      const blob = `${op.numero} ${prod?.nome} ${prod?.referencia}`.toLowerCase();
      return blob.includes(q.toLowerCase());
    });
  }, [state.ops, isAdmin, currentUser, status, q, produto]);

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Produção"
        title="Ordens de produção"
        description="Serviço de costura é o caminho mais comum. Fabricação usa a ficha para reservar insumos e custo."
        actions={
          isAdmin ? <ButtonLink href="/ops/nova">Nova OP</ButtonLink> : null
        }
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar OP, produto ou referência"
          className="w-full sm:max-w-xs"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full sm:w-44">
          <option value="todas">Todos os status</option>
          <option value="aberta">Aberta</option>
          <option value="em_producao">Em produção</option>
          <option value="revisao">Revisão</option>
          <option value="finalizada">Finalizada</option>
          <option value="cancelada">Cancelada</option>
        </Select>
      </div>
      <DataTable
        headers={["OP", "Entrada", "Produto", "Cor", "Cliente", "Qtd", "Etapa", "Status", "Valor"]}
      >
        {rows.map((op) => {
          const prod = produto(op.produtoId);
          return (
            <tr key={op.id} className="hover:bg-elevated/50">
              <Td mono>
                <Link href={`/ops/${op.id}`} className="text-sky hover:underline">
                  {op.numero}
                </Link>
                {op.parentOpId ? <span className="ml-1 text-[10px] text-violet">filha</span> : null}
                <p className="mt-0.5 text-[10px] text-faint">{tipoNegocioLabel[op.tipoNegocio]}</p>
              </Td>
              <Td>{formatDate(op.dataEntrada)}</Td>
              <Td>{prod ? produtoLabel(prod.nome, prod.referencia) : "—"}</Td>
              <Td>{op.cor || "—"}</Td>
              <Td>{cliente(op.clienteId)?.nome}</Td>
              <Td>
                {nInt.format(op.quantidadeProduzida)}/{nInt.format(op.quantidade)}
              </Td>
              <Td>{opStageLabels(op, (id) => stage(id)?.label)}</Td>
              <Td>
                <Badge
                  tone={
                    op.status === "finalizada"
                      ? "mint"
                      : op.status === "cancelada"
                        ? "rose"
                        : op.status === "revisao"
                          ? "amber"
                          : "sky"
                  }
                >
                  {statusOpLabel[op.status]}
                </Badge>
              </Td>
              <Td>{brl.format(op.quantidade * op.precoUnitario)}</Td>
            </tr>
          );
        })}
      </DataTable>
      <p className="text-[11px] text-faint">Empresa ativa nas OPs listadas: valores previstos, não faturados automaticamente. {empresa("emp-genect")?.nome}</p>
    </div>
  );
}
