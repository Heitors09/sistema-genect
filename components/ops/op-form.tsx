"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { brl, categoriaLabel, tipoNegocioLabel, todayISO, uid } from "@/lib/format";
import { readFiles } from "@/lib/files";
import { consumoEmEstoque, linhasReserva, tecidoBase } from "@/lib/ficha";
import { servicosDe, linhasValorServico } from "@/lib/migrate";
import type { AnexoOp, OpProdutoLinha, OpVariacao, OrdemProducao, RoteiroEtapaDef, TipoNegocio } from "@/lib/types";
import { useStore } from "@/lib/store/store";
import { Button, CreatableSelect, DateInput, Field, FileInput, Input, Select, Textarea } from "../ui";
import {
  RoteiroBuilder,
  defaultPassoSetor,
  etapasFromMicros,
} from "./roteiro-builder";
import { ValorServicoResumo } from "./valor-servico";

function packAtados(opNumero: string, qty: number, stageId: string) {
  const pack = 50;
  const n = Math.max(1, Math.ceil(qty / pack));
  return Array.from({ length: n }, (_, i) => ({
    id: uid("at"),
    codigo: `AT-${opNumero.replace(/^OP-/, "")}-${String(i + 1).padStart(2, "0")}`,
    quantidade: Math.min(pack, qty - i * pack),
    stageId,
    status: "aberto" as const,
  }));
}

