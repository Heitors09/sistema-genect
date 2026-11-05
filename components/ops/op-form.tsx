"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { brl, categoriaLabel, formatDate, tipoNegocioLabel, todayISO, uid } from "@/lib/format";
import { addDays, FORMAS_PAGAMENTO, formaPagamentoLabel, gerarParcelas } from "@/lib/financeiro";
import { ParcelasEditor } from "../financeiro/parcelas-editor";
import { readFiles } from "@/lib/files";
import { consumoEmEstoque, linhasReserva, tecidoBase } from "@/lib/ficha";
import { servicosDe, linhasValorServico } from "@/lib/migrate";
import { notifyLive } from "@/lib/notif-live";
import { clearOpNovaDraft, readOpNovaDraft, writeOpNovaDraft } from "@/lib/op-form-draft";
import {
  gradeDoProduto,
  mergeGradeComCadastro,
  produtoTemVariacoesEstoque,
  tamanhosDoProduto,
} from "@/lib/produto-grade";
import { microsComGrafo } from "@/lib/roteiro-graph";
import type {
  AnexoOp,
  BoardNode,
  CondicaoPagamentoOp,
  FormaPagamento,
  ParcelaPrevista,
  OpProdutoLinha,
  OpVariacao,
  OrdemProducao,
  RoteiroModelo,
  TipoNegocio,
} from "@/lib/types";
import { newStage, useStore } from "@/lib/store/store";
import { Button, CreatableSelect, DateInput, Field, FileInput, Input, Select, Textarea, cn } from "../ui";
import {
  FluxoEditor,
  defaultPassoSetor,
  valueFromRoteiro,
  type FluxoEditorValue,
} from "../roteiro/fluxo-editor";
import { etapasFromMicros } from "./roteiro-builder";
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

function fluxoFromRoteiro(
  boardNodes: BoardNode[],
  roteiros: RoteiroModelo[],
  roteiroId: string,
): FluxoEditorValue {
  const modelo = roteiros.find((r) => r.id === roteiroId) ?? roteiros[0];
  if (!modelo?.etapas.length) {
    return { etapas: [defaultPassoSetor(boardNodes)], arestas: [], inicioId: undefined };
  }
  const idMap = new Map(modelo.etapas.map((e) => [e.id, uid("rp")] as const));
  const etapas = modelo.etapas.map((e) => ({ ...e, id: idMap.get(e.id)! }));
  const arestas = (modelo.arestas ?? []).map((a) => ({
    ...a,
    id: uid("rae"),
    fromId: idMap.get(a.fromId) ?? a.fromId,
    toId: idMap.get(a.toId) ?? a.toId,
  }));
  return {
    etapas,
    arestas,
    inicioId: modelo.inicioId ? idMap.get(modelo.inicioId) : etapas[0]?.id,
  };
}

