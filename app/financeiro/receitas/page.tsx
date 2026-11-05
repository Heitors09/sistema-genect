"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { BaixaModal } from "@/components/financeiro/baixa-modal";
import { FaturarModal, ReceitaModal, valorOp } from "@/components/financeiro/receita-modals";
import {
  Badge,
  Button,
  DataTable,
  Empty,
  Input,
  PageHeader,
  Select,
  Stat,
  Td,
  cn,
  type TableSort,
} from "@/components/ui";
import { brl, formatDate, saldoConta, statusConta } from "@/lib/format";
import { formaPagamentoLabel, ordenar } from "@/lib/financeiro";
import { pecasOpPorSku, resumoPecasSku } from "@/lib/estoque-produto";
import type { ContaReceber } from "@/lib/types";
import { useStore } from "@/lib/store/store";

const statusTone = { quitado: "mint", parcial: "amber", aberto: "sky" } as const;
const statusLabel = { quitado: "Recebido", parcial: "Parcial", aberto: "A receber" } as const;

function opsDaConta(c: ContaReceber) {
  return c.opIds?.length ? c.opIds : c.opId ? [c.opId] : [];
}

export default function ReceitasPage() {
  const { state, dispatch, isAdmin, currentUser } = useStore();
  const [payId, setPayId] = useState<string | null>(null);
  const [novaAberta, setNovaAberta] = useState(false);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [faturarAberto, setFaturarAberto] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const [empresaId, setEmpresaId] = useState("todas");
  const [clienteId, setClienteId] = useState("todos");
  const [opFiltro, setOpFiltro] = useState("todas");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<TableSort>({ key: "vencimento", dir: "asc" });

  const naoFaturadas = useMemo(
    () =>
      state.ops.filter(
        (o) => o.status !== "cancelada" && !state.faturamentos.some((f) => f.opId === o.id),
      ),
    [state.ops, state.faturamentos],
  );
  const opsComReceita = useMemo(() => {
    const ids = new Set(state.contasReceber.flatMap(opsDaConta));
    return state.ops.filter((o) => ids.has(o.id));
  }, [state.contasReceber, state.ops]);

  const nomeCliente = (id: string) => state.clientes.find((c) => c.id === id)?.nome ?? "—";
  const numeroOp = (id: string) => state.ops.find((o) => o.id === id)?.numero ?? "";

  const filtradas = useMemo(() => {
    const query = q.trim().toLowerCase();
    return state.contasReceber.filter((c) => {
      if (empresaId !== "todas" && c.empresaId !== empresaId) return false;
      if (clienteId !== "todos" && c.clienteId !== clienteId) return false;
      if (opFiltro === "sem_op" && opsDaConta(c).length) return false;
      if (opFiltro !== "todas" && opFiltro !== "sem_op" && !opsDaConta(c).includes(opFiltro)) return false;
      const st = statusConta(c.valor, c.recebimentos);
      if (filtro !== "todos" && st !== filtro) return false;
      if (query && !`${c.descricao} ${nomeCliente(c.clienteId)}`.toLowerCase().includes(query)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.contasReceber, state.clientes, empresaId, clienteId, opFiltro, filtro, q]);

  const rows = useMemo(
    () =>
      ordenar(filtradas, sort, {
        cliente: (c: ContaReceber) => nomeCliente(c.clienteId),
        descricao: (c: ContaReceber) => c.descricao,
        status: (c: ContaReceber) => statusConta(c.valor, c.recebimentos),
        forma: (c: ContaReceber) => (c.formaPagamento ? formaPagamentoLabel[c.formaPagamento] : "~"),
        vencimento: (c: ContaReceber) => c.vencimento,
        valor: (c: ContaReceber) => c.valor,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtradas, sort, state.clientes],
  );

  const totais = useMemo(() => {
    const total = filtradas.reduce((a, c) => a + c.valor, 0);
    const aberto = filtradas.reduce((a, c) => a + saldoConta(c.valor, c.recebimentos), 0);
    return { total, aberto, recebido: total - aberto };
  }, [filtradas]);

  const clienteSelecionado = useMemo(() => {
    const first = [...selecionadas][0];
    return first ? state.ops.find((o) => o.id === first)?.clienteId : undefined;
  }, [selecionadas, state.ops]);
  const totalSelecionado = naoFaturadas
    .filter((o) => selecionadas.has(o.id))
    .reduce((a, o) => a + valorOp(o), 0);

  function toggle(id: string) {
    setSelecionadas((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  if (!isAdmin) return <p className="p-6 text-sm text-mute">Acesso restrito.</p>;

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Financeiro"
        title="Receitas (vendas)"
        description="Valores a receber. Selecione as OPs de um mesmo pagamento e clique em Faturar."
        actions={
          <Button onClick={() => setNovaAberta(true)}>
            <Plus size={14} /> Nova receita
          </Button>
        }
      />

      <div className="grid gap-2 sm:grid-cols-3">
        <Stat label="Total filtrado" value={brl.format(totais.total)} />
        <Stat label="Recebido" value={brl.format(totais.recebido)} tone="mint" />
        <Stat label="A receber" value={brl.format(totais.aberto)} tone="amber" />
      </div>

      <div className="surface rounded-md p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="kicker">OPs aguardando faturamento</p>
          <div className="flex items-center gap-2">
            {selecionadas.size ? (
              <span className="text-[12px] tabular-nums text-mute">
                {selecionadas.size} selecionada{selecionadas.size === 1 ? "" : "s"} · {brl.format(totalSelecionado)}
              </span>
            ) : null}
            <Button size="sm" disabled={!selecionadas.size} onClick={() => setFaturarAberto(true)}>
              <Receipt size={13} /> Faturar
            </Button>
          </div>
        </div>
        {naoFaturadas.length === 0 ? <p className="text-[13px] text-faint">Nada pendente.</p> : null}
        <div className="divide-y divide-line">
          {naoFaturadas.map((op) => {
            const prod = state.produtos.find((p) => p.id === op.produtoId);
            const skus = pecasOpPorSku(op);
            const outroCliente = !!clienteSelecionado && clienteSelecionado !== op.clienteId;
            const checked = selecionadas.has(op.id);
            const prev = op.pagamento;
            return (
              <label
                key={op.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 py-2 first:pt-0 last:pb-0",
                  outroCliente && !checked && "cursor-not-allowed opacity-45",
                )}
                title={outroCliente ? "Outro cliente — um pagamento é de um único cliente" : undefined}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={outroCliente && !checked}
                  onChange={() => toggle(op.id)}
                />
                <Link href={`/ops/${op.id}`} className="shrink-0 font-mono text-[13px] text-sky hover:underline">
                  {op.numero}
                </Link>
                <span className="min-w-0 flex-1 truncate text-[12px] text-mute">
                  {nomeCliente(op.clienteId)}
                  {prod ? ` · ${prod.referencia}` : ""}
                  {resumoPecasSku(skus) ? ` · ${resumoPecasSku(skus)}` : ""}
                </span>
                {prev ? (
                  <span className="hidden shrink-0 text-[11px] text-faint sm:inline">
                    prev. {formatDate(prev.parcelas[0]?.vencimento ?? prev.dataFaturamento)} ·{" "}
                    {formaPagamentoLabel[prev.formaPagamento]}
                    {prev.parcelas.length > 1 ? ` · ${prev.parcelas.length}x` : ""}
                  </span>
                ) : null}
                <span className="shrink-0 tabular-nums text-[13px] text-mute">{brl.format(valorOp(op))}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar descrição ou cliente" className="w-full sm:max-w-xs" />
        <Select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="w-full sm:w-40">
          <option value="todos">Todos os status</option>
          <option value="aberto">A receber</option>
          <option value="parcial">Parcial</option>
          <option value="quitado">Recebido</option>
        </Select>
        <Select value={opFiltro} onChange={(e) => setOpFiltro(e.target.value)} className="w-full sm:w-44">
          <option value="todas">Todas as OPs</option>
          <option value="sem_op">Sem OP (manual)</option>
          {opsComReceita.map((o) => (
            <option key={o.id} value={o.id}>{o.numero}</option>
          ))}
        </Select>
        <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full sm:w-48">
          <option value="todos">Todos os clientes</option>
          {state.clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </Select>
        <Select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} className="w-full sm:w-48">
          <option value="todas">Todas as empresas</option>
          {state.empresas.map((e) => (
            <option key={e.id} value={e.id}>{e.nome}</option>
          ))}
        </Select>
      </div>

      {rows.length ? (
        <DataTable
          sort={sort}
          onSort={setSort}
          headers={[
            { label: "Cliente", sortKey: "cliente" },
            { label: "Descrição", sortKey: "descricao" },
            { label: "Forma de pagamento", sortKey: "forma" },
            { label: "Vencimento / parcela", sortKey: "vencimento" },
            { label: "Valor", sortKey: "valor" },
            { label: "Status", sortKey: "status" },
          ]}
        >
          {rows.map((c) => {
            const st = statusConta(c.valor, c.recebimentos);
            const saldo = saldoConta(c.valor, c.recebimentos);
            const ultimo = c.recebimentos.filter((p) => !p.estornado).slice(-1)[0];
            const opIds = opsDaConta(c);
            return (
              <tr key={c.id}>
                <Td>{nomeCliente(c.clienteId)}</Td>
                <Td>
                  {c.descricao}
                  {opIds.length ? (
                    <p className="text-[10px] text-faint">
                      {opIds.map((id, i) => (
                        <span key={id}>
                          {i ? ", " : ""}
                          <Link href={`/ops/${id}`} className="hover:text-sky hover:underline">
                            {numeroOp(id)}
                          </Link>
                        </span>
                      ))}
                    </p>
                  ) : null}
                </Td>
                <Td className="text-mute">{c.formaPagamento ? formaPagamentoLabel[c.formaPagamento] : "—"}</Td>
                <Td className="tabular-nums">
                  {formatDate(c.vencimento)}
                  {c.parcela ? (
                    <span className="ml-1.5 text-[10px] text-faint">
                      {c.parcela.numero}/{c.parcela.total}
                    </span>
                  ) : null}
                </Td>
                <Td className="tabular-nums">
                  {brl.format(c.valor)}
                  {st === "parcial" ? <p className="text-[10px] text-faint">saldo {brl.format(saldo)}</p> : null}
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-right">
                      <Badge tone={statusTone[st]}>{statusLabel[st]}</Badge>
                      {ultimo ? <span className="block text-[10px] text-faint">em {formatDate(ultimo.data)}</span> : null}
                    </span>
                    {saldo > 0 ? (
                      <Button size="sm" variant="ghost" onClick={() => setPayId(c.id)}>
                        Receber
                      </Button>
                    ) : ultimo ? (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          dispatch({
                            type: "ESTORNAR_RECEBIMENTO",
                            contaId: c.id,
                            recebimentoId: ultimo.id,
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
        <Empty title="Nenhuma receita encontrada" hint="Ajuste os filtros ou fature uma OP." />
      )}

      {faturarAberto ? (
        <FaturarModal
          opIds={[...selecionadas]}
          onClose={() => setFaturarAberto(false)}
          onDone={() => {
            setFaturarAberto(false);
            setSelecionadas(new Set());
          }}
        />
      ) : null}
      {novaAberta ? <ReceitaModal onClose={() => setNovaAberta(false)} /> : null}
      <BaixaModal tipo="receber" contaId={payId} onClose={() => setPayId(null)} />
    </div>
  );
}