export function OpForm({ initial, roteiroSel }: { initial?: OrdemProducao; roteiroSel?: string | null }) {
  const router = useRouter();
  const { state, dispatch, isAdmin } = useStore();
  const empresas = state.empresas.filter((e) => e.ativa);
  const clientes = state.clientes.filter((c) => c.ativo);
  const produtos = state.produtos;
  const terceiros = state.terceirizados.filter((t) => t.ativo);
  const initialProduto = produtos.find((p) => p.id === initial?.produtoId);

  const [numero, setNumero] = useState(initial?.numero ?? "");
  const [dataEntrada, setDataEntrada] = useState(initial?.dataEntrada ?? todayISO());
  const [empresaId, setEmpresaId] = useState(initial?.empresaId ?? empresas[0]?.id ?? "");
  const [clienteId, setClienteId] = useState(initial?.clienteId ?? clientes[0]?.id ?? "");
  const [produtoId, setProdutoId] = useState(initial?.produtoId ?? "");
  const [tipoNegocio, setTipoNegocio] = useState<TipoNegocio>(
    initial?.tipoNegocio ?? initialProduto?.tipoNegocio ?? "servico",
  );
  const [tipoTouched, setTipoTouched] = useState(!!initial);
  const [cor, setCor] = useState(initial?.cor ?? "");
  const [tamanho, setTamanho] = useState(initial?.linhas[0]?.tamanho ?? "");
  const [quantidade, setQuantidade] = useState(String(initial?.quantidade ?? 50));
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? "");
  const [loteId, setLoteId] = useState(initial?.lotesInsumo[0]?.loteId ?? "");
  const roteiroInicial =
    roteiroSel && state.roteiros.some((r) => r.id === roteiroSel)
      ? roteiroSel
      : (initial?.roteiroId ?? state.roteiros[0]?.id ?? "");
  const [roteiroId, setRoteiroId] = useState(roteiroInicial);
  const [passos, setPassos] = useState<RoteiroEtapaDef[]>(() => {
    if (initial?.micros.length) return etapasFromMicros(initial.micros);
    const modelo = state.roteiros.find((r) => r.id === roteiroInicial) ?? state.roteiros[0];
    return modelo?.etapas.length ? modelo.etapas.map((e) => ({ ...e, id: uid("rp") })) : [];
  });
  const [urgente, setUrgente] = useState(initial?.urgente ?? false);
  const [prioridade, setPrioridade] = useState(initial?.prioridade ?? false);
  const [variacoes, setVariacoes] = useState<OpVariacao[]>(
    initial?.linhas[0]?.variacoes?.length
      ? initial.linhas[0].variacoes
      : initial?.cor
        ? [{ tamanho: "", cor: initial.cor, quantidade: initial.quantidade }]
        : [],
  );
  const [extraLinhas, setExtraLinhas] = useState<OpProdutoLinha[]>(initial?.linhas.slice(1) ?? []);
  const [fotos, setFotos] = useState<string[]>(initial?.fotosFicha ?? []);
  const [anexos, setAnexos] = useState<AnexoOp[]>(initial?.anexos ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const produto = produtos.find((p) => p.id === produtoId);
  const tecido = produto ? tecidoBase(produto, state.insumos) : undefined;
  const lotes = state.lotes.filter((l) => l.insumoId === tecido?.insumoId && l.quantidadeRestante > 0);
  const loteIds = lotes.map((l) => l.id).join(",");
  const pecasGrade = variacoes.reduce((a, v) => a + (Number(v.quantidade) || 0), 0);
  const pecasCampo = Number(quantidade) || 0;
  const pecasProduto = pecasCampo > 0 ? pecasCampo : pecasGrade;
  const pecasExtra = extraLinhas
    .filter((l) => l.produtoId)
    .reduce((a, l) => a + (Number(l.quantidade) || 0), 0);
  const totalPecas = pecasProduto + pecasExtra;
  const consumo = (tecido?.consumoPorPeca ?? 0) * pecasProduto;
  const roteiro = state.roteiros.find((r) => r.id === roteiroId);

  useEffect(() => {
    if (!produto) return;
    setCor((atual) => (produto.cores.includes(atual) ? atual : (produto.cores[0] ?? "")));
    if (!tipoTouched) setTipoNegocio(produto.tipoNegocio ?? "servico");
    if (initial?.lotesInsumo[0]?.loteId) return;
    const ids = loteIds.split(",").filter(Boolean);
    setLoteId((atual) => (atual && ids.includes(atual) ? atual : (ids[0] ?? "")));
  }, [produto, loteIds, initial?.lotesInsumo, tipoTouched]);

  const reserva = useMemo(() => {
    const map = new Map<string, number>();
    function add(prod: typeof produto, pecas: number) {
      if (!prod || pecas <= 0) return;
      for (const linha of linhasReserva(prod, tipoNegocio)) {
        map.set(linha.insumoId, (map.get(linha.insumoId) ?? 0) + linha.consumoPorPeca * pecas);
      }
    }
    add(produto, pecasProduto);
    for (const l of extraLinhas) {
      const extra = state.produtos.find((p) => p.id === l.produtoId);
      add(extra, Number(l.quantidade) || 0);
    }
    return [...map.entries()].map(([insumoId, qtdConsumo]) => {
      const ins = state.insumos.find((i) => i.id === insumoId);
      const disp = ins ? ins.estoqueAtual - ins.reservado : 0;
      const need = ins ? consumoEmEstoque(qtdConsumo, ins) : qtdConsumo;
      return { insumoId, qtdConsumo, insumo: ins, disp, ok: disp >= need };
    });
  }, [produto, pecasProduto, extraLinhas, state.insumos, state.produtos, tipoNegocio]);
  const { linhas: linhasServico, total: valorServicos } = useMemo(
    () => linhasValorServico(passos, terceiros, totalPecas),
    [passos, terceiros, totalPecas],
  );

  function validate() {
    const e: Record<string, string> = {};
    if (!numero.trim()) e.numero = "Obrigatório";
    else if (numero.length > 100) e.numero = "Máximo de 100 caracteres";
    if (!dataEntrada) e.dataEntrada = "Obrigatório";
    if (!empresaId) e.empresaId = "Selecione a empresa";
    if (!clienteId) e.clienteId = "Selecione o cliente";
    if (!produto) e.produtoId = "Selecione o produto";
    const q = pecasProduto;
    if (!Number.isInteger(q) || q <= 0) e.quantidade = "Informe um inteiro maior que zero";
    if (observacoes.length > 2000) e.observacoes = "Máximo de 2.000 caracteres";
    if (!passos.length) e.roteiro = "Monte o roteiro desta OP";
    const semTerceiro = passos.find((p) => p.terceirizado && !p.terceirizadoId);
    if (semTerceiro) e.roteiro = "Escolha o terceirizado em cada parte terceirizada";
    const semSetor = passos.find((p) => !p.macroId);
    if (semSetor) e.roteiro = "Cada etapa precisa de um setor do quadro";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!isAdmin) return;
    if (!validate() || !produto) return;
    const q = pecasProduto;
    const stageId =
      initial?.stageId ??
      passos[0]?.macroId ??
      state.boardNodes.find((n) => n.kind === "recebimento")?.id ??
      state.boardNodes[0]?.id;
    const linhas: OpProdutoLinha[] = [
      {
        id: initial?.linhas[0]?.id ?? uid("lin"),
        produtoId: produto.id,
        quantidade: q,
        precoUnitario: produto.precoVenda || 0,
        tamanho: tamanho || undefined,
        variacoes: variacoes.filter((v) => v.cor && v.quantidade > 0),
      },
      ...extraLinhas.filter((l) => l.produtoId && l.quantidade > 0),
    ];
    const total = linhas.reduce((a, l) => a + l.quantidade, 0);
    const micros = passos.map((etapa, index) => {
      const prev = initial?.micros.find((m) => m.id === etapa.id);
      return {
        id: prev?.id ?? uid("mic"),
        nome: etapa.nome,
        macroId: etapa.macroId,
        quantidade: total,
        status: prev?.status ?? (index === 0 ? ("em_andamento" as const) : ("aguardando" as const)),
        iniciadaEm: prev?.iniciadaEm ?? (index === 0 ? new Date().toISOString() : undefined),
        concluidaEm: prev?.concluidaEm,
        terceirizadoId: etapa.terceirizado ? etapa.terceirizadoId : undefined,
        servicoId: etapa.terceirizado ? etapa.servicoId : undefined,
        altGroup: etapa.altGroup,
      };
    });
    const terceirizadoIds = [...new Set(passos.map((p) => p.terceirizadoId).filter(Boolean) as string[])];
    const op: OrdemProducao = {
      id: initial?.id ?? uid("op"),
      numero: numero.trim(),
      dataEntrada,
      empresaId,
      clienteId,
      produtoId: produto.id,
      tipoNegocio,
      cor,
      quantidade: total,
      precoUnitario: produto.precoVenda || 0,
      observacoes,
      terceirizadoIds,
      valorServicoPorPeca: total ? valorServicos / total : 0,
      quantidadeProduzida: initial?.quantidadeProduzida ?? 0,
      perdas: initial?.perdas ?? 0,
      refugo: initial?.refugo ?? 0,
      lotesInsumo: tipoNegocio === "fabricacao" && loteId ? [{ loteId, quantidade: consumo }] : [],
      parentOpId: initial?.parentOpId,
      atados: initial?.atados?.length ? initial.atados : packAtados(numero.trim(), total, stageId),
      status: initial?.status ?? "aberta",
      stageId,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      urgente: initial ? urgente : false,
      prioridade: initial ? prioridade : false,
      fotosFicha: fotos,
      anexos,
      linhas,
      roteiroId: roteiro?.id,
      roteiroNome: roteiro?.nome ?? "Personalizado",
      micros,
      pendencias: initial?.pendencias ?? [],
    };
    dispatch({ type: "SAVE_OP", op, isNew: !initial });
    router.push(`/ops/${op.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-3">
      <div className="grid gap-3 surface rounded-md p-4 lg:col-span-2">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Número da OP" error={errors.numero}>
            <Input value={numero} onChange={(e) => setNumero(e.target.value)} maxLength={100} required />
          </Field>
          <Field label="Data de entrada" error={errors.dataEntrada}>
            <DateInput value={dataEntrada} onChange={(e) => setDataEntrada(e.target.value)} required />
          </Field>
          <Field label="Empresa" error={errors.empresaId}>
            <Select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </Select>
          </Field>
          <Field label="Cliente" error={errors.clienteId} hint="Pode cadastrar um novo aqui mesmo">
            <CreatableSelect
              value={clienteId}
              emptyLabel="Selecione o cliente"
              addLabel="+ Novo cliente"
              addPlaceholder="Nome do cliente"
              options={clientes.map((c) => ({ value: c.id, label: c.nome }))}
              onChange={setClienteId}
              onAdd={(nome) => {
                const id = uid("cli");
                dispatch({
                  type: "SAVE_CLIENTE",
                  cliente: { id, nome, ativo: true },
                });
                setClienteId(id);
              }}
            />
          </Field>
          <Field label="Produto" error={errors.produtoId} hint={produto ? produto.referencia : "Produtos cadastrados"}>
            <Select
              value={produtoId}
              onChange={(e) => {
                setProdutoId(e.target.value);
                setTipoTouched(false);
              }}
              footer={
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center rounded-md px-2.5 py-2 text-left text-[12px] text-sky hover:bg-elevated/80"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => router.push("/produtos/novo?voltar=/ops/nova")}
                >
                  + Cadastrar produto
                </button>
              }
            >
              <option value="">Selecione o produto</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.referencia} · {p.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Modelo">
            <Select
              value={tipoNegocio}
              onChange={(e) => {
                setTipoTouched(true);
                setTipoNegocio(e.target.value as TipoNegocio);
              }}
            >
              <option value="servico">{tipoNegocioLabel.servico}</option>
              <option value="fabricacao">{tipoNegocioLabel.fabricacao}</option>
            </Select>
          </Field>
          <Field label="Cor" hint="Opcional na criação — detalhe por tamanho abaixo">
            <CreatableSelect
              value={cor}
              disabled={!produto}
              emptyLabel={produto ? "Selecione a cor" : "Selecione o produto"}
              options={(produto?.cores ?? []).map((c) => ({ value: c, label: c }))}
              addLabel="+ Nova cor"
              addPlaceholder="Ex.: Preto"
              onChange={setCor}
              onAdd={(nova) => {
                if (!produto) return;
                dispatch({ type: "ADD_PRODUCT_COLOR", produtoId: produto.id, cor: nova });
                setCor(nova);
              }}
            />
          </Field>
          <Field label="Tamanho" hint="Opcional">
            <CreatableSelect
              value={tamanho}
              disabled={!produto}
              emptyLabel="Sem tamanho"
              options={(state.tamanhosPadrao.length ? state.tamanhosPadrao : produto?.tamanhos ?? []).map((t) => ({
                value: t,
                label: t,
              }))}
              addLabel="+ Novo tamanho"
              addPlaceholder="Ex.: P"
              onChange={setTamanho}
              onAdd={(novo) => {
                dispatch({ type: "ADD_TAMANHO", tamanho: novo });
                if (produto) dispatch({ type: "ADD_PRODUCT_SIZE", produtoId: produto.id, tamanho: novo });
                setTamanho(novo);
              }}
            />
          </Field>
          <Field label="Quantidade" error={errors.quantidade} hint="Peças desta OP — entra no cálculo do serviço">
            <Input type="number" min={1} step={1} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
          </Field>
          <Field label="Preço unitário" hint="Opcional — vem do produto se houver">
            <Input readOnly value={produto?.precoVenda ? brl.format(produto.precoVenda) : "Não informado"} className="cursor-default text-mute" />
          </Field>
          {tipoNegocio === "fabricacao" && lotes.length > 1 ? (
            <Field label="Lote do tecido">
              <Select value={loteId} onChange={(e) => setLoteId(e.target.value)}>
                {lotes.map((l) => (
                  <option key={l.id} value={l.id}>
                    {(l.loteFabricante || "Entrada")} · restam {l.quantidadeRestante} {l.unidade}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
        </div>

        <div>
          <RoteiroBuilder
            passos={passos}
            onChange={setPassos}
            setores={state.boardNodes}
            terceirizados={state.terceirizados}
            modelos={state.roteiros}
            modeloId={roteiroId}
            onModelo={(id) => {
              setRoteiroId(id);
              if (!id) {
                setPassos([defaultPassoSetor(state.boardNodes)]);
                return;
              }
              const modelo = state.roteiros.find((r) => r.id === id);
              setPassos(modelo ? modelo.etapas.map((e) => ({ ...e, id: uid("rp") })) : []);
            }}
            onAddTerceirizado={(nome) => {
              const id = uid("ter");
              dispatch({
                type: "SAVE_TERCEIRIZADO",
                terceirizado: {
                  id,
                  nome,
                  servicos: [],
                  especialidade: "",
                  valorPorPeca: 0,
                  ativo: true,
                },
              });
              return id;
            }}
            onAddServico={(terceirizadoId, nome) => {
              const id = uid("svc");
              const atual = state.terceirizados.find((t) => t.id === terceirizadoId);
              if (!atual) return id;
              dispatch({
                type: "SAVE_TERCEIRIZADO",
                terceirizado: {
                  ...atual,
                  servicos: [...servicosDe(atual), { id, nome, valorPorPeca: 0 }],
                },
              });
              return id;
            }}
            modeloFooter={
              <>
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center rounded-md px-2.5 py-2 text-left text-[12px] text-sky hover:bg-elevated/80"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    router.push("/roteiros/novo?voltar=/ops/nova");
                  }}
                >
                  + Novo roteiro
                </button>
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center rounded-md px-2.5 py-2 text-left text-[12px] text-mute hover:bg-elevated/80 hover:text-ink"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    router.push(roteiroId ? `/roteiros/${roteiroId}?voltar=/ops/nova` : "/roteiros");
                  }}
                >
                  {roteiroId ? "Editar este roteiro" : "Editar roteiros"}
                </button>
              </>
            }
          />
          {errors.roteiro ? <p className="mt-1.5 text-[11px] text-rose">{errors.roteiro}</p> : null}
        </div>

        <div className="rounded-md border border-line p-3">
          <p className="kicker mb-2">Cores por tamanho</p>
          {variacoes.map((v, i) => (
            <div key={`${v.cor}-${i}`} className="mb-2 grid grid-cols-[1fr_1fr_90px_auto] items-center gap-2">
              <CreatableSelect
                value={v.tamanho}
                emptyLabel="Tamanho"
                options={state.tamanhosPadrao.map((t) => ({ value: t, label: t }))}
                addLabel="+ Tamanho"
                addPlaceholder="P"
                onChange={(val) => setVariacoes((prev) => prev.map((x, idx) => (idx === i ? { ...x, tamanho: val } : x)))}
                onAdd={(novo) => {
                  dispatch({ type: "ADD_TAMANHO", tamanho: novo });
                  setVariacoes((prev) => prev.map((x, idx) => (idx === i ? { ...x, tamanho: novo } : x)));
                }}
              />
              <CreatableSelect
                value={v.cor}
                emptyLabel="Cor"
                options={(produto?.cores ?? []).map((c) => ({ value: c, label: c }))}
                addLabel="+ Cor"
                addPlaceholder="Preto"
                onChange={(val) => setVariacoes((prev) => prev.map((x, idx) => (idx === i ? { ...x, cor: val } : x)))}
                onAdd={(nova) => {
                  if (produto) dispatch({ type: "ADD_PRODUCT_COLOR", produtoId: produto.id, cor: nova });
                  setVariacoes((prev) => prev.map((x, idx) => (idx === i ? { ...x, cor: nova } : x)));
                }}
              />
              <Input
                type="number"
                min={1}
                value={v.quantidade}
                onChange={(e) =>
                  setVariacoes((prev) => prev.map((x, idx) => (idx === i ? { ...x, quantidade: Number(e.target.value) } : x)))
                }
              />
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-md text-faint hover:bg-elevated hover:text-rose"
                aria-label="Remover cor / tamanho"
                onClick={() => setVariacoes((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setVariacoes((p) => [...p, { tamanho: tamanho || "P", cor: cor || "", quantidade: 1 }])}
          >
            Adicionar cor / tamanho
          </Button>
        </div>

        <div className="rounded-md border border-line p-3">
          <p className="kicker mb-2">Mais produtos nesta OP</p>
          {extraLinhas.map((linha, i) => (
            <div key={linha.id} className="mb-2 grid grid-cols-[1fr_90px_auto] items-center gap-2">
              <Select
                value={linha.produtoId}
                onChange={(e) =>
                  setExtraLinhas((prev) => prev.map((x, idx) => (idx === i ? { ...x, produtoId: e.target.value } : x)))
                }
                footer={
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center rounded-md px-2.5 py-2 text-left text-[12px] text-sky hover:bg-elevated/80"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => router.push("/produtos/novo?voltar=/ops/nova")}
                  >
                    + Cadastrar produto
                  </button>
                }
              >
                <option value="">Produto</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>{p.referencia} · {p.nome}</option>
                ))}
              </Select>
              <Input
                type="number"
                min={1}
                value={linha.quantidade}
                onChange={(e) =>
                  setExtraLinhas((prev) => prev.map((x, idx) => (idx === i ? { ...x, quantidade: Number(e.target.value) } : x)))
                }
              />
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-md text-faint hover:bg-elevated hover:text-rose"
                aria-label="Remover produto"
                onClick={() => setExtraLinhas((prev) => prev.filter((x) => x.id !== linha.id))}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() =>
              setExtraLinhas((p) => [
                ...p,
                { id: uid("lin"), produtoId: "", quantidade: 10, precoUnitario: 0, variacoes: [] },
              ])
            }
          >
            Adicionar produto
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Fotos da ficha" hint="Uma ou mais imagens">
            <FileInput
              accept="image/*"
              multiple
              emptyLabel="Nenhuma foto"
              actionLabel="Escolher"
              onFiles={async (files) => {
                const urls = await readFiles(files);
                setFotos((p) => [...p, ...urls]);
              }}
            />
            {fotos.length ? <p className="text-[11px] text-faint">{fotos.length} foto(s)</p> : null}
          </Field>
          <Field label="Romaneio" hint="JPG ou PDF">
            <FileInput
              accept="image/jpeg,application/pdf"
              multiple
              emptyLabel="Nenhum arquivo"
              actionLabel="Escolher"
              onFiles={async (files) => {
                const list = [...(files ?? [])];
                const urls = await readFiles(files);
                setAnexos((p) => [
                  ...p,
                  ...list.map((file, i) => ({
                    id: uid("ax"),
                    nome: file.name,
                    tipo: file.type.includes("pdf") ? ("pdf" as const) : ("jpg" as const),
                    dataUrl: urls[i],
                  })),
                ]);
              }}
            />
            {anexos.length ? <p className="text-[11px] text-faint">{anexos.map((a) => a.nome).join(", ")}</p> : null}
          </Field>
        </div>

        {initial ? (
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-[13px] text-ink">
              <input type="checkbox" checked={urgente} onChange={(e) => setUrgente(e.target.checked)} />
              Urgente
            </label>
            <label className="flex items-center gap-2 text-[13px] text-ink">
              <input type="checkbox" checked={prioridade} onChange={(e) => setPrioridade(e.target.checked)} />
              Prioridade
            </label>
          </div>
        ) : (
          <p className="text-[12px] text-faint">Urgência e prioridade são marcadas depois, na edição da OP.</p>
        )}

        <Field label="Observações" error={errors.observacoes} hint={`${observacoes.length}/2000`}>
          <Textarea value={observacoes} maxLength={2000} onChange={(e) => setObservacoes(e.target.value)} />
        </Field>
        {isAdmin ? (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
            <Button type="submit">{initial ? "Salvar OP" : "Criar OP"}</Button>
          </div>
        ) : null}
      </div>
      <aside className="space-y-3">
        <ValorServicoResumo pecas={totalPecas} linhas={linhasServico} total={valorServicos} />
        <div className="surface rounded-md p-4">
          <p className="kicker">{tipoNegocio === "servico" ? "Insumos do serviço" : "Ficha técnica"}</p>
          <p className="mt-1 text-[11px] text-faint">Reserva na unidade de consumo da ficha do produto.</p>
          {produto ? (
            reserva.length ? (
              <ul className="mt-3 space-y-2">
                {reserva.map((r) => (
                  <li key={r.insumoId} className="flex items-start justify-between gap-2 text-[12px]">
                    <span className="min-w-0">
                      <span className="text-ink">{r.insumo?.codigo}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-faint">
                        {r.insumo ? categoriaLabel[r.insumo.categoria] ?? r.insumo.categoria : "Insumo"}
                      </span>
                    </span>
                    <span className={r.ok ? "shrink-0 text-right text-mint" : "shrink-0 text-right text-rose"}>
                      {r.qtdConsumo.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} {r.insumo?.unidadeConsumo}
                      {r.insumo && r.insumo.fatorConversao !== 1 ? (
                        <span className="mt-0.5 block text-[10px] text-faint">
                          {consumoEmEstoque(r.qtdConsumo, r.insumo).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} {r.insumo.unidadeCompra} estoque
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[12px] text-faint">Nenhum insumo a reservar nesta OP.</p>
            )
          ) : (
            <p className="mt-3 text-[12px] text-faint">Selecione o produto para ver a ficha.</p>
          )}
        </div>
      </aside>
    </form>
  );
}
