"use client";

import { useMemo, useState } from "react";
import { Plus, Users } from "lucide-react";
import { BaixaModal } from "@/components/financeiro/baixa-modal";
import { DespesaModal } from "@/components/financeiro/despesa-modal";
import {
  Badge,
  Button,
  ButtonLink,
  DataTable,
  Empty,
  Input,
  PageHeader,
  Select,
  Stat,
  Td,
  type TableSort,
} from "@/components/ui";
import { brl, formatDate, saldoConta, statusConta } from "@/lib/format";
import { formaPagamentoLabel, nomeFavorecido, ordenar, tipoFolhaLabel } from "@/lib/financeiro";
import type { ContaPagar } from "@/lib/types";
import { useStore } from "@/lib/store/store";

const statusTone = { quitado: "mint", parcial: "amber", aberto: "rose" } as const;
const statusLabel = { quitado: "Pago", parcial: "Parcial", aberto: "Em aberto" } as const;

export default function DespesasPage() {
  const { state, dispatch, isAdmin, currentUser } = useStore();
  const [novaAberta, setNovaAberta] = useState(false);
  const [payId, setPayId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("todos");
  const [tipo, setTipo] = useState<"gerais" | "funcionarios" | "todas">("gerais");
  const [empresaId, setEmpresaId] = useState("todas");
  const [categoriaId, setCategoriaId] = useState("todas");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<TableSort>({ key: "vencimento", dir: "asc" });

  const nomeCategoria = (id?: string) => state.categoriasFinanceiras.find((c) => c.id === id)?.nome ?? "—";
  const nomeConta = (id?: string) => state.contasBancarias.find((c) => c.id === id)?.nome ?? "—";

  const filtradas = useMemo(() => {
    const query = q.trim().toLowerCase();
    return state.contasPagar.filter((c) => {
      if (tipo === "gerais" && c.origem === "folha") return false;
      if (tipo === "funcionarios" && c.origem !== "folha") return false;
      if (empresaId !== "todas" && c.empresaId !== empresaId) return false;
      if (categoriaId !== "todas" && c.categoriaId !== categoriaId) return false;
      const st = statusConta(c.valor, c.pagamentos);
      if (filtro !== "todos" && st !== filtro) return false;
      if (query) {
        const blob = `${c.descricao} ${nomeFavorecido(state, c)}`.toLowerCase();
        if (!blob.includes(query)) return false;
      }
      return true;
    });
  }, [state, tipo, empresaId, categoriaId, filtro, q]);

  const rows = useMemo(
    () =>
      ordenar(filtradas, sort, {
        favorecido: (c: ContaPagar) => nomeFavorecido(state, c),
        descricao: (c: ContaPagar) => c.descricao,
        metodo: (c: ContaPagar) => (c.formaPagamento ? formaPagamentoLabel[c.formaPagamento] : "~"),
        categoria: (c: ContaPagar) => nomeCategoria(c.categoriaId),
        conta: (c: ContaPagar) => nomeConta(c.contaBancariaId),
        valor: (c: ContaPagar) => c.valor,
        competencia: (c: ContaPagar) => c.competencia,
        vencimento: (c: ContaPagar) => c.vencimento,
        status: (c: ContaPagar) => statusConta(c.valor, c.pagamentos),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtradas, sort, state],
  );

  const totais = useMemo(() => {
    const total = filtradas.reduce((a, c) => a + c.valor, 0);
    const aberto = filtradas.reduce((a, c) => a + saldoConta(c.valor, c.pagamentos), 0);
    return { total, aberto, pago: total - aberto };
  }, [filtradas]);

  if (!isAdmin) return <p className="p-6 text-sm text-mute">Acesso restrito.</p>;

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Financeiro"
        title="Despesas"
        description="Lançamentos a pagar. Clique no título da coluna para ordenar (A→Z, vencimento, maior→menor)."
        actions={
          <>
            <ButtonLink href="/financeiro/folha" variant="ghost">
              <Users size={14} /> Folha de pagamento
            </ButtonLink>
            <Button onClick={() => setNovaAberta(true)}>
              <Plus size={14} /> Nova despesa
            </Button>
          </>
        }
      />

      <div className="grid gap-2 sm:grid-cols-3">
        <Stat label="Total filtrado" value={brl.format(totais.total)} />
        <Stat label="Pago" value={brl.format(totais.pago)} tone="mint" />
        <Stat label="Em aberto" value={brl.format(totais.aberto)} tone="rose" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar descrição ou favorecido" className="w-full sm:max-w-xs" />
        <Select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} className="w-full sm:w-48">
          <option value="gerais">Despesas gerais</option>
          <option value="funcionarios">Com funcionários</option>
          <option value="todas">Todas</option>
        </Select>
        <Select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="w-full sm:w-40">
          <option value="todos">Todos os status</option>
          <option value="aberto">Em aberto</option>
          <option value="parcial">Parcial</option>
          <option value="quitado">Pago</option>
        </Select>
        <Select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} className="w-full sm:w-48">
          <option value="todas">Todas as empresas</option>
          {state.empresas.map((e) => (
            <option key={e.id} value={e.id}>{e.nome}</option>
          ))}
        </Select>
        <Select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="w-full sm:w-52">
          <option value="todas">Todas as categorias</option>
          {state.categoriasFinanceiras
            .filter((c) => c.tipo === "despesa_custo")
            .map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
        </Select>
      </div>

      {rows.length ? (
        <DataTable
          sort={sort}
          onSort={setSort}
          headers={[
            { label: "Cliente / fornecedor", sortKey: "favorecido" },
            { label: "Descrição", sortKey: "descricao" },
            { label: "Método", sortKey: "metodo" },
            { label: "Categoria", sortKey: "categoria" },
            { label: "Conta bancária", sortKey: "conta" },
            { label: "Vencimento", sortKey: "vencimento" },
            { label: "Competência", sortKey: "competencia" },
            { label: "Valor", sortKey: "valor" },
            { label: "Status", sortKey: "status" },
          ]}
        >
          {rows.map((c) => {
            const st = statusConta(c.valor, c.pagamentos);
            const saldo = saldoConta(c.valor, c.pagamentos);
            const ultimoPg = c.pagamentos.filter((p) => !p.estornado).slice(-1)[0];
            return (
              <tr key={c.id}>
                <Td>{nomeFavorecido(state, c)}</Td>
                <Td>
                  <span>{c.descricao}</span>
                  {c.tipoFolha ? (
                    <span className="ml-1.5 text-[10px] text-violet">{tipoFolhaLabel[c.tipoFolha]}</span>
                  ) : c.programada ? (
                    <span className="ml-1.5 text-[10px] text-amber">recorrente dia {c.recorrenciaDia ?? "—"}</span>
                  ) : null}
                </Td>
                <Td className="text-mute">{c.formaPagamento ? formaPagamentoLabel[c.formaPagamento] : "—"}</Td>
                <Td className="text-mute">{nomeCategoria(c.categoriaId)}</Td>
                <Td className="text-mute">{nomeConta(c.contaBancariaId)}</Td>
                <Td className="tabular-nums">{formatDate(c.vencimento)}</Td>
                <Td className="tabular-nums">{c.competencia}</Td>
                <Td className="tabular-nums">
                  {brl.format(c.valor)}
                  {st === "parcial" ? <p className="text-[10px] text-faint">saldo {brl.format(saldo)}</p> : null}
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-right">
                      <Badge tone={statusTone[st]}>{statusLabel[st]}</Badge>
                      {ultimoPg ? <span className="block text-[10px] text-faint">em {formatDate(ultimoPg.data)}</span> : null}
                    </span>
                    {saldo > 0 ? (
                      <Button size="sm" variant="ghost" onClick={() => setPayId(c.id)}>
                        Pagar
                      </Button>
                    ) : ultimoPg ? (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          dispatch({
                            type: "ESTORNAR_PAGAMENTO",
                            contaId: c.id,
                            pagamentoId: ultimoPg.id,
                            motivo: "Estorno total",
                            autor: currentUser.nome,
                          })
                        }
                      >
                        Estornar
                      </Button>
                    ) : null}
                  </div>
                </Td>
              </tr>
            );
          })}
        </DataTable>
      ) : (
        <Empty title="Nenhuma despesa encontrada" hint="Ajuste os filtros ou lance uma nova despesa." />
      )}

      <DespesaModal open={novaAberta} onClose={() => setNovaAberta(false)} />
      <BaixaModal tipo="pagar" contaId={payId} onClose={() => setPayId(null)} />
    </div>
  );
}
