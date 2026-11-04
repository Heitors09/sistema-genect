"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import { Badge, Button, ButtonLink, Card, Field, Input, Select, Stat, Textarea, cn } from "@/components/ui";
import {
  brl,
  categoriaLabel,
  formatDate,
  nInt,
  produtoLabel,
  statusOpLabel,
  tipoNegocioLabel,
  todayISO,
} from "@/lib/format";
import { consumoEmEstoque, necessidadesOp } from "@/lib/ficha";
import { linhasValorServico } from "@/lib/migrate";
import { formaPagamentoLabel } from "@/lib/financeiro";
import { isSplitOp, opStageLabels } from "@/lib/op-flow";
import { resumoMicroCaminho } from "@/lib/roteiro-path";
import type { OpStatus } from "@/lib/types";
import { useLookups, useStore } from "@/lib/store/store";
import { OpFamilyMark } from "@/components/ops/op-family-mark";
import { OpFluxoPanel } from "@/components/ops/op-fluxo-panel";
import { ValorServicoResumo } from "@/components/ops/valor-servico";
import { FaturarModal } from "@/components/financeiro/receita-modals";

const STATUS_OPCOES: OpStatus[] = ["aberta", "em_producao", "revisao", "finalizada", "cancelada"];

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
  const [tab, setTab] = useState<"fluxo" | "insumos" | "financeiro">("fluxo");
  const [faturarAberto, setFaturarAberto] = useState(false);
  const [pendencia, setPendencia] = useState("");
  const etapas = useMemo(
    () => [...state.boardNodes].sort((a, b) => a.x - b.x || a.y - b.y),
    [state.boardNodes],
  );

  if (!op) return <p className="p-6 text-sm text-mute">OP não encontrada.</p>;

  const prod = produto(op.produtoId);
  const billed = state.faturamentos.some((f) => f.opId === op.id);
  const acerto = state.contasPagar.find((c) => c.origem === "faccao" && c.origemId === op.id);
  const pecasServico = op.quantidadeProduzida || op.quantidade;
  const calcServico = linhasValorServico(op.micros, state.terceirizados, pecasServico);
  const filhas = state.ops.filter((o) => o.parentOpId === op.id);
  const visible =
    isAdmin || (currentUser.terceirizadoId && op.terceirizadoIds.includes(currentUser.terceirizadoId));
  if (!visible) return <p className="p-6 text-sm text-mute">Sem acesso a esta OP.</p>;

  const needsInsumo = necessidadesOp(op, state.produtos);
  const etapaAtual = stage(op.stageId);

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
          <OpFamilyMark op={op} ops={state.ops} className="mt-1 text-[12px]" />
          {op.parentOpId && op.micros.length ? (
            <p className="mt-1.5 max-w-xl text-[12px] text-mute">
              Ramo no fluxograma:{" "}
              <span className="font-medium text-ink">{resumoMicroCaminho(op.micros)}</span>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={op.status === "finalizada" ? "mint" : op.status === "cancelada" ? "rose" : "sky"}>
            {statusOpLabel[op.status]}
          </Badge>
          {etapaAtual ? <Badge>{etapaAtual.label}</Badge> : null}
          <Badge tone={op.tipoNegocio === "fabricacao" ? "amber" : "violet"}>
            {tipoNegocioLabel[op.tipoNegocio]}
          </Badge>
          {op.urgente ? <Badge tone="rose">Urgente</Badge> : null}
          {op.prioridade ? <Badge tone="amber">Prioridade</Badge> : null}
          {isAdmin ? (
            <>
              <ButtonLink href={`/ops/${op.id}/editar`} size="sm" variant="soft">
                Editar cadastro
              </ButtonLink>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => dispatch({ type: "SET_OP_FLAGS", opId: op.id, urgente: !op.urgente })}
              >
                {op.urgente ? "Tirar urgente" : "Marcar urgente"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => dispatch({ type: "SET_OP_FLAGS", opId: op.id, prioridade: !op.prioridade })}
              >
                {op.prioridade ? "Tirar prioridade" : "Marcar prioridade"}
              </Button>
            </>
          ) : null}
          {op.parentOpId ? (
            <Link href={`/ops/${op.parentOpId}`} className="text-[12px] text-violet hover:underline">
              Ver OP mãe
            </Link>
          ) : null}
        </div>
      </div>

      {isAdmin && op.status !== "cancelada" ? (
        <div className="grid gap-3 surface rounded-md p-4 sm:grid-cols-2">
          <Field label="Status" hint="Situação da OP — cancelar libera a reserva de insumos">
            <Select
              value={op.status}
              onChange={(e) =>
                dispatch({ type: "SET_OP_STATUS", opId: op.id, status: e.target.value as OpStatus })
              }
            >
              {STATUS_OPCOES.map((s) => (
                <option key={s} value={s}>
                  {statusOpLabel[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Etapa no Kanban" hint="Move a OP de coluna no painel — mesma ação do arrastar">
            <Select
              value={op.stageId}
              onChange={(e) =>
                dispatch({ type: "MOVE_OP", opId: op.id, stageId: e.target.value, fromStageId: op.stageId })
              }
            >
              {etapas.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Quantidade" value={nInt.format(op.quantidade)} hint={`Entrada ${formatDate(op.dataEntrada)}`} />
        <Stat label="Produzido" value={nInt.format(op.quantidadeProduzida)} tone="mint" />
        <Stat label="Perdas + refugo" value={nInt.format(op.perdas + op.refugo)} tone="rose" />
        <Stat label="Valor previsto" value={brl.format(op.quantidade * op.precoUnitario)} hint="Ainda não é receita" />
      </div>

      {isAdmin && op.pagamento ? (
        <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-[12px]">
          <span className="kicker">Pagamento previsto</span>
          <span className="text-mute">
            Faturamento <span className="tabular-nums text-ink">{formatDate(op.pagamento.dataFaturamento)}</span>
          </span>
          <span className="text-mute">
            Forma <span className="text-ink">{formaPagamentoLabel[op.pagamento.formaPagamento]}</span>
          </span>
          <span className="text-mute">
            Prazo <span className="tabular-nums text-ink">{op.pagamento.prazoDias} dias</span>
          </span>
          <span className="text-mute">
            {op.pagamento.parcelas.map((p) => (
              <span key={p.id} className="mr-2 inline-block tabular-nums text-ink">
                {p.numero}/{op.pagamento!.parcelas.length} {brl.format(p.valor)} em {formatDate(p.vencimento)}
              </span>
            ))}
          </span>
        </Card>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
        <Card className="p-4">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 text-[12px]">
            {(isAdmin ? (["fluxo", "insumos", "financeiro"] as const) : (["fluxo"] as const)).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "motion-press shrink-0 rounded-md px-3 py-2",
                  t === tab ? "bg-elevated font-medium text-ink" : "text-mute hover:bg-elevated/60",
                )}
              >
                {t === "fluxo" ? "Rastreio e atados" : t === "insumos" ? "Insumos e lote" : "Serviço e faturamento"}
              </button>
            ))}
          </div>

          {tab === "fluxo" ? (
            <div className="page-enter mt-3 space-y-4">
              {op.fotosFicha.length || prod?.imagens.length ? (
                <div className="flex flex-wrap gap-2">
                  {[...op.fotosFicha, ...(prod?.imagens ?? [])].map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={src.slice(0, 32)} src={src} alt="Ficha da peça" className="h-24 w-24 rounded-md object-cover" />
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-faint">Nenhuma foto da ficha anexada.</p>
              )}
              {op.linhas[0]?.variacoes?.length ? (
                <p className="text-[12px] text-mute">
                  Grade:{" "}
                  {op.linhas.flatMap((l) => l.variacoes).map((v) => `${v.tamanho || "—"} ${v.cor} (${v.quantidade})`).join(" · ")}
                </p>
              ) : null}
              {op.micros.length ? (
                <OpFluxoPanel
                  op={op}
                  isAdmin={isAdmin}
                  canAct={(m) => isAdmin || m.terceirizadoId === currentUser.terceirizadoId}
                  stageLabel={(macroId) => stage(macroId)?.label}
                  boardNodes={state.boardNodes}
                  terceirizados={state.terceirizados}
                  onMicroAction={(microId, status) =>
                    dispatch({ type: "MICRO_ACTION", opId: op.id, microId, status })
                  }
                  onSplit={(payload) =>
                    dispatch({
                      type: "SPLIT_OP",
                      parentId: op.id,
                      ...payload,
                    })
                  }
                />
              ) : null}
              <div className="rounded-md border border-line p-3">
                <p className="kicker mb-2">Pendência para a fábrica</p>
                {op.pendencias.map((p) => (
                  <p key={p.id} className="mb-1 text-[12px] text-mute">
                    {p.autor}: {p.texto}
                  </p>
                ))}
                <Textarea value={pendencia} onChange={(e) => setPendencia(e.target.value)} placeholder="Descreva a pendência" />
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!pendencia.trim()) return;
                      dispatch({ type: "ADD_PENDENCIA", opId: op.id, texto: pendencia.trim(), autor: currentUser.nome });
                      setPendencia("");
                    }}
                  >
                    Enviar pendência
                  </Button>
                </div>
              </div>
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
            <div className="page-enter mt-3 space-y-2 text-[13px]">
              {needsInsumo.length ? (
                <>
                  {needsInsumo.map((n) => {
                    const ins = insumo(n.insumoId);
                    const loteUsado = op.lotesInsumo.find((l) => lote(l.loteId)?.insumoId === n.insumoId);
                    const lt = loteUsado ? lote(loteUsado.loteId) : undefined;
                    const estoque = ins ? consumoEmEstoque(n.qtdConsumo, ins) : n.qtdConsumo;
                    return (
                      <div key={n.insumoId} className="rounded-md border border-line bg-panel px-3 py-2">
                        <p className="font-medium">{ins?.codigo} · {ins?.descricao}</p>
                        <p className="text-[12px] text-mute">
                          {ins ? (categoriaLabel[ins.categoria] ?? ins.categoria) : "Insumo"} ·{" "}
                          {n.qtdConsumo.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} {ins?.unidadeConsumo} da ficha
                          {ins && ins.fatorConversao !== 1
                            ? ` · ${estoque.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${ins.unidadeCompra} em estoque`
                            : null}
                        </p>
                        {lt ? (
                            <p className="mt-1 text-[12px] text-faint">
                              Lote {lt.loteFabricante} · NF {lt.nf} · {loteUsado?.quantidade} {ins?.unidadeConsumo ?? lt.unidade}
                            </p>
                        ) : null}
                      </div>
                    );
                  })}
                  <p className="text-[12px] text-faint">
                    {op.tipoNegocio === "servico"
                      ? "Reserva só do que a Genect compra neste serviço. O restante vem do cliente."
                      : "Baixa a partir da unidade de consumo da ficha. Lotes diferentes de tecido podem variar de tom."}
                  </p>
                </>
              ) : (
                <p className="text-[12px] text-faint">
                  {op.tipoNegocio === "servico"
                    ? "Serviço de costura: o cliente envia o material. Nenhum insumo reservado do estoque."
                    : "Nenhum insumo na ficha deste produto."}
                </p>
              )}
            </div>
          ) : null}

          {tab === "financeiro" && isAdmin ? (
            <div className="page-enter mt-3 space-y-3 text-[13px]">
              <ValorServicoResumo pecas={pecasServico} linhas={calcServico.linhas} total={calcServico.total} />
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
                  onClick={() => setFaturarAberto(true)}
                >
                  {billed ? "OP já faturada" : "Faturar OP"}
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
          {faturarAberto ? (
            <FaturarModal
              opIds={[op.id]}
              onClose={() => setFaturarAberto(false)}
              onDone={() => setFaturarAberto(false)}
            />
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
