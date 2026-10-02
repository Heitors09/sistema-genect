"use client";

import { useState } from "react";
import Link from "next/link";
import { brl, competenciaAtual, nInt, uid } from "@/lib/format";
import { readAsDataUrl } from "@/lib/files";
import { servicosDe, valorServicosOp } from "@/lib/migrate";
import { saldoConta } from "@/lib/format";
import { Badge, Button, Card, DataTable, FileInput, PageHeader, Td } from "@/components/ui";
import { TerceirizadoForm } from "@/components/terceirizados/terceirizado-form";
import { useStore } from "@/lib/store/store";

export default function TerceirizadosPage() {
  const { state, currentUser, isAdmin, dispatch } = useStore();
  const [comp, setComp] = useState(competenciaAtual());
  const list = isAdmin
    ? state.terceirizados
    : state.terceirizados.filter((t) => t.id === currentUser.terceirizadoId);

  const minhas = state.ops.filter((o) =>
    currentUser.terceirizadoId ? o.terceirizadoIds.includes(currentUser.terceirizadoId) : false,
  );

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker={isAdmin ? "Produção" : "Financeiro"}
        title={isAdmin ? "Terceirizados" : "Meus valores"}
        description={
          isAdmin
            ? "Serviços por peça, gasto no mês e o que ainda é devido."
            : "Quanto a receber, pendências mês a mês e recibos."
        }
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
          const contas = state.contasPagar.filter(
            (c) => c.origem === "faccao" && c.competencia === comp && ops.some((o) => c.origemId?.startsWith(o.id)),
          );
          const gasto = contas.reduce((a, c) => a + c.valor, 0);
          const devido = contas.reduce((a, c) => a + saldoConta(c.valor, c.pagamentos), 0);
          return (
            <Card key={t.id} className="p-4">
              <p className="text-[15px] font-semibold tracking-[-0.02em]">{t.nome}</p>
              <p className="mt-0.5 text-[12px] text-mute">
                {servicosDe(t).map((s) => s.nome).join(" · ") || "Sem serviço"}
              </p>
              <p className="mt-2 text-[12px] text-faint">{ops.length} OPs · {nInt.format(ops.reduce((a, o) => a + o.quantidade, 0))} pç</p>
              <p className="stat-value mt-2 text-mint">{brl.format(gasto)}</p>
              <p className="text-[11px] text-faint">Gasto em {comp} · devido {brl.format(devido)}</p>
            </Card>
          );
        })}
      </div>

      {!isAdmin ? (
        <Card className="p-4">
          <p className="kicker mb-3">Recibos</p>
          <FileInput
            accept="image/*,application/pdf"
            className="mb-3"
            emptyLabel="Nenhum recibo selecionado"
            actionLabel="Escolher"
            onFiles={async (files) => {
              const file = files?.[0];
              if (!file || !currentUser.terceirizadoId) return;
              dispatch({
                type: "ADD_RECIBO",
                recibo: {
                  id: uid("rb"),
                  terceirizadoId: currentUser.terceirizadoId,
                  competencia: comp,
                  nome: file.name,
                  dataUrl: await readAsDataUrl(file),
                },
              });
            }}
          />
          {state.recibos
            .filter((r) => r.terceirizadoId === currentUser.terceirizadoId)
            .map((r) => (
              <p key={r.id} className="text-[12px] text-mute">
                {r.competencia} · {r.nome}
              </p>
            ))}
          <p className="mt-3 text-[12px] text-faint">
            {minhas.length} OPs na sua lista — abra pelo menu Minhas OPs. A ficha e a pendência ficam no detalhe.
          </p>
        </Card>
      ) : (
        <DataTable headers={["Terceirizado", "OP", "Peças", "Serviço", "Acerto"]}>
          {state.ops
            .filter((o) => o.terceirizadoIds.length)
            .map((op) => {
              const t = state.terceirizados.find((x) => op.terceirizadoIds.includes(x.id));
              const acerto = state.contasPagar.find((c) => c.origem === "faccao" && c.origemId?.startsWith(op.id));
              return (
                <tr key={op.id}>
                  <Td>{t?.nome}</Td>
                  <Td mono>
                    <Link href={`/ops/${op.id}`} className="text-sky">{op.numero}</Link>
                  </Td>
                  <Td>{op.quantidadeProduzida || op.quantidade}</Td>
                  <Td>{brl.format(valorServicosOp(op, state.terceirizados))}</Td>
                  <Td>{acerto ? <Badge tone="mint">Gerado</Badge> : "Pendente"}</Td>
                </tr>
              );
            })}
        </DataTable>
      )}

      <div className="flex items-center gap-2 text-[12px] text-mute">
        Competência
        <input
          type="month"
          value={comp}
          onChange={(e) => setComp(e.target.value)}
          className="well h-8 rounded-md border border-line px-2"
        />
      </div>
    </div>
  );
}