export function OpForm({ initial, roteiroSel }: { initial?: OrdemProducao; roteiroSel?: string | null }) {
  const router = useRouter();
  const { state, dispatch, isAdmin } = useStore();
  const empresas = state.empresas.filter((e) => e.ativa);
  const clientes = state.clientes.filter((c) => c.ativo);
  const produtos = state.produtos;
  const terceiros = state.terceirizados.filter((t) => t.ativo);
  const initialProduto = produtos.find((p) => p.id === initial?.produtoId);

  const roteiroInicial =
    roteiroSel && state.roteiros.some((r) => r.id === roteiroSel)
      ? roteiroSel
      : (initial?.roteiroId ?? state.roteiros[0]?.id ?? "");

  const [numero, setNumero] = useState(initial?.numero ?? "");
  const [dataEntrada, setDataEntrada] = useState(initial?.dataEntrada ?? todayISO());
  const [empresaId, setEmpresaId] = useState(initial?.empresaId ?? empresas[0]?.id ?? "");
  const [clienteId, setClienteId] = useState(initial?.clienteId ?? clientes[0]?.id ?? "");
  const [produtoId, setProdutoId] = useState(initial?.produtoId ?? "");
  const [tipoNegocio, setTipoNegocio] = useState<TipoNegocio>(
    initial?.tipoNegocio ?? initialProduto?.tipoNegocio ?? "servico",
  );
  const [tipoTouched, setTipoTouched] = useState(!!initial);
  const [modoEntrada, setModoEntrada] = useState<"tamanho" | "variacao">(() => {
    if (!initialProduto) return "tamanho";
    if (!produtoTemVariacoesEstoque(initialProduto)) return "tamanho";
    const vars = initial?.linhas[0]?.variacoes ?? [];
    return vars.length > 1 ? "variacao" : "tamanho";
  });
  const [tamanho, setTamanho] = useState(initial?.linhas[0]?.tamanho ?? "");
  const [cor, setCor] = useState(initial?.cor ?? "");
  const [grade, setGrade] = useState<OpVariacao[]>(() => {
    if (initialProduto) {
      return mergeGradeComCadastro(initialProduto, initial?.linhas[0]?.variacoes);
    }
    return [];
  });
  const [quantidadeAvulsa, setQuantidadeAvulsa] = useState(
    String(initial?.quantidade ?? 50),
  );
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? "");
  const [loteId, setLoteId] = useState(initial?.lotesInsumo[0]?.loteId ?? "");
  const [roteiroId, setRoteiroId] = useState(roteiroInicial);
  const [fluxo, setFluxo] = useState<FluxoEditorValue>(() => {
    if (initial?.micros.length) {
      return valueFromRoteiro(
        etapasFromMicros(initial.micros),
        initial.microArestas,
        initial.microAtualId,
      );
    }
    return fluxoFromRoteiro(state.boardNodes, state.roteiros, roteiroInicial);
  });
  const passos = fluxo.etapas;
  const [urgente, setUrgente] = useState(initial?.urgente ?? false);
  const [prioridade, setPrioridade] = useState(initial?.prioridade ?? false);
  const [extraLinhas, setExtraLinhas] = useState<OpProdutoLinha[]>(initial?.linhas.slice(1) ?? []);
  const [fotos, setFotos] = useState<string[]>(initial?.fotosFicha ?? []);
  const [anexos, setAnexos] = useState<AnexoOp[]>(initial?.anexos ?? []);
  const [pagDataFat, setPagDataFat] = useState(
    initial?.pagamento?.dataFaturamento ?? addDays(todayISO(), 30),
  );
  const [pagForma, setPagForma] = useState<FormaPagamento>(initial?.pagamento?.formaPagamento ?? "boleto");
  const [pagPrazo, setPagPrazo] = useState(String(initial?.pagamento?.prazoDias ?? 0));
  /** null = parcelas calculadas automaticamente pelo total e prazo. */
  const [parcelasManual, setParcelasManual] = useState<ParcelaPrevista[] | null>(
    initial?.pagamento?.parcelas?.length ? initial.pagamento.parcelas : null,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draftReady, setDraftReady] = useState(!!initial);
  const skipNextDraftWrite = useRef(true);
  const suppressDraftRef = useRef(false);
  const produtosRef = useRef(state.produtos);
  produtosRef.current = state.produtos;
  const draftSnapRef = useRef({
    numero: "",
    dataEntrada: todayISO(),
    empresaId: "",
    clienteId: "",
    produtoId: "",
    tipoNegocio: "servico" as TipoNegocio,
    tipoTouched: false,
    tamanho: "",
    cor: "",
    quantidade: "50",
    modoEntrada: "tamanho" as "tamanho" | "variacao",
    grade: [] as OpVariacao[],
    observacoes: "",
    loteId: "",
    roteiroId: "",
    fluxo: { etapas: [], arestas: [] } as FluxoEditorValue,
    extraLinhas: [] as OpProdutoLinha[],
    fotos: [] as string[],
    anexos: [] as AnexoOp[],
    pagamento: undefined as CondicaoPagamentoOp | undefined,
  });

  const produto = produtos.find((p) => p.id === produtoId);
  const tecido = produto ? tecidoBase(produto, state.insumos) : undefined;
  const lotes = state.lotes.filter((l) => l.insumoId === tecido?.insumoId && l.quantidadeRestante > 0);
  const loteIds = lotes.map((l) => l.id).join(",");
  const temTamanhos = produto ? tamanhosDoProduto(produto).length > 0 : false;
  const temVariacoes = produto ? produtoTemVariacoesEstoque(produto) : false;
  const usandoVariacao = modoEntrada === "variacao" && temVariacoes;
  const pecasProduto = usandoVariacao
    ? grade.reduce((a, g) => a + (Number(g.quantidade) || 0), 0)
    : Number(quantidadeAvulsa) || 0;
  const pecasExtra = extraLinhas
    .filter((l) => l.produtoId)
    .reduce((a, l) => a + (Number(l.quantidade) || 0), 0);
  const totalPecas = pecasProduto + pecasExtra;
  const consumo = (tecido?.consumoPorPeca ?? 0) * pecasProduto;
  const roteiro = state.roteiros.find((r) => r.id === roteiroId);
  const tamanhosProduto = produto ? tamanhosDoProduto(produto) : [];
  const coresProduto = produto?.cores ?? [];
  /** Preço congelado na OP: edição de OP antiga mantém o preço original (reajuste só vale daqui pra frente). */
  const precoBase =
    initial && produto && initial.produtoId === produto.id
      ? initial.precoUnitario || produto.precoVenda || 0
      : produto?.precoVenda || 0;
  const precoLinhaExtra = (l: OpProdutoLinha) => {
    const anterior = initial?.linhas.find((x) => x.id === l.id && x.produtoId === l.produtoId);
    if (anterior) return anterior.precoUnitario || 0;
    return state.produtos.find((p) => p.id === l.produtoId)?.precoVenda || 0;
  };
  const valorVenda = Number(
    (
      precoBase * pecasProduto +
      extraLinhas
        .filter((l) => l.produtoId)
        .reduce((a, l) => a + precoLinhaExtra(l) * (Number(l.quantidade) || 0), 0)
    ).toFixed(2),
  );
  const primeiroVencimento = addDays(pagDataFat || todayISO(), Number(pagPrazo) || 0);
  const parcelasAuto = useMemo(
    () => gerarParcelas(valorVenda, 1, primeiroVencimento),
    [valorVenda, primeiroVencimento],
  );
  const parcelas = parcelasManual ?? parcelasAuto;
  const parcelasTouched = parcelasManual !== null;
  const pagamentoAtual: CondicaoPagamentoOp = {
    dataFaturamento: pagDataFat,
    formaPagamento: pagForma,
    prazoDias: Number(pagPrazo) || 0,
    parcelas,
  };


  useEffect(() => {
    if (!produto) return;
    if (!tipoTouched) setTipoNegocio(produto.tipoNegocio ?? "servico");
    if (tamanho && temTamanhos && !tamanhosProduto.includes(tamanho)) setTamanho("");
    setCor((atual) =>
      atual && coresProduto.some((c) => c.toLowerCase() === atual.toLowerCase()) ? atual : "",
    );
    if (modoEntrada === "variacao" && !temVariacoes) setModoEntrada("tamanho");
    if (initial?.lotesInsumo[0]?.loteId) return;
    const ids = loteIds.split(",").filter(Boolean);
    setLoteId((atual) => (atual && ids.includes(atual) ? atual : (ids[0] ?? "")));
  }, [
    produto,
    loteIds,
    initial?.lotesInsumo,
    tipoTouched,
    tamanho,
    temTamanhos,
    tamanhosProduto,
    coresProduto,
    modoEntrada,
    temVariacoes,
  ]);

  function aplicarProduto(id: string, existingGrade?: OpVariacao[]) {
    setProdutoId(id);
    setTipoTouched(false);
    const p = produtos.find((x) => x.id === id);
    // Cliente vinculado ao produto já vem preenchido.
    if (p?.clienteId && clientes.some((c) => c.id === p.clienteId)) setClienteId(p.clienteId);
    if (!p) {
      setGrade([]);
      setTamanho("");
      setCor("");
      setModoEntrada("tamanho");
      return;
    }
    const tams = tamanhosDoProduto(p);
    setTamanho(tams[0] ?? "");
    setCor("");
    setModoEntrada(produtoTemVariacoesEstoque(p) ? "variacao" : "tamanho");
    setGrade(mergeGradeComCadastro(p, existingGrade));
  }

  // Restaura rascunho após o mount (storage não existe no SSR).
  useEffect(() => {
    if (initial) return;
    const d = readOpNovaDraft();
    if (d) {
      setNumero(d.numero);
      setDataEntrada(d.dataEntrada || todayISO());
      if (d.empresaId) setEmpresaId(d.empresaId);
      if (d.clienteId) setClienteId(d.clienteId);
      setTipoNegocio(d.tipoNegocio);
      setTipoTouched(d.tipoTouched);
      setQuantidadeAvulsa(d.quantidade || "50");
      setTamanho(d.tamanho ?? "");
      setCor(d.cor ?? "");
      setModoEntrada(d.modoEntrada === "variacao" ? "variacao" : "tamanho");
      setObservacoes(d.observacoes);
      setLoteId(d.loteId);
      setRoteiroId(d.roteiroId);
      if (d.fluxo?.etapas?.length) setFluxo(d.fluxo);
      setExtraLinhas(d.extraLinhas ?? []);
      setFotos(d.fotos ?? []);
      setAnexos(d.anexos ?? []);
      if (d.pagamento) {
        setPagDataFat(d.pagamento.dataFaturamento || addDays(todayISO(), 30));
        setPagForma(d.pagamento.formaPagamento);
        setPagPrazo(String(d.pagamento.prazoDias ?? 0));
        if (d.pagamento.parcelas?.length) setParcelasManual(d.pagamento.parcelas);
      }
      if (d.produtoId) {
        const p = produtosRef.current.find((x) => x.id === d.produtoId);
        setProdutoId(d.produtoId);
        if (p) setGrade(mergeGradeComCadastro(p, d.grade));
        else setGrade(d.grade ?? []);
      }
    }
    skipNextDraftWrite.current = true;
    setDraftReady(true);
  }, [initial]);

  draftSnapRef.current = {
    numero,
    dataEntrada,
    empresaId,
    clienteId,
    produtoId,
    tipoNegocio,
    tipoTouched,
    tamanho,
    cor,
    quantidade: quantidadeAvulsa,
    modoEntrada,
    grade,
    observacoes,
    loteId,
    roteiroId,
    fluxo,
    extraLinhas,
    fotos,
    anexos,
    pagamento: { ...pagamentoAtual, parcelas: parcelasTouched ? parcelas : [] },
  };

  // Mantém rascunho em standby ao mudar de tela (produto, roteiro, etc.).
  useEffect(() => {
    if (initial || !draftReady) return;
    if (skipNextDraftWrite.current) {
      skipNextDraftWrite.current = false;
      return;
    }
    writeOpNovaDraft({
      numero,
      dataEntrada,
      empresaId,
      clienteId,
      produtoId,
      tipoNegocio,
      tipoTouched,
      tamanho,
      cor,
      quantidade: quantidadeAvulsa,
      modoEntrada,
      grade,
      observacoes,
      loteId,
      roteiroId,
      fluxo,
      extraLinhas,
      fotos,
      anexos,
      pagamento: { dataFaturamento: pagDataFat, formaPagamento: pagForma, prazoDias: Number(pagPrazo) || 0, parcelas: parcelasTouched ? parcelas : [] },
    });
  }, [
    pagDataFat,
    pagForma,
    pagPrazo,
    parcelasManual,
    initial,
    draftReady,
    numero,
    dataEntrada,
    empresaId,
    clienteId,
    produtoId,
    tipoNegocio,
    tipoTouched,
    tamanho,
    cor,
    modoEntrada,
    grade,
    quantidadeAvulsa,
    observacoes,
    loteId,
    roteiroId,
    fluxo,
    extraLinhas,
    fotos,
    anexos,
  ]);

  // Garante persistência ao sair da página (antes do unmount limpar efeitos).
  useEffect(() => {
    if (initial) return;
    return () => {
      if (suppressDraftRef.current) return;
      const snap = draftSnapRef.current;
      if (
        snap.numero.trim() ||
        snap.produtoId ||
        snap.observacoes.trim() ||
        snap.grade?.some((g) => g.quantidade > 0) ||
        (snap.quantidade && snap.quantidade !== "50") ||
        snap.fotos.length ||
        snap.anexos.length ||
        snap.extraLinhas.some((l) => l.produtoId)
      ) {
        writeOpNovaDraft(snap);
      }
    };
  }, [initial]);

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

  const faltantesKeyRef = useRef("");
  useEffect(() => {
    if (initial) return;
    const faltam = reserva.filter((r) => !r.ok);
    if (!faltam.length) {
      faltantesKeyRef.current = "";
      return;
    }
    const key = faltam
      .map((r) => `${r.insumoId}:${r.disp}:${r.qtdConsumo}`)
      .sort()
      .join("|");
    if (key === faltantesKeyRef.current) return;
    const t = window.setTimeout(() => {
      faltantesKeyRef.current = key;
      const nomes = faltam
        .map((r) => r.insumo?.codigo ?? "insumo")
        .slice(0, 3)
        .join(", ");
      notifyLive({
        id: uid("nf"),
        tipo: "estoque_insuficiente",
        titulo: faltam.length === 1 ? "Vai faltar insumo" : `Vai faltar ${faltam.length} insumos`,
        texto:
          faltam.length === 1
            ? `${nomes} sem estoque suficiente para esta OP.`
            : `${nomes}${faltam.length > 3 ? "…" : ""} sem estoque suficiente.`,
        lida: true,
        createdAt: new Date().toISOString(),
      });
    }, 450);
    return () => window.clearTimeout(t);
  }, [reserva, initial]);

  function validate() {
    const e: Record<string, string> = {};
    if (!numero.trim()) e.numero = "Obrigatório";
    else if (numero.length > 100) e.numero = "Máximo de 100 caracteres";
    if (!dataEntrada) e.dataEntrada = "Obrigatório";
    if (!empresaId) e.empresaId = "Selecione a empresa";
    if (!clienteId) e.clienteId = "Selecione o cliente";
    if (!produto) e.produtoId = "Selecione o produto";
    else if (usandoVariacao) {
      if (pecasProduto <= 0) e.grade = "Informe a quantidade em pelo menos uma variação";
      else if (!Number.isInteger(pecasProduto)) e.grade = "Quantidades da grade devem ser inteiras";
    } else {
      if (temTamanhos && !tamanho) e.tamanho = "Selecione o tamanho";
      const q = pecasProduto;
      if (!Number.isInteger(q) || q <= 0) e.quantidade = "Informe um inteiro maior que zero";
    }
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
    const gradeFinal = usandoVariacao
      ? grade.filter((g) => g.quantidade > 0)
      : tamanho
        ? [{ tamanho, cor: cor || "", quantidade: q }]
        : gradeDoProduto(produto, q);
    const extras = extraLinhas
      .filter((l) => l.produtoId && l.quantidade > 0)
      .map((l) => {
        const p = state.produtos.find((x) => x.id === l.produtoId);
        if (!p) return l;
        return {
          ...l,
          precoUnitario: precoLinhaExtra(l),
          variacoes: gradeDoProduto(p, l.quantidade),
        };
      });
    const linhas: OpProdutoLinha[] = [
      {
        id: initial?.linhas[0]?.id ?? uid("lin"),
        produtoId: produto.id,
        quantidade: q,
        precoUnitario: precoBase,
        tamanho: usandoVariacao
          ? gradeFinal.length === 1
            ? gradeFinal[0].tamanho || undefined
            : undefined
          : tamanho || undefined,
        variacoes: gradeFinal,
      },
      ...extras,
    ];
    const total = linhas.reduce((a, l) => a + l.quantidade, 0);
    const { micros, microArestas, microAtualId } = microsComGrafo(
      passos,
      fluxo.arestas,
      total,
      { existing: initial?.micros },
    );
    const terceirizadoIds = [...new Set(passos.map((p) => p.terceirizadoId).filter(Boolean) as string[])];
    const op: OrdemProducao = {
      id: initial?.id ?? uid("op"),
      numero: numero.trim(),
      dataEntrada,
      empresaId,
      clienteId,
      produtoId: produto.id,
      tipoNegocio,
      cor:
        (!usandoVariacao && cor) ||
        gradeFinal.find((g) => g.quantidade > 0)?.cor ||
        gradeFinal[0]?.cor ||
        produto.cores[0] ||
        "",
      quantidade: total,
      precoUnitario: precoBase,
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
      microArestas,
      microAtualId: initial?.microAtualId && micros.some((m) => m.id === initial.microAtualId)
        ? initial.microAtualId
        : microAtualId,
      pendencias: initial?.pendencias ?? [],
      pagamento: {
        ...pagamentoAtual,
        parcelas: parcelas.length ? parcelas : gerarParcelas(valorVenda, 1, primeiroVencimento),
      },
    };
    dispatch({ type: "SAVE_OP", op, isNew: !initial });
    if (!initial) {
      suppressDraftRef.current = true;
      clearOpNovaDraft();
    }
    router.push(`/ops/${op.id}`);
  }

  function discardDraft() {
    suppressDraftRef.current = true;
    clearOpNovaDraft();
    skipNextDraftWrite.current = true;
    setNumero("");
    setDataEntrada(todayISO());
    setEmpresaId(empresas[0]?.id ?? "");
    setClienteId(clientes[0]?.id ?? "");
    setProdutoId("");
    setTipoNegocio("servico");
    setTipoTouched(false);
    setGrade([]);
    setTamanho("");
    setCor("");
    setModoEntrada("tamanho");
    setQuantidadeAvulsa("50");
    setObservacoes("");
    setLoteId("");
    const rid = state.roteiros[0]?.id ?? "";
    setRoteiroId(rid);
    setFluxo(fluxoFromRoteiro(state.boardNodes, state.roteiros, rid));
    setExtraLinhas([]);
    setFotos([]);
    setAnexos([]);
    setPagDataFat(addDays(todayISO(), 30));
    setPagForma("boleto");
    setPagPrazo("0");
    setParcelasManual(null);
    setErrors({});
    queueMicrotask(() => {
      suppressDraftRef.current = false;
    });
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
              onChange={(e) => aplicarProduto(e.target.value)}
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
          <Field label="Preço unitário" hint="Opcional — vem do produto se houver">
            <Input readOnly value={precoBase ? brl.format(precoBase) : "Não informado"} className="cursor-default text-mute" />
          </Field>
          {produto && temVariacoes ? (
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-[11px] text-faint">Como informar a grade</p>
              <div className="flex h-9 max-w-md overflow-hidden rounded-md border border-line">
                <button
                  type="button"
                  className={cn(
                    "flex-1 px-3 text-[12px] transition-colors",
                    !usandoVariacao ? "bg-elevated text-ink" : "text-mute hover:bg-elevated/50 hover:text-ink",
                  )}
                  onClick={() => setModoEntrada("tamanho")}
                >
                  Por tamanho
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex-1 border-l border-line px-3 text-[12px] transition-colors",
                    usandoVariacao ? "bg-elevated text-ink" : "text-mute hover:bg-elevated/50 hover:text-ink",
                  )}
                  onClick={() => {
                    setModoEntrada("variacao");
                    if (produto) setGrade((prev) => mergeGradeComCadastro(produto, prev));
                  }}
                >
                  Por variação
                </button>
              </div>
            </div>
          ) : null}
          {!usandoVariacao ? (
            <>
              <Field
                label="Tamanho"
                error={errors.tamanho}
                hint={
                  !produto
                    ? "Selecione o produto"
                    : temTamanhos
                      ? "Tamanhos cadastrados no produto"
                      : "Produto sem tamanhos — cadastre no produto"
                }
              >
                <Select
                  value={tamanho}
                  disabled={!produto || !temTamanhos}
                  onChange={(e) => setTamanho(e.target.value)}
                >
                  <option value="">
                    {!produto
                      ? "Selecione o produto"
                      : temTamanhos
                        ? "Selecione o tamanho"
                        : "Sem tamanhos no cadastro"}
                  </option>
                  {tamanhosProduto.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
              {coresProduto.length ? (
                <Field label="Cor" hint="Opcional — cores do produto">
                  <Select value={cor} disabled={!produto} onChange={(e) => setCor(e.target.value)}>
                    <option value="">Todas / não especificar</option>
                    {coresProduto.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
              <Field label="Quantidade" error={errors.quantidade} hint="Peças desta OP">
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={quantidadeAvulsa}
                  onChange={(e) => setQuantidadeAvulsa(e.target.value)}
                />
              </Field>
            </>
          ) : (
            <div className="sm:col-span-2 rounded-md border border-line p-3">
              <p className="kicker mb-1">Grade por variação</p>
              <p className="mb-2 text-[12px] text-faint">
                Tamanho e cor do cadastro — informe a quantidade de cada combinação.
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {grade.map((g, i) => (
                  <div
                    key={`${g.tamanho}-${g.cor}-${i}`}
                    className="grid grid-cols-[1fr_72px] items-center gap-2 rounded-md bg-elevated/40 px-2 py-1.5"
                  >
                    <span className="truncate text-[12px] text-ink">
                      <span className="font-medium">{g.tamanho || "—"}</span>
                      {g.cor ? <span className="text-mute"> · {g.cor}</span> : null}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={g.quantidade || ""}
                      placeholder="0"
                      className="h-8 text-center"
                      onChange={(e) => {
                        const qtd = Math.max(0, Math.floor(Number(e.target.value) || 0));
                        setGrade((prev) =>
                          prev.map((x, idx) => (idx === i ? { ...x, quantidade: qtd } : x)),
                        );
                      }}
                    />
                  </div>
                ))}
              </div>
              {errors.grade ? <p className="mt-1.5 text-[11px] text-rose">{errors.grade}</p> : null}
              <p className="mt-2 text-[11px] text-faint">
                Total: {pecasProduto.toLocaleString("pt-BR")} peça{pecasProduto === 1 ? "" : "s"}
              </p>
            </div>
          )}
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

        <div className="space-y-2">
          <Field label="Modelo de roteiro" hint="Carrega o fluxograma — você pode editar os cards nesta OP">
            <Select
              value={roteiroId}
              onChange={(e) => {
                const id = e.target.value;
                setRoteiroId(id);
                if (!id) {
                  const etapa = defaultPassoSetor(state.boardNodes);
                  setFluxo({ etapas: [etapa], arestas: [], inicioId: etapa.id });
                  return;
                }
                const modelo = state.roteiros.find((r) => r.id === id);
                if (!modelo) return;
                const idMap = new Map(modelo.etapas.map((et) => [et.id, uid("rp")] as const));
                const etapas = modelo.etapas.map((et) => ({ ...et, id: idMap.get(et.id)! }));
                const arestas = (modelo.arestas ?? []).map((a) => ({
                  ...a,
                  id: uid("rae"),
                  fromId: idMap.get(a.fromId) ?? a.fromId,
                  toId: idMap.get(a.toId) ?? a.toId,
                }));
                setFluxo({
                  etapas,
                  arestas,
                  inicioId: modelo.inicioId ? idMap.get(modelo.inicioId) : etapas[0]?.id,
                });
              }}
            >
              <option value="">Personalizado nesta OP</option>
              {state.roteiros.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex flex-wrap gap-2 text-[12px]">
            <button
              type="button"
              className="text-sky hover:underline"
              onClick={() => router.push("/roteiros/novo?voltar=/ops/nova")}
            >
              + Novo roteiro
            </button>
            {roteiroId ? (
              <button
                type="button"
                className="text-mute hover:text-ink hover:underline"
                onClick={() => router.push(`/roteiros/${roteiroId}?voltar=/ops/nova`)}
              >
                Editar modelo
              </button>
            ) : null}
          </div>
          <FluxoEditor
            value={fluxo}
            onChange={setFluxo}
            setores={state.boardNodes}
            terceirizados={state.terceirizados}
            kicker="Micro-caminho desta OP"
            hint="Caminho linear desta OP. Bifurcação só com OP filha depois de criar."
            onAddSetor={(nomeNovo) => {
              const x = Math.max(0, ...state.boardNodes.map((n) => n.x), 0) + 280;
              const node = newStage("custom", nomeNovo.trim() || "Novo card", x, 140);
              const last = [...state.boardNodes].sort((a, b) => a.x - b.x).at(-1);
              dispatch({
                type: "SET_BOARD",
                nodes: [...state.boardNodes, node],
                edges: last
                  ? [...state.boardEdges, { id: `e-${node.id}`, source: last.id, target: node.id }]
                  : state.boardEdges,
              });
              return node.id;
            }}
            onRenameSetor={(setorId, nomeNovo) => {
              dispatch({ type: "RENAME_STAGE", id: setorId, label: nomeNovo.trim() || "Setor" });
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
          />
          {errors.roteiro ? <p className="mt-1.5 text-[11px] text-rose">{errors.roteiro}</p> : null}
        </div>

        {produto && !temTamanhos && !temVariacoes ? (
          <div className="rounded-md border border-dashed border-line p-3">
            <p className="text-[12px] text-faint">
              Este produto não tem tamanhos cadastrados.{" "}
              <button
                type="button"
                className="text-sky hover:underline"
                onClick={() =>
                  router.push(
                    `/produtos/${produto.id}${initial ? "" : "?voltar=/ops/nova"}`,
                  )
                }
              >
                Completar cadastro
              </button>
            </p>
          </div>
        ) : null}

        <div className="rounded-md border border-line p-3">
          <p className="kicker mb-1">Mais produtos nesta OP</p>
          <p className="mb-2 text-[12px] text-faint">
            Cor, tamanho e preço vêm do cadastro de cada produto — só informe a quantidade.
          </p>
          {extraLinhas.map((linha, i) => {
            const extra = state.produtos.find((p) => p.id === linha.produtoId);
            const gradeExtra = extra ? gradeDoProduto(extra, linha.quantidade || 0) : [];
            return (
              <div key={linha.id} className="mb-2">
                <div className="grid grid-cols-[1fr_90px_auto] items-center gap-2">
                  <Select
                    value={linha.produtoId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const p = state.produtos.find((x) => x.id === id);
                      setExtraLinhas((prev) =>
                        prev.map((x, idx) =>
                          idx === i
                            ? {
                                ...x,
                                produtoId: id,
                                precoUnitario: p?.precoVenda || 0,
                                variacoes: p ? gradeDoProduto(p, x.quantidade || 0) : [],
                              }
                            : x,
                        ),
                      );
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
                    <option value="">Produto</option>
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.referencia} · {p.nome}
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    value={linha.quantidade}
                    onChange={(e) => {
                      const qtd = Number(e.target.value);
                      setExtraLinhas((prev) =>
                        prev.map((x, idx) => {
                          if (idx !== i) return x;
                          const p = state.produtos.find((prod) => prod.id === x.produtoId);
                          return {
                            ...x,
                            quantidade: qtd,
                            variacoes: p ? gradeDoProduto(p, qtd || 0) : x.variacoes,
                          };
                        }),
                      );
                    }}
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
                {extra ? (
                  <p className="mt-1 pl-0.5 text-[11px] text-faint">
                    {extra.cores.length ? `Cores: ${extra.cores.join(" · ")}` : "Sem cores no cadastro"}
                    {extra.tamanhos.length ? ` · Tamanhos: ${extra.tamanhos.join(", ")}` : ""}
                    {extra.precoVenda ? ` · ${brl.format(extra.precoVenda)}` : ""}
                    {gradeExtra.length
                      ? ` · Grade: ${gradeExtra.map((v) => `${v.tamanho || "—"} ${v.cor} (${v.quantidade})`).join(" · ")}`
                      : ""}
                  </p>
                ) : null}
              </div>
            );
          })}
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

        <div className="space-y-3 rounded-md border border-line p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div>
              <p className="kicker">Faturamento e pagamento</p>
              <p className="mt-0.5 text-[11px] text-faint">Previsão de pagamento da OP</p>
            </div>
            <span className="text-[12px] tabular-nums text-mute">
              Valor da OP <span className="font-medium text-ink">{brl.format(valorVenda)}</span>
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Data de faturamento">
              <DateInput value={pagDataFat} onChange={(e) => setPagDataFat(e.target.value)} />
            </Field>
            <Field label="Forma de pagamento">
              <Select value={pagForma} onChange={(e) => setPagForma(e.target.value as FormaPagamento)}>
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f} value={f}>{formaPagamentoLabel[f]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Prazo (dias)" hint={`1º vencimento ${formatDate(primeiroVencimento)}`}>
              <Input
                type="number"
                min={0}
                value={pagPrazo}
                onChange={(e) => setPagPrazo(e.target.value)}
              />
            </Field>
          </div>
          <ParcelasEditor
            total={valorVenda}
            primeiroVencimento={primeiroVencimento}
            value={parcelas}
            onChange={setParcelasManual}
          />
          {parcelasTouched ? (
            <button
              type="button"
              className="text-left text-[11px] text-sky hover:underline"
              onClick={() => setParcelasManual(null)}
            >
              Voltar ao cálculo automático
            </button>
          ) : null}
          <p className="text-[11px] text-faint">
            Prazo e parcelas vão para Receitas como vencimento do valor a receber ao faturar.
          </p>
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
          <div className="flex flex-wrap justify-end gap-2">
            {!initial ? (
              <Button type="button" variant="ghost" onClick={discardDraft}>
                Descartar rascunho
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancelar
            </Button>
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
                {reserva.map((r) => {
                  const need = r.insumo ? consumoEmEstoque(r.qtdConsumo, r.insumo) : r.qtdConsumo;
                  return (
                    <li
                      key={r.insumoId}
                      className={cn(
                        "rounded-md px-2 py-1.5 text-[12px]",
                        r.ok ? "text-ink" : "bg-rose/8 text-rose ring-1 ring-rose/15",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className={cn("font-medium", r.ok ? "text-ink" : "text-rose")}>
                            {r.insumo?.codigo}
                          </span>
                          <span
                            className={cn(
                              "mt-0.5 block truncate text-[11px]",
                              r.ok ? "text-faint" : "text-rose/80",
                            )}
                          >
                            {r.insumo ? categoriaLabel[r.insumo.categoria] ?? r.insumo.categoria : "Insumo"}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-right",
                            r.ok ? "text-mint" : "text-rose",
                          )}
                        >
                          {r.qtdConsumo.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}{" "}
                          {r.insumo?.unidadeConsumo}
                          {r.insumo && r.insumo.fatorConversao !== 1 ? (
                            <span
                              className={cn(
                                "mt-0.5 block text-[10px]",
                                r.ok ? "text-faint" : "text-rose/75",
                              )}
                            >
                              {need.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}{" "}
                              {r.insumo.unidadeCompra} estoque
                            </span>
                          ) : null}
                        </span>
                      </div>
                      {!r.ok ? (
                        <p className="mt-1 text-[10px] leading-snug text-rose/90">
                          Vai faltar — disponível{" "}
                          {r.disp.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                          {r.insumo?.unidadeCompra ? ` ${r.insumo.unidadeCompra}` : ""}
                          , precisa{" "}
                          {need.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                          {r.insumo?.unidadeCompra ? ` ${r.insumo.unidadeCompra}` : ""}.
                        </p>
                      ) : null}
                    </li>
                  );
                })}
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
