"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Field, Input, PageHeader, Select, DataTable, Td } from "@/components/ui";
import { brl, competenciaAtual, formatDate, saldoConta, statusConta, todayISO } from "@/lib/format";
import { useStore } from "@/lib/store/store";

export default function ReceberPage() {
  const { state, dispatch, isAdmin, currentUser } = useStore();
  const [payId, setPayId] = useState<string | null>(null);
  const [payValor, setPayValor] = useState("");
  const [filtro, setFiltro] = useState("todos");

  const naoFaturadas = state.ops.filter(
    (o) => o.status !== "cancelada" && !state.faturamentos.some((f) => f.opId === o.id),
  );

  const rows = useMemo(() => {
    return state.contasReceber.filter((c) => {
      const st = statusConta(c.valor, c.recebimentos);
      if (filtro !== "todos" && st !== filtro) return false;
      return true;
    });
  }, [state.contasReceber, filtro]);

  if (!isAdmin) return <p className="p-6 text-sm text-mute">Acesso restrito.</p>;

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Financeiro"
        title="Faturar e receber"
        description="A OP não vira receita sozinha. Fature internamente para gerar a conta a receber."
      />

      <div className="surface rounded-md p-4">
        <p className="kicker mb-3">OPs aguardando faturamento interno</p>
        <div className="divide-y divide-line">
          {naoFaturadas.length === 0 ? <p className="text-[13px] text-faint">Nada pendente.</p> : null}
          {naoFaturadas.map((op) => (
            <div key={op.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
              <Link href={`/ops/${op.id}`} className="shrink-0 font-mono text-[13px] text-sky hover:underline">
                {op.numero}
              </Link>
              <span className="ml-auto tabular-nums text-[13px] text-mute">
                {brl.format(op.quantidade * op.precoUnitario)}
              </span>
              <Button
                size="sm"
                onClick={() =>
                  dispatch({
                    type: "FATURAR_OP",
                    opId: op.id,
                    vencimento: todayISO(),
                    competencia: competenciaAtual(),
                  })
                }
              >
                Faturar
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="w-44">
        <option value="todos">Todos</option>
        <option value="aberto">Em aberto</option>
        <option value="parcial">Parcial</option>
        <option value="quitado">Quitado</option>
      </Select>

      <DataTable headers={["Descrição", "Cliente", "Vencimento", "Valor", "Saldo", "Status"]}>
        {rows.map((c) => {
          const st = statusConta(c.valor, c.recebimentos);
          const saldo = saldoConta(c.valor, c.recebimentos);
          const cli = state.clientes.find((x) => x.id === c.clienteId);
          return (
            <tr key={c.id}>
              <Td>{c.descricao}</Td>
              <Td>{cli?.nome}</Td>
              <Td>{formatDate(c.vencimento)}</Td>
              <Td>{brl.format(c.valor)}</Td>
              <Td>{brl.format(saldo)}</Td>
              <Td>
                <div className="flex items-center justify-end gap-2">
                  <Badge tone={st === "quitado" ? "mint" : st === "parcial" ? "amber" : "sky"}>{st}</Badge>
                  {saldo > 0 ? (
                    <Button size="sm" variant="ghost" onClick={() => { setPayId(c.id); setPayValor(String(saldo)); }}>
                      Receber
                    </Button>
                  ) : (
                    c.recebimentos.filter((p) => !p.estornado).slice(-1).map((p) => (
                      <Button
                        key={p.id}
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          dispatch({
                            type: "ESTORNAR_RECEBIMENTO",
                            contaId: c.id,
                            recebimentoId: p.id,
                            motivo: "Estorno total",
                            autor: currentUser.nome,
                          })
                        }
                      >
                        Estornar
                      </Button>
                    ))
                  )}
                </div>
              </Td>
            </tr>
          );
        })}
      </DataTable>

      {payId ? (
        <form
          className="flex flex-wrap items-end gap-2 surface rounded-md p-3"
          onSubmit={(e) => {
            e.preventDefault();
            dispatch({ type: "RECEBER", contaId: payId, valor: Number(payValor) || 0, data: todayISO() });
            setPayId(null);
          }}
        >
          <Field label="Valor do recebimento">
            <Input value={payValor} onChange={(e) => setPayValor(e.target.value)} />
          </Field>
          <Button type="submit">Alocar recebimento</Button>
          <Button type="button" variant="ghost" onClick={() => setPayId(null)}>Fechar</Button>
        </form>
      ) : null}
    </div>
  );
}
