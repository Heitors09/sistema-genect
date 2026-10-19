"use client";

import { useMemo, useState } from "react";
import { Badge, Button, DateInput, Field, Input, PageHeader, Select, DataTable, Td } from "@/components/ui";
import { CATEGORIA_IDS } from "@/lib/dre-defaults";
import { brl, formatDate, origemLabel, saldoConta, statusConta, todayISO, uid } from "@/lib/format";
import type { OrigemFinanceira } from "@/lib/types";
import { useStore } from "@/lib/store/store";

export default function DespesasPage() {
  const { state, dispatch, isAdmin, currentUser } = useStore();
  const padraoPagar =
    state.categoriasFinanceiras.find((c) => c.padraoPagar && c.ativa)?.id ?? CATEGORIA_IDS.admin;
  const [filtro, setFiltro] = useState("todos");
  const [empresaId, setEmpresaId] = useState(state.empresas[0]?.id ?? "");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVenc] = useState(todayISO());
  const [competencia, setComp] = useState(todayISO().slice(0, 7));
  const [categoriaId, setCategoriaId] = useState<string>(padraoPagar);
  const [programada, setProgramada] = useState(false);
  const [recorrenciaDia, setRecDia] = useState("10");
  const [payId, setPayId] = useState<string | null>(null);
  const [payValor, setPayValor] = useState("");

  const [folhaEmp, setFolhaEmp] = useState(state.empresas[0]?.id ?? "");
  const [folhaNome, setFolhaNome] = useState("");
  const [folhaCargo, setFolhaCargo] = useState("");
  const [folhaValor, setFolhaValor] = useState("");
  const [folhaVenc, setFolhaVenc] = useState(todayISO());
  const [folhaComp, setFolhaComp] = useState(todayISO().slice(0, 7));

  const categoriasDespesa = useMemo(
    () =>
      state.categoriasFinanceiras.filter(
        (c) => c.ativa && c.tipo === "despesa_custo",
      ),
    [state.categoriasFinanceiras],
  );

  const rows = useMemo(() => {
    return state.contasPagar.filter((c) => {
      if (c.origem === "folha") return false;
      const st = statusConta(c.valor, c.pagamentos);
      if (filtro !== "todos" && st !== filtro) return false;
      return true;
    });
  }, [state.contasPagar, filtro]);

  const folhas = useMemo(
    () => state.folhasPagamento.filter((f) => f.empresaId === folhaEmp || !folhaEmp),
    [state.folhasPagamento, folhaEmp],
  );

  if (!isAdmin) return <p className="p-6 text-sm text-mute">Acesso restrito.</p>;

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Financeiro"
        title="Despesas"
        description="Lançamentos a pagar por categoria financeira. Programadas e folha em seções próprias."
      />

      <form
        className="grid gap-3 surface rounded-md p-4 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          const cat = state.categoriasFinanceiras.find((c) => c.id === categoriaId);
          dispatch({
            type: "SAVE_CONTA_PAGAR",
            conta: {
              id: uid("cp"),
              empresaId,
              descricao,
              origem: "manual" as OrigemFinanceira,
              categoriaId,
              contaPlanoId: cat?.contaPlanoId,
              programada,
              recorrenciaDia: programada ? Number(recorrenciaDia) || 1 : undefined,
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
        <p className="kicker sm:col-span-3">Nova despesa</p>
        <Field label="Empresa">
          <Select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
            {state.empresas.filter((e) => e.ativa).map((e) => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </Select>
        </Field>
        <Field label="Categoria">
          <Select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            {categoriasDespesa.map((c) => (
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
        <Field label="Programada">
          <Select value={programada ? "sim" : "nao"} onChange={(e) => setProgramada(e.target.value === "sim")}>
            <option value="nao">Não</option>
            <option value="sim">Sim (recorrente)</option>
          </Select>
        </Field>
        {programada ? (
          <Field label="Dia do mês">
            <Input type="number" min={1} max={28} value={recorrenciaDia} onChange={(e) => setRecDia(e.target.value)} />
          </Field>
        ) : (
          <div />
        )}
        <div className="flex items-end">
          <Button type="submit">Lançar despesa</Button>
        </div>
      </form>

      <Select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="w-44">
        <option value="todos">Todos</option>
        <option value="aberto">Em aberto</option>
        <option value="parcial">Parcial</option>
        <option value="quitado">Quitado</option>
      </Select>

      <DataTable headers={["Descrição", "Categoria", "Origem", "Venc.", "Competência", "Valor", "Saldo", "Status"]}>
        {rows.map((c) => {
          const st = statusConta(c.valor, c.pagamentos);
          const saldo = saldoConta(c.valor, c.pagamentos);
          const cat = state.categoriasFinanceiras.find((p) => p.id === c.categoriaId);
          return (
            <tr key={c.id}>
              <Td>
                <span>{c.descricao}</span>
                {c.programada ? (
                  <span className="ml-1.5 text-[10px] text-amber">prog. dia {c.recorrenciaDia ?? "—"}</span>
                ) : null}
              </Td>
              <Td className="text-mute">{cat?.nome ?? "—"}</Td>
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

      <div className="surface rounded-md p-4">
        <p className="kicker mb-3">Folha de pagamento</p>
        <form
          className="mb-4 grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            dispatch({
              type: "SAVE_FOLHA",
              folha: {
                id: uid("folha"),
                empresaId: folhaEmp,
                competencia: folhaComp,
                colaborador: folhaNome,
                cargo: folhaCargo || undefined,
                valor: Number(folhaValor) || 0,
                vencimento: folhaVenc,
                pago: false,
              },
            });
            setFolhaNome("");
            setFolhaCargo("");
            setFolhaValor("");
          }}
        >
          <Field label="Empresa">
            <Select value={folhaEmp} onChange={(e) => setFolhaEmp(e.target.value)}>
              {state.empresas.filter((e) => e.ativa).map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </Select>
          </Field>
          <Field label="Colaborador">
            <Input value={folhaNome} onChange={(e) => setFolhaNome(e.target.value)} required />
          </Field>
          <Field label="Cargo">
            <Input value={folhaCargo} onChange={(e) => setFolhaCargo(e.target.value)} />
          </Field>
          <Field label="Valor">
            <Input type="number" step="0.01" value={folhaValor} onChange={(e) => setFolhaValor(e.target.value)} required />
          </Field>
          <Field label="Vencimento">
            <DateInput value={folhaVenc} onChange={(e) => setFolhaVenc(e.target.value)} />
          </Field>
          <Field label="Competência">
            <Input value={folhaComp} onChange={(e) => setFolhaComp(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button type="submit" variant="soft">Incluir na folha</Button>
          </div>
        </form>

        <DataTable headers={["Colaborador", "Cargo", "Competência", "Vencimento", "Valor", "Status"]}>
          {folhas.map((f) => (
            <tr key={f.id}>
              <Td>{f.colaborador}</Td>
              <Td className="text-mute">{f.cargo || "—"}</Td>
              <Td>{f.competencia}</Td>
              <Td>{formatDate(f.vencimento)}</Td>
              <Td>{brl.format(f.valor)}</Td>
              <Td>
                <div className="flex items-center justify-end gap-2">
                  <Badge tone={f.pago ? "mint" : "rose"}>{f.pago ? "pago" : "não pago"}</Badge>
                  <Button
                    size="sm"
                    variant={f.pago ? "ghost" : "soft"}
                    onClick={() =>
                      dispatch({
                        type: "TOGGLE_FOLHA_PAGO",
                        id: f.id,
                        pago: !f.pago,
                        data: todayISO(),
                      })
                    }
                  >
                    {f.pago ? "Reabrir" : "Marcar pago"}
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </DataTable>
        {folhas.length === 0 ? (
          <p className="mt-2 text-[13px] text-faint">Nenhum lançamento de folha nesta empresa.</p>
        ) : null}
      </div>
    </div>
  );
}
