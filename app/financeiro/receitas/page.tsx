"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, DateInput, Field, Input, PageHeader, Select, DataTable, Td } from "@/components/ui";
import { CATEGORIA_IDS } from "@/lib/dre-defaults";
import { brl, competenciaAtual, formatDate, saldoConta, statusConta, todayISO, uid } from "@/lib/format";
import { pecasOpPorSku, resumoPecasSku } from "@/lib/estoque-produto";
import { useStore } from "@/lib/store/store";

export default function ReceitasPage() {
  const { state, dispatch, isAdmin, currentUser } = useStore();
  const padraoRec =
    state.categoriasFinanceiras.find((c) => c.padraoReceber && c.ativa)?.id ??
    state.categoriasFinanceiras.find((c) => c.padraoVendas && c.ativa)?.id ??
    CATEGORIA_IDS.receitaVendas;
  const [payId, setPayId] = useState<string | null>(null);
  const [payValor, setPayValor] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [empresaId, setEmpresaId] = useState(state.empresas[0]?.id ?? "");
  const [clienteId, setClienteId] = useState(state.clientes[0]?.id ?? "");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVenc] = useState(todayISO());
  const [competencia, setComp] = useState(competenciaAtual());
  const [categoriaId, setCategoriaId] = useState<string>(padraoRec);

  const categoriasReceita = useMemo(
    () => state.categoriasFinanceiras.filter((c) => c.ativa && c.tipo === "receita"),
    [state.categoriasFinanceiras],
  );

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
        title="Receita de vendas"
        description="Faturamento de OPs e lançamentos manuais por categoria. Padrão de vendas/receber vem das categorias financeiras."
      />

      <div className="surface rounded-md p-4">
        <p className="kicker mb-3">OPs aguardando faturamento</p>
        <div className="divide-y divide-line">
          {naoFaturadas.length === 0 ? <p className="text-[13px] text-faint">Nada pendente.</p> : null}
          {naoFaturadas.map((op) => {
            const prod = state.produtos.find((p) => p.id === op.produtoId);
            const cli = state.clientes.find((c) => c.id === op.clienteId);
            const pecas = op.quantidadeProduzida || op.quantidade;
            const skus = pecasOpPorSku(op);
            return (
              <div key={op.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <Link href={`/ops/${op.id}`} className="shrink-0 font-mono text-[13px] text-sky hover:underline">
                  {op.numero}
                </Link>
                <span className="min-w-0 truncate text-[12px] text-mute">
                  {cli?.nome}
                  {prod ? ` · ${prod.referencia}` : ""}
                  {resumoPecasSku(skus) ? ` · ${resumoPecasSku(skus)}` : ""}
                </span>
                <span className="ml-auto tabular-nums text-[13px] text-mute">
                  {brl.format(pecas * (op.precoUnitario || 0))}
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
            );
          })}
        </div>
      </div>

      <form
        className="grid gap-3 surface rounded-md p-4 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          const cat = state.categoriasFinanceiras.find((c) => c.id === categoriaId);
          dispatch({
            type: "SAVE_CONTA_RECEBER",
            conta: {
              id: uid("cr"),
              empresaId,
              clienteId,
              descricao,
              origem: "manual",
              categoriaId,
              contaPlanoId: cat?.contaPlanoId,
              valor: Number(valor) || 0,
              vencimento,
              competencia,
              recebimentos: [],
            },
          });
          setDescricao("");
          setValor("");
        }}
      >
        <p className="kicker sm:col-span-3">Lançamento manual de receita</p>
        <Field label="Empresa">
          <Select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
            {state.empresas.filter((e) => e.ativa).map((e) => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </Select>
        </Field>
        <Field label="Cliente">
          <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            {state.clientes.filter((c) => c.ativo).map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </Select>
        </Field>
        <Field label="Categoria">
          <Select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            {categoriasReceita.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
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
          <DateInput value={vencimento} onChange={(e) => setVenc(e.target.value)} />
        </Field>
        <Field label="Competência">
          <Input value={competencia} onChange={(e) => setComp(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <Button type="submit">Lançar receita</Button>
        </div>
      </form>

      <Select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="w-44">
        <option value="todos">Todos</option>
        <option value="aberto">Em aberto</option>
        <option value="parcial">Parcial</option>
        <option value="quitado">Quitado</option>
      </Select>

      <DataTable headers={["Descrição", "Cliente", "Categoria", "Vencimento", "Valor", "Saldo", "Status"]}>
        {rows.map((c) => {
          const st = statusConta(c.valor, c.recebimentos);
          const saldo = saldoConta(c.valor, c.recebimentos);
          const cli = state.clientes.find((x) => x.id === c.clienteId);
          const cat = state.categoriasFinanceiras.find((p) => p.id === c.categoriaId);
          return (
            <tr key={c.id}>
              <Td>{c.descricao}</Td>
              <Td>{cli?.nome}</Td>
              <Td className="text-mute">{cat?.nome ?? "—"}</Td>
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
