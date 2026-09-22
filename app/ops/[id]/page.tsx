"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import { Badge, Button, Card, Field, Input, Select, Stat, cn } from "@/components/ui";
import {
  brl,
  categoriaLabel,
  competenciaAtual,
  formatDate,
  nInt,
  produtoLabel,
  statusOpLabel,
  tipoNegocioLabel,
  todayISO,
} from "@/lib/format";
import { linhasReserva } from "@/lib/ficha";
import { isSplitOp, opStageLabels } from "@/lib/op-flow";
import { useLookups, useStore } from "@/lib/store/store";

function FakeQr({ code }: { code: string }) {
  const cells = useMemo(() => {
    const out: boolean[] = [];
    let h = 0;
    for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
    for (let i = 0; i < 121; i++) {
      h = (h * 1664525 + 1013904223) >>> 0;
      out.push(h % 3 !== 0);
    }
    return out;
  }, [code]);
  return (
    <div className="grid w-28 grid-cols-11 gap-px rounded-md bg-ink p-2">
      {cells.map((on, i) => (
        <span key={i} className={on ? "aspect-square bg-zinc-950" : "aspect-square bg-ink"} />
      ))}
    </div>
  );
}

export default function OpDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state, dispatch, isAdmin, currentUser } = useStore();
  const { empresa, cliente, produto, lote, stage, terceirizado, insumo } = useLookups();
  const op = state.ops.find((o) => o.id === id);
  const [produzida, setProduzida] = useState(String(op?.quantidadeProduzida ?? 0));
  const [perdas, setPerdas] = useState(String(op?.perdas ?? 0));
  const [refugo, setRefugo] = useState(String(op?.refugo ?? 0));
  const [splitQty, setSplitQty] = useState("50");
  const [splitTer, setSplitTer] = useState(op?.terceirizadoIds[0] ?? "");
  const [splitStage, setSplitStage] = useState(op?.stageId ?? "");
  const [tab, setTab] = useState<"fluxo" | "insumos" | "financeiro">("fluxo");

  if (!op) return <p className="p-6 text-sm text-mute">OP não encontrada.</p>;

  const prod = produto(op.produtoId);
  const billed = state.faturamentos.some((f) => f.opId === op.id);
  const acerto = state.contasPagar.find((c) => c.origem === "faccao" && c.origemId === op.id);
  const filhas = state.ops.filter((o) => o.parentOpId === op.id);
  const visible =
    isAdmin || (currentUser.terceirizadoId && op.terceirizadoIds.includes(currentUser.terceirizadoId));
  if (!visible) return <p className="p-6 text-sm text-mute">Sem acesso a esta OP.</p>;

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="kicker mb-1.5">Ordem de produção</p>
          <h1 className="page-title font-mono">{op.numero}</h1>
          <p className="lede">
            {prod ? produtoLabel(prod.nome, prod.referencia) : "—"}
            {op.cor ? ` · ${op.cor}` : ""} · {cliente(op.clienteId)?.nome} · {empresa(op.empresaId)?.nome}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={op.status === "finalizada" ? "mint" : op.status === "cancelada" ? "rose" : "sky"}>
            {statusOpLabel[op.status]}
          </Badge>
          <Badge tone={op.tipoNegocio === "fabricacao" ? "amber" : "violet"}>
            {tipoNegocioLabel[op.tipoNegocio]}
          </Badge>
          {op.parentOpId ? (
            <Link href={`/ops/${op.parentOpId}`} className="text-[12px] text-violet hover:underline">
              Ver OP mãe
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Quantidade" value={nInt.format(op.quantidade)} hint={`Entrada ${formatDate(op.dataEntrada)}`} />
        <Stat label="Produzido" value={nInt.format(op.quantidadeProduzida)} tone="mint" />
        <Stat label="Perdas + refugo" value={nInt.format(op.perdas + op.refugo)} tone="rose" />
        <Stat label="Valor previsto" value={brl.format(op.quantidade * op.precoUnitario)} hint="Ainda não é receita" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
        <Card className="p-4">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 text-[12px]">
            {(["fluxo", "insumos", "financeiro"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "shrink-0 rounded-md px-3 py-2",
                  t === tab ? "bg-elevated font-medium text-ink" : "text-mute",
                )}
              >
                {t === "fluxo" ? "Rastreio e atados" : t === "insumos" ? "Insumos e lote" : "Serviço e faturamento"}
              </button>
            ))}
          </div>

          {tab === "fluxo" ? (
            <div className="mt-3 space-y-4">
              <p className="text-[12px] text-mute">
                Etapa{isSplitOp(op) ? "s" : ""}:{" "}
                <span className="text-ink">{opStageLabels(op, (id) => stage(id)?.label)}</span>
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead className="kicker">
                    <tr>
                      <th className="py-1">Atado</th>
                      <th>Qtd</th>
                      <th>Setor</th>
                      <th>Terceirizado</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {op.atados.map((a) => (
                      <tr key={a.id} className="border-t border-line">
                        <td className="py-2 font-mono">{a.codigo}</td>
                        <td>{a.quantidade}</td>
                        <td>{stage(a.stageId)?.label}</td>
                        <td>{a.terceirizadoId ? terceirizado(a.terceirizadoId)?.nome : "—"}</td>
                        <td>{a.status}</td>
                        <td>
                          {isAdmin && a.status !== "concluido" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => dispatch({ type: "BAIXA_ATADO", opId: op.id, atadoId: a.id })}
                            >
                              Baixa
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isAdmin ? (
                <div className="grid gap-2 rounded-md border border-line bg-panel p-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Produzidas">
                    <Input value={produzida} onChange={(e) => setProduzida(e.target.value)} />
                  </Field>
                  <Field label="Perdas">
                    <Input value={perdas} onChange={(e) => setPerdas(e.target.value)} />
                  </Field>
                  <Field label="Refugo">
                    <Input value={refugo} onChange={(e) => setRefugo(e.target.value)} />
                  </Field>
                  <div className="flex items-end">
                    <Button
                      size="sm"
                      onClick={() =>
                        dispatch({
                          type: "UPDATE_OP_PRODUCTION",
                          opId: op.id,
                          produzida: Number(produzida) || 0,
                          perdas: Number(perdas) || 0,
                          refugo: Number(refugo) || 0,
                        })
                      }
                    >
                      Registrar revisão
                    </Button>
                  </div>
                </div>
              ) : null}

              {isAdmin && !op.parentOpId ? (
                <div className="grid gap-2 rounded-md border border-line bg-panel p-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Dividir lote (pç)">
                    <Input value={splitQty} onChange={(e) => setSplitQty(e.target.value)} />
                  </Field>
                  <Field label="Enviar para">
                    <Select value={splitTer} onChange={(e) => setSplitTer(e.target.value)}>
                      {state.terceirizados.map((t) => (
                        <option key={t.id} value={t.id}>{t.nome}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Etapa">
                    <Select value={splitStage} onChange={(e) => setSplitStage(e.target.value)}>
                      {state.boardNodes.map((n) => (
                        <option key={n.id} value={n.id}>{n.label}</option>
                      ))}
                    </Select>
                  </Field>
                  <div className="flex items-end">
                    <Button
                      size="sm"
                      variant="soft"
                      onClick={() =>
                        dispatch({
                          type: "SPLIT_OP",
                          parentId: op.id,
                          quantidade: Number(splitQty) || 0,
                          terceirizadoId: splitTer,
                          stageId: splitStage,
                        })
                      }
                    >
                      Gerar OP filha
                    </Button>
                  </div>
                </div>
              ) : null}

              {filhas.length ? (
                <p className="text-[12px] text-mute">
                  OPs filhas:{" "}
                  {filhas.map((f) => (
                    <Link key={f.id} href={`/ops/${f.id}`} className="mr-2 text-sky hover:underline">
                      {f.numero}
                    </Link>
                  ))}
                </p>
              ) : null}
            </div>
          ) : null}

          {tab === "insumos" ? (
            <div className="mt-3 space-y-2 text-[13px]">
              {prod
                ? linhasReserva(prod, op.tipoNegocio).map((linha) => {
                    const ins = insumo(linha.insumoId);
                    const loteUsado = op.lotesInsumo.find((l) => lote(l.loteId)?.insumoId === linha.insumoId);
                    const lt = loteUsado ? lote(loteUsado.loteId) : undefined;
                    return (
                      <div key={linha.insumoId} className="rounded-md border border-line bg-panel px-3 py-2">
                        <p className="font-medium">{ins?.codigo} · {ins?.descricao}</p>
                        <p className="text-[12px] text-mute">
                          {ins ? categoriaLabel[ins.categoria] : "Insumo"} · {linha.consumoPorPeca} / peça ·{" "}
                          {(linha.consumoPorPeca * op.quantidade).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} reservados
                        </p>
                        {lt ? (
                          <p className="mt-1 text-[12px] text-faint">
                            Lote {lt.loteFabricante} · NF {lt.nf} · {loteUsado?.quantidade} {lt.unidade}
                          </p>
                        ) : null}
                      </div>
                    );
                  })
                : null}
              {!prod || !linhasReserva(prod, op.tipoNegocio).length ? (
                <p className="text-[12px] text-faint">
                  {op.tipoNegocio === "servico"
                    ? "Serviço de costura: o cliente envia o material. Nenhum insumo reservado do estoque."
                    : "Nenhum insumo na ficha deste produto."}
                </p>
              ) : (
                <p className="text-[12px] text-faint">
                  {op.tipoNegocio === "servico"
                    ? "Reserva só do que a Genect compra neste serviço. O restante vem do cliente."
                    : "Reserva da ficha de fabricação. Lotes diferentes de tecido podem variar de tom."}
                </p>
              )}
            </div>
          ) : null}

          {tab === "financeiro" && isAdmin ? (
            <div className="mt-3 space-y-3 text-[13px]">
              <p>
                Serviço de terceirizado previsto: {brl.format((op.quantidadeProduzida || op.quantidade) * op.valorServicoPorPeca)}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="soft"
                  disabled={!!acerto}
                  onClick={() => dispatch({ type: "GERAR_ACERTO_FACCAO", opId: op.id, vencimento: todayISO() })}
                >
                  {acerto ? "Acerto já gerado" : "Gerar acerto de pagamento"}
                </Button>
                <Button
                  size="sm"
                  disabled={billed}
                  onClick={() =>
                    dispatch({
                      type: "FATURAR_OP",
                      opId: op.id,
                      vencimento: todayISO(),
                      competencia: competenciaAtual(),
                    })
                  }
                >
                  {billed ? "OP já faturada" : "Faturamento interno"}
                </Button>
                {op.status !== "cancelada" ? (
                  <Button size="sm" variant="danger" onClick={() => dispatch({ type: "CANCEL_OP", opId: op.id })}>
                    Cancelar e liberar reserva
                  </Button>
                ) : null}
              </div>
              <p className="text-[12px] text-faint">
                OP recebida ≠ valor previsto ≠ faturamento ≠ conta ≠ pagamento ≠ receita na DRE.
              </p>
            </div>
          ) : null}
        </Card>
        <Card className="flex flex-row items-center gap-3 p-4 lg:grid lg:place-items-center lg:gap-2">
          <FakeQr code={op.numero} />
          <div>
            <p className="font-mono text-[11px] text-mute">{op.numero}</p>
            <p className="text-[11px] text-faint">QR / código de barras para leitura nos setores</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
