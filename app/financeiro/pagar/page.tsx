"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Field, Input, PageHeader, Select, DataTable, Td } from "@/components/ui";
import { brl, formatDate, origemLabel, saldoConta, statusConta, todayISO, uid } from "@/lib/format";
import type { OrigemFinanceira } from "@/lib/types";
import { useStore } from "@/lib/store/store";

export default function PagarPage() {
  const { state, dispatch, isAdmin, currentUser } = useStore();
  const [filtro, setFiltro] = useState("todos");
  const [empresaId, setEmpresaId] = useState(state.empresas[0]?.id ?? "");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVenc] = useState(todayISO());
  const [competencia, setComp] = useState(todayISO().slice(0, 7));
  const [payId, setPayId] = useState<string | null>(null);
  const [payValor, setPayValor] = useState("");

  const rows = useMemo(() => {
    return state.contasPagar.filter((c) => {
      const st = statusConta(c.valor, c.pagamentos);
      if (filtro !== "todos" && st !== filtro) return false;
      return true;
    });
  }, [state.contasPagar, filtro]);

  if (!isAdmin) return <p className="p-6 text-sm text-mute">Acesso restrito.</p>;

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Financeiro"
        title="Contas a pagar"
        description="Lançamento manual ou gerado do acerto de terceirizado. Pagamentos parciais; estorno somente total."
      />
      <form
        className="grid gap-3 surface rounded-md p-4 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          dispatch({
            type: "SAVE_CONTA_PAGAR",
            conta: {
              id: uid("cp"),
              empresaId,
              descricao,
              origem: "manual" as OrigemFinanceira,
              valor: Number(valor) || 0,
              vencimento,
              competencia,
              pagamentos: [],
            },
          });
          setDescricao("");
          setValor("");
        }}
      >
        <Field label="Empresa">
          <Select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
            {state.empresas.filter((e) => e.ativa).map((e) => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </Select>
        </Field>
        <Field label="Descrição">
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
        </Field>
        <Field label="Valor">
          <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} required />
        </Field>
        <Field label="Vencimento">
          <Input type="date" value={vencimento} onChange={(e) => setVenc(e.target.value)} />
        </Field>
        <Field label="Competência">
          <Input value={competencia} onChange={(e) => setComp(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <Button type="submit">Lançar conta</Button>
        </div>
      </form>

      <Select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="w-44">
        <option value="todos">Todos</option>
        <option value="aberto">Em aberto</option>
        <option value="parcial">Parcial</option>
        <option value="quitado">Quitado</option>
      </Select>

      <DataTable headers={["Descrição", "Origem", "Vencimento", "Competência", "Valor", "Saldo", "Status"]}>
        {rows.map((c) => {
          const st = statusConta(c.valor, c.pagamentos);
          const saldo = saldoConta(c.valor, c.pagamentos);
          return (
            <tr key={c.id}>
              <Td>{c.descricao}</Td>
              <Td>{origemLabel[c.origem]}</Td>
              <Td>{formatDate(c.vencimento)}</Td>
              <Td>{c.competencia}</Td>
              <Td>{brl.format(c.valor)}</Td>
              <Td>{brl.format(saldo)}</Td>
              <Td>
                <div className="flex items-center justify-end gap-2">
                  <Badge tone={st === "quitado" ? "mint" : st === "parcial" ? "amber" : "rose"}>{st}</Badge>
                  {saldo > 0 ? (
                    <Button size="sm" variant="ghost" onClick={() => { setPayId(c.id); setPayValor(String(saldo)); }}>
                      Pagar
                    </Button>
                  ) : (
                    c.pagamentos.filter((p) => !p.estornado).slice(-1).map((p) => (
                      <Button
                        key={p.id}
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          dispatch({
                            type: "ESTORNAR_PAGAMENTO",
                            contaId: c.id,
                            pagamentoId: p.id,
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
            dispatch({ type: "PAGAR", contaId: payId, valor: Number(payValor) || 0, data: todayISO() });
            setPayId(null);
          }}
        >
          <Field label="Valor do pagamento">
            <Input value={payValor} onChange={(e) => setPayValor(e.target.value)} />
          </Field>
          <Button type="submit">Confirmar pagamento</Button>
          <Button type="button" variant="ghost" onClick={() => setPayId(null)}>Fechar</Button>
        </form>
      ) : null}
    </div>
  );
}
