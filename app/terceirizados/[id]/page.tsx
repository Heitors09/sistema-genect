"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import {
  acertoStatusLabel,
  brl,
  microStatusLabel,
  nInt,
  parseBRL,
  statusOpLabel,
  uid,
} from "@/lib/format";
import { servicosDe } from "@/lib/migrate";
import {
  findAcerto,
  microsDoTerceirizado,
  opAtivaParaTerceirizado,
  opConcluidaParaTerceirizado,
  opsDoTerceirizado,
  totaisAcerto,
  valorMicroTerceirizado,
} from "@/lib/terceirizado-ops";
import { AcertoControls } from "@/components/terceirizados/acerto-controls";
import { Badge, Button, Card, Field, Input, PageHeader, cn } from "@/components/ui";
import { useStore } from "@/lib/store/store";

type Aba = "ativas" | "historico" | "servicos";

export default function TerceirizadoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { state, currentUser, isAdmin, dispatch } = useStore();
  const [aba, setAba] = useState<Aba>("ativas");
  const [novoServico, setNovoServico] = useState("");
  const [novoValor, setNovoValor] = useState("");

  const terceirizado = state.terceirizados.find((t) => t.id === id);
  const permitido = isAdmin || currentUser.terceirizadoId === id;

  const ops = useMemo(
    () => (terceirizado ? opsDoTerceirizado(state.ops, terceirizado.id) : []),
    [state.ops, terceirizado],
  );
  const ativas = ops.filter((o) => opAtivaParaTerceirizado(o, id));
  const historico = ops.filter((o) => opConcluidaParaTerceirizado(o, id));
  const servicos = terceirizado ? servicosDe(terceirizado) : [];

  const microsAtivos = ativas.flatMap((op) =>
    microsDoTerceirizado(op, id)
      .filter((m) => m.status !== "concluida")
      .map((m) => ({ op, micro: m })),
  );
  const microsHistorico = ops.flatMap((op) =>
    microsDoTerceirizado(op, id)
      .filter((m) => m.status === "concluida")
      .map((m) => ({ op, micro: m })),
  );

  function addServico() {
    if (!terceirizado || !isAdmin) return;
    const nome = novoServico.trim();
    if (!nome) return;
    const valorPorPeca = parseBRL(novoValor) || 0;
    const lista = [
      ...servicosDe(terceirizado),
      { id: uid("svc"), nome, valorPorPeca },
    ];
    dispatch({
      type: "SAVE_TERCEIRIZADO",
      terceirizado: {
        ...terceirizado,
        servicos: lista,
        especialidade: lista.map((s) => s.nome).join(", "),
        valorPorPeca: lista[0]?.valorPorPeca ?? 0,
      },
    });
    setNovoServico("");
    setNovoValor("");
  }

  function removeServico(servicoId: string) {
    if (!terceirizado || !isAdmin) return;
    const lista = servicosDe(terceirizado).filter((s) => s.id !== servicoId);
    dispatch({
      type: "SAVE_TERCEIRIZADO",
      terceirizado: {
        ...terceirizado,
        servicos: lista,
        especialidade: lista.map((s) => s.nome).join(", "),
        valorPorPeca: lista[0]?.valorPorPeca ?? 0,
      },
    });
  }

  if (!terceirizado || !permitido) {
    return (
      <div className="space-y-3 p-4">
        <Link href="/terceirizados" className="inline-flex items-center gap-1 text-[12px] text-sky hover:underline">
          <ChevronLeft size={14} /> Voltar
        </Link>
        <p className="text-sm text-mute">Terceirizado não encontrado.</p>
      </div>
    );
  }

  const tabs: { id: Aba; label: string; count?: number }[] = [
    { id: "ativas", label: "OPs ativas", count: ativas.length },
    { id: "historico", label: "Histórico", count: historico.length },
    { id: "servicos", label: "Serviços", count: servicos.length },
  ];

  return (
    <div className="space-y-4 p-4">
      <div>
        <Link
          href="/terceirizados"
          className="mb-2 inline-flex items-center gap-1 text-[12px] text-mute hover:text-ink"
        >
          <ChevronLeft size={14} /> Terceirizados
        </Link>
        <PageHeader
          kicker="Parceiro"
          title={terceirizado.nome}
          description={
            servicos.map((s) => s.nome).join(" · ") || "Sem serviços cadastrados"
          }
          actions={
            <Badge tone={terceirizado.ativo ? "mint" : "mute"}>
              {terceirizado.ativo ? "Ativo" : "Inativo"}
            </Badge>
          }
        />
      </div>

      <div className="flex h-9 max-w-lg overflow-hidden rounded-md border border-line">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            type="button"
            className={cn(
              "flex-1 px-2 text-[12px] transition-colors",
              i > 0 && "border-l border-line",
              aba === t.id ? "bg-elevated text-ink" : "text-mute hover:bg-elevated/50 hover:text-ink",
            )}
            onClick={() => setAba(t.id)}
          >
            {t.label}
            {typeof t.count === "number" ? (
              <span className="ml-1 text-faint">({t.count})</span>
            ) : null}
          </button>
        ))}
      </div>

      {aba === "ativas" ? (
        <section className="space-y-2">
          {!ativas.length ? (
            <p className="text-sm text-mute">Nenhuma OP ativa neste momento.</p>
          ) : (
            ativas.map((op) => {
              const micros = microsDoTerceirizado(op, id);
              const produto = state.produtos.find((p) => p.id === op.produtoId);
              const lista =
                micros.length > 0
                  ? micros
                  : [
                      {
                        id: `op-${op.id}`,
                        nome: "Serviço",
                        quantidade: op.quantidade,
                        status: "aguardando" as const,
                        macroId: op.stageId,
                        terceirizadoId: id,
                      },
                    ];
              return (
                <Card key={op.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/ops/${op.id}`}
                        className="text-[14px] font-semibold tracking-[-0.02em] text-sky hover:underline"
                      >
                        {op.numero}
                      </Link>
                      <p className="mt-0.5 text-[12px] text-mute">
                        {produto?.referencia} · {produto?.nome ?? "Produto"}
                      </p>
                      <p className="mt-1 text-[11px] text-faint">
                        {statusOpLabel[op.status]} · {nInt.format(op.quantidade)} pç
                      </p>
                    </div>
                    <Badge tone={op.urgente ? "rose" : op.prioridade ? "amber" : "mute"}>
                      {op.urgente ? "Urgente" : op.prioridade ? "Prioridade" : statusOpLabel[op.status]}
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-3">
                    {lista.map((micro) => {
                      const valor = micros.length
                        ? valorMicroTerceirizado(op, micro, state.terceirizados)
                        : 0;
                      const acerto = findAcerto(state.acertosTerceirizado, id, op.id, micro.id);
                      const saldo = acerto
                        ? totaisAcerto({ ...acerto, valorOriginal: valor || acerto.valorOriginal })
                        : null;
                      return (
                        <div key={micro.id} className="space-y-2 border-t border-line pt-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-[13px] font-medium text-ink">{micro.nome}</p>
                              <p className="text-[11px] text-faint">
                                {microStatusLabel[micro.status]} ·{" "}
                                {nInt.format(micro.quantidade || op.quantidade)} pç
                                {valor > 0 ? ` · ${brl.format(valor)}` : ""}
                              </p>
                            </div>
                            {acerto || saldo ? (
                              <Badge
                                tone={
                                  saldo && saldo.restante <= 0
                                    ? "mint"
                                    : acerto?.status === "pagando"
                                      ? "amber"
                                      : "mute"
                                }
                              >
                                {saldo && saldo.restante <= 0
                                  ? "Pago"
                                  : acerto
                                    ? acertoStatusLabel[acerto.status]
                                    : "Pendente"}
                              </Badge>
                            ) : null}
                          </div>
                          <AcertoControls
                            terceirizadoId={id}
                            opId={op.id}
                            microId={micro.id}
                            valorOriginal={valor}
                          />
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })
          )}
        </section>
      ) : null}

      {aba === "historico" ? (
        <section className="space-y-2">
          <p className="text-[12px] text-faint">
            OPs em que todos os serviços deste parceiro já foram concluídos.
          </p>
          {!historico.length ? (
            <p className="text-sm text-mute">Nenhuma OP no histórico ainda.</p>
          ) : (
            historico.map((op) => {
              const micros = microsDoTerceirizado(op, id).filter((m) => m.status === "concluida");
              const produto = state.produtos.find((p) => p.id === op.produtoId);
              return (
                <Card key={op.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link href={`/ops/${op.id}`} className="text-[14px] font-semibold text-sky hover:underline">
                        {op.numero}
                      </Link>
                      <p className="mt-0.5 text-[12px] text-mute">
                        {produto?.referencia} · {produto?.nome}
                      </p>
                    </div>
                    <Badge tone="mint">Concluído</Badge>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {micros.map((micro) => {
                      const valor = valorMicroTerceirizado(op, micro, state.terceirizados);
                      const acerto = findAcerto(state.acertosTerceirizado, id, op.id, micro.id);
                      const saldo = acerto
                        ? totaisAcerto({ ...acerto, valorOriginal: valor || acerto.valorOriginal })
                        : null;
                      return (
                        <li
                          key={micro.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-elevated/40 px-2.5 py-2 text-[12px]"
                        >
                          <span>
                            <span className="font-medium text-ink">{micro.nome}</span>
                            <span className="text-faint">
                              {" "}
                              · {nInt.format(micro.quantidade || op.quantidade)} pç
                              {valor ? ` · ${brl.format(valor)}` : ""}
                            </span>
                          </span>
                          <Badge
                            tone={
                              saldo && saldo.restante <= 0
                                ? "mint"
                                : acerto?.status === "pagando"
                                  ? "amber"
                                  : "mute"
                            }
                          >
                            {saldo && saldo.restante <= 0
                              ? "Pago"
                              : acerto
                                ? acertoStatusLabel[acerto.status]
                                : "Sem acerto"}
                          </Badge>
                        </li>
                      );
                    })}
                    {!micros.length ? (
                      <li className="text-[12px] text-faint">Sem micros concluídas registradas.</li>
                    ) : null}
                  </ul>
                </Card>
              );
            })
          )}
        </section>
      ) : null}

      {aba === "servicos" ? (
        <section className="space-y-3">
          <Card className="p-4">
            <p className="kicker mb-2">Serviços ativos (cadastro)</p>
            {servicos.length ? (
              <ul className="mb-3 space-y-2">
                {servicos.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 rounded-md bg-elevated/40 px-2.5 py-2 text-[13px]"
                  >
                    <span className="min-w-0">
                      <span className="font-medium text-ink">{s.nome}</span>
                      <span className="ml-2 text-mute">{brl.format(s.valorPorPeca)}/pç</span>
                    </span>
                    {isAdmin ? (
                      <button
                        type="button"
                        aria-label={`Remover ${s.nome}`}
                        className="grid h-8 w-8 place-items-center rounded-md text-faint hover:bg-elevated hover:text-rose"
                        onClick={() => removeServico(s.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-3 text-[12px] text-faint">Nenhum serviço cadastrado.</p>
            )}

            {isAdmin ? (
              <div className="grid gap-2 border-t border-line pt-3 sm:grid-cols-[1fr_120px_auto]">
                <Field label="Novo serviço">
                  <Input
                    value={novoServico}
                    onChange={(e) => setNovoServico(e.target.value)}
                    placeholder="Ex.: Costura reta"
                  />
                </Field>
                <Field label="R$/peça">
                  <Input
                    value={novoValor}
                    onChange={(e) => setNovoValor(e.target.value)}
                    placeholder="0,00"
                  />
                </Field>
                <div className="flex items-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!novoServico.trim()}
                    onClick={addServico}
                  >
                    <Plus size={14} />
                    Adicionar
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>

          <Card className="p-4">
            <p className="kicker mb-1">Em andamento</p>
            <p className="mb-3 text-[12px] text-faint">Atividades deste parceiro nas OPs ativas.</p>
            {microsAtivos.length ? (
              <ul className="space-y-2">
                {microsAtivos.map(({ op, micro }) => {
                  const valor = valorMicroTerceirizado(op, micro, state.terceirizados);
                  const acerto = findAcerto(state.acertosTerceirizado, id, op.id, micro.id);
                  const saldo = acerto
                    ? totaisAcerto({ ...acerto, valorOriginal: valor || acerto.valorOriginal })
                    : null;
                  return (
                    <li key={`${op.id}-${micro.id}`} className="space-y-2 rounded-md border border-line p-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                        <span>
                          <Link href={`/ops/${op.id}`} className="text-sky hover:underline">
                            {op.numero}
                          </Link>
                          <span className="text-mute"> · {micro.nome}</span>
                          {valor > 0 ? (
                            <span className="text-faint"> · {brl.format(valor)}</span>
                          ) : null}
                        </span>
                        <Badge>{microStatusLabel[micro.status]}</Badge>
                      </div>
                      <AcertoControls
                        terceirizadoId={id}
                        opId={op.id}
                        microId={micro.id}
                        valorOriginal={valor}
                      />
                      {saldo && saldo.restante <= 0 ? (
                        <p className="text-[11px] font-medium text-mint">Pago</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-[12px] text-faint">Nenhuma atividade em andamento.</p>
            )}
          </Card>

          <Card className="p-4">
            <p className="kicker mb-1">Histórico de serviços</p>
            <p className="mb-3 text-[12px] text-faint">Micros concluídas deste parceiro.</p>
            {microsHistorico.length ? (
              <ul className="space-y-2">
                {microsHistorico.slice(0, 40).map(({ op, micro }) => {
                  const valor = valorMicroTerceirizado(op, micro, state.terceirizados);
                  const acerto = findAcerto(state.acertosTerceirizado, id, op.id, micro.id);
                  const saldo = acerto
                    ? totaisAcerto({ ...acerto, valorOriginal: valor || acerto.valorOriginal })
                    : null;
                  return (
                    <li
                      key={`${op.id}-${micro.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 text-[12px]"
                    >
                      <span>
                        <Link href={`/ops/${op.id}`} className="text-sky hover:underline">
                          {op.numero}
                        </Link>
                        <span className="text-mute"> · {micro.nome}</span>
                      </span>
                      <span className="tabular-nums text-faint">
                        {saldo && saldo.restante <= 0 ? (
                          <span className="text-mint">Pago · {brl.format(valor)}</span>
                        ) : (
                          brl.format(valor)
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-[12px] text-faint">Ainda sem histórico de serviços.</p>
            )}
          </Card>
        </section>
      ) : null}
    </div>
  );
}
