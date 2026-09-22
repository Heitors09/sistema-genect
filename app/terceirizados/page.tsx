"use client";

import Link from "next/link";
import { brl, nInt } from "@/lib/format";
import { Card, DataTable, PageHeader, Td } from "@/components/ui";
import { TerceirizadoForm } from "@/components/terceirizados/terceirizado-form";
import { useStore } from "@/lib/store/store";

export default function TerceirizadosPage() {
  const { state, currentUser, isAdmin } = useStore();
  const list = isAdmin
    ? state.terceirizados
    : state.terceirizados.filter((t) => t.id === currentUser.terceirizadoId);

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Produção"
        title="Terceirizados"
        description="Terceirizados, valor por peça e acerto de pagamento a partir das OPs atribuídas."
      />
      {isAdmin ? (
        <Card className="p-4">
          <p className="kicker mb-3">Novo terceirizado</p>
          <TerceirizadoForm />
        </Card>
      ) : null}
      <div className="grid gap-2 md:grid-cols-3">
        {list.map((t) => {
          const ops = state.ops.filter((o) => o.terceirizadoIds.includes(t.id) && o.status !== "cancelada");
          const pecas = ops.reduce((a, o) => a + (o.quantidadeProduzida || 0), 0);
          const aReceber = pecas * t.valorPorPeca;
          return (
            <Card key={t.id} className="p-4">
              <p className="text-[15px] font-semibold tracking-[-0.02em]">{t.nome}</p>
              {t.especialidade ? (
                <p className="mt-0.5 text-[12px] text-mute">{t.especialidade}</p>
              ) : null}
              <p className="mt-2 text-[12px] text-faint">{ops.length} OPs · {nInt.format(pecas)} pç</p>
              {t.valorPorPeca > 0 ? (
                <>
                  <p className="stat-value mt-2 text-mint">{brl.format(aReceber)}</p>
                  <p className="text-[11px] text-faint">{brl.format(t.valorPorPeca)} / peça</p>
                </>
              ) : (
                <p className="mt-2 text-[12px] text-faint">Valor por peça não informado</p>
              )}
            </Card>
          );
        })}
      </div>
      <DataTable headers={["Terceirizado", "OP", "Peças", "Serviço", "Acerto"]}>
        {state.ops
          .filter((o) => (isAdmin ? o.terceirizadoIds.length : o.terceirizadoIds.includes(currentUser.terceirizadoId ?? "")))
          .map((op) => {
            const t = state.terceirizados.find((x) => op.terceirizadoIds.includes(x.id));
            const acerto = state.contasPagar.find((c) => c.origem === "faccao" && c.origemId === op.id);
            return (
              <tr key={op.id}>
                <Td>{t?.nome}</Td>
                <Td mono>
                  <Link href={`/ops/${op.id}`} className="text-sky">{op.numero}</Link>
                </Td>
                <Td>{op.quantidadeProduzida || op.quantidade}</Td>
                <Td>{brl.format((op.quantidadeProduzida || op.quantidade) * op.valorServicoPorPeca)}</Td>
                <Td>{acerto ? "Gerado" : "Pendente"}</Td>
              </tr>
            );
          })}
      </DataTable>
    </div>
  );
}
