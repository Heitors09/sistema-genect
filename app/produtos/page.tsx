"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Percent } from "lucide-react";
import {
  Badge,
  Button,
  ButtonLink,
  DataTable,
  Empty,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Td,
  cn,
  type TableSort,
} from "@/components/ui";
import { brl, nInt, produtoLabel, tipoNegocioLabel } from "@/lib/format";
import { estoqueDoProduto } from "@/lib/estoque-produto";
import { fichaLinhas } from "@/lib/ficha";
import { ordenar } from "@/lib/financeiro";
import type { Produto } from "@/lib/types";
import { useStore } from "@/lib/store/store";

export default function ProdutosPage() {
  const { state, isAdmin } = useStore();
  const faturados = useMemo(() => new Set(state.faturamentos.map((f) => f.opId)), [state.faturamentos]);
  const [clienteFiltro, setClienteFiltro] = useState("todos");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<TableSort>(null);
  const [reajusteAberto, setReajusteAberto] = useState(false);

  const nomeCliente = (id?: string) => state.clientes.find((c) => c.id === id)?.nome ?? "";

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    const base = state.produtos.filter((p) => {
      if (clienteFiltro === "sem" && p.clienteId) return false;
      if (clienteFiltro !== "todos" && clienteFiltro !== "sem" && p.clienteId !== clienteFiltro) return false;
      if (!query) return true;
      return `${p.referencia} ${p.nome} ${p.categoria}`.toLowerCase().includes(query);
    });
    return ordenar(base, sort, {
      referencia: (p: Produto) => p.referencia,
      nome: (p: Produto) => p.nome,
      cliente: (p: Produto) => nomeCliente(p.clienteId) || "~",
      preco: (p: Produto) => p.precoVenda || 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.produtos, state.clientes, clienteFiltro, q, sort]);

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Produtos"
        title="Cadastro e estoque de produtos"
        description="Grade tamanho + cor vira estoque do que foi produzido. A venda gera a conta a receber."
        actions={
          isAdmin ? (
            <>
              <Button variant="ghost" onClick={() => setReajusteAberto(true)}>
                <Percent size={14} /> Reajustar preços
              </Button>
              <ButtonLink href="/produtos/novo">Novo produto</ButtonLink>
            </>
          ) : null
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar referência ou modelo"
          className="w-full sm:max-w-xs"
        />
        <Select value={clienteFiltro} onChange={(e) => setClienteFiltro(e.target.value)} className="w-full sm:w-56">
          <option value="todos">Todos os clientes</option>
          <option value="sem">Sem cliente vinculado</option>
          {state.clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </Select>
      </div>

      {rows.length ? (
        <DataTable
          sort={sort}
          onSort={setSort}
          headers={[
            { label: "Número", sortKey: "referencia" },
            { label: "Modelo", sortKey: "nome" },
            { label: "Cliente", sortKey: "cliente" },
            "Tipo",
            "Grade",
            "Estoque",
            "Insumos",
            { label: "Venda", sortKey: "preco" },
          ]}
        >
          {rows.map((p) => {
            const skus = estoqueDoProduto(p, state.ops, faturados);
            const saldo = skus.reduce((a, s) => a + s.saldo, 0);
            const ultimo = p.historicoPreco?.[0];
            return (
              <tr key={p.id}>
                <Td mono>
                  <Link href={`/produtos/${p.id}`} className="text-sky hover:underline">
                    {p.referencia}
                  </Link>
                </Td>
                <Td>
                  <div>
                    {produtoLabel(p.nome)}
                    {p.categoria ? <p className="text-[11px] text-faint">{p.categoria}</p> : null}
                  </div>
                </Td>
                <Td className={p.clienteId ? "" : "text-faint"}>{nomeCliente(p.clienteId) || "—"}</Td>
                <Td>
                  <Badge tone={p.tipoNegocio === "fabricacao" ? "amber" : "violet"}>
                    {tipoNegocioLabel[p.tipoNegocio]}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {p.variacoes.length
                      ? p.variacoes.map((v) => (
                          <Badge key={v.tamanho}>{v.tamanho} · {v.cores.length || "—"}</Badge>
                        ))
                      : <span className="text-faint">—</span>}
                  </div>
                </Td>
                <Td>{saldo ? `${nInt.format(saldo)} pç` : "—"}</Td>
                <Td>{fichaLinhas(p).length ? `${fichaLinhas(p).length} itens` : "—"}</Td>
                <Td className="tabular-nums">
                  {p.precoVenda ? brl.format(p.precoVenda) : "—"}
                  {ultimo ? (
                    <p className="text-[10px] text-faint">antes {brl.format(ultimo.de)}</p>
                  ) : null}
                </Td>
              </tr>
            );
          })}
        </DataTable>
      ) : (
        <Empty title="Nenhum produto encontrado" hint="Ajuste o filtro de cliente ou a busca." />
      )}

      {reajusteAberto ? (
        <ReajusteModal
          clienteInicial={clienteFiltro !== "todos" && clienteFiltro !== "sem" ? clienteFiltro : ""}
          onClose={() => setReajusteAberto(false)}
        />
      ) : null}
    </div>
  );
}

function ReajusteModal({ clienteInicial, onClose }: { clienteInicial: string; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const clientesComProduto = state.clientes.filter((c) => state.produtos.some((p) => p.clienteId === c.id));
  const [clienteId, setClienteId] = useState(clienteInicial || clientesComProduto[0]?.id || "");
  const [modo, setModo] = useState<"percentual" | "valor">("percentual");
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [excluidos, setExcluidos] = useState<Set<string>>(new Set());
  const [feito, setFeito] = useState<number | null>(null);

  const produtos = state.produtos.filter((p) => p.clienteId === clienteId);
  const v = Number(valor.replace(",", ".")) || 0;
  const novoPreco = (p: Produto) =>
    Math.max(0, Number((modo === "percentual" ? (p.precoVenda || 0) * (1 + v / 100) : (p.precoVenda || 0) + v).toFixed(2)));
  const selecionados = produtos.filter((p) => !excluidos.has(p.id));

  function aplicar() {
    if (!clienteId || !v || !selecionados.length) return;
    dispatch({
      type: "REAJUSTAR_PRECOS",
      clienteId,
      modo,
      valor: v,
      produtoIds: selecionados.map((p) => p.id),
      motivo: motivo.trim() || undefined,
    });
    setFeito(selecionados.length);
  }

  return (
    <Modal open title="Reajuste de preço por cliente" onClose={onClose} size="lg">
      {feito !== null ? (
        <div className="space-y-3">
          <p className="text-[13px] text-ink">
            Preço atualizado em {feito} produto{feito === 1 ? "" : "s"}. OPs já criadas mantêm o preço original.
          </p>
          <div className="flex justify-end">
            <Button onClick={onClose}>Fechar</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Cliente">
              <Select value={clienteId} onChange={(e) => { setClienteId(e.target.value); setExcluidos(new Set()); }}>
                {clientesComProduto.length ? null : <option value="">Nenhum cliente com produto</option>}
                {clientesComProduto.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </Select>
            </Field>
            <Field label="Tipo de reajuste">
              <Select value={modo} onChange={(e) => setModo(e.target.value as "percentual" | "valor")}>
                <option value="percentual">Porcentagem (%)</option>
                <option value="valor">Valor fixo (R$)</option>
              </Select>
            </Field>
            <Field label={modo === "percentual" ? "Percentual" : "Valor por peça"} hint="Negativo reduz o preço">
              <Input
                type="number"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder={modo === "percentual" ? "Ex.: 8" : "Ex.: 2,50"}
              />
            </Field>
          </div>
          <Field label="Motivo" hint="Opcional — fica no histórico do produto">
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Reajuste anual" />
          </Field>
          {produtos.length ? (
            <ul className="divide-y divide-line rounded-md border border-line">
              {produtos.map((p) => {
                const on = !excluidos.has(p.id);
                return (
                  <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={on}
                      aria-label={`Incluir ${p.referencia}`}
                      onChange={() =>
                        setExcluidos((prev) => {
                          const n = new Set(prev);
                          if (n.has(p.id)) n.delete(p.id);
                          else n.add(p.id);
                          return n;
                        })
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-mono text-[12px]">{p.referencia}</span> · {p.nome}
                    </span>
                    <span className="tabular-nums text-mute">{brl.format(p.precoVenda || 0)}</span>
                    <span className="text-faint">→</span>
                    <span className={cn("min-w-[5.5rem] text-right tabular-nums", on && v ? "font-medium text-ink" : "text-faint")}>
                      {brl.format(on ? novoPreco(p) : p.precoVenda || 0)}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[13px] text-faint">Este cliente não tem produtos vinculados.</p>
          )}
          <p className="text-[11px] text-faint">
            Vale daqui para frente: só novas OPs usam o novo preço. OPs já criadas não são alteradas.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button onClick={aplicar} disabled={!v || !selecionados.length}>
              Aplicar em {selecionados.length} produto{selecionados.length === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
