import { stageColors, uid } from "./format";
import { MACRO_STAGES, opAtrasada } from "./prazos";
import { ensureOpMicroGraph, ensureRoteiroGraph, microsComGrafo } from "./roteiro-graph";
import type {
  AppState,
  MicroEtapa,
  OrdemProducao,
  Produto,
  RoteiroModelo,
  ServicoTerceirizado,
  Terceirizado,
} from "./types";

export const ROTEIRO_PADRAO: RoteiroModelo = ensureRoteiroGraph({
  id: "rot-padrao",
  nome: "Padrão confecção",
  etapas: [
    { id: "rp-1", nome: "Conferência de entrada", macroId: "st-recebimento" },
    { id: "rp-2", nome: "Corte", macroId: "st-corte" },
    { id: "rp-3", nome: "Costura reta", macroId: "st-costura", terceirizado: true },
    { id: "rp-4", nome: "Overloque", macroId: "st-costura", terceirizado: true },
    { id: "rp-5", nome: "Acabamento", macroId: "st-acabamento" },
    { id: "rp-6", nome: "Revisão", macroId: "st-revisao" },
    { id: "rp-7", nome: "Expedição", macroId: "st-expedicao" },
  ],
});

/** Exemplo com bifurcação: montagem interna ou facção, reúnem na lavanderia. */
export const ROTEIRO_JEANS: RoteiroModelo = ensureRoteiroGraph({
  id: "rot-jeans",
  nome: "Calça / jeans",
  etapas: [
    { id: "rj-1", nome: "Recebimento do tecido", macroId: "st-recebimento" },
    { id: "rj-2", nome: "Corte", macroId: "st-corte" },
    { id: "rj-3a", nome: "Montagem interna", macroId: "st-costura" },
    { id: "rj-3b", nome: "Montagem facção", macroId: "st-costura", terceirizado: true },
    { id: "rj-4", nome: "Lavanderia", macroId: "st-acabamento", terceirizado: true },
    { id: "rj-5", nome: "Revisão", macroId: "st-revisao" },
    { id: "rj-6", nome: "Expedição", macroId: "st-expedicao" },
  ],
  arestas: [
    { id: "rje-1", fromId: "rj-1", toId: "rj-2", kind: "sequencia" },
    { id: "rje-2", fromId: "rj-2", toId: "rj-3a", kind: "bifurcacao", label: "interno" },
    { id: "rje-3", fromId: "rj-2", toId: "rj-3b", kind: "filha", label: "filha" },
    { id: "rje-4", fromId: "rj-3a", toId: "rj-4", kind: "reuniao" },
    { id: "rje-5", fromId: "rj-3b", toId: "rj-4", kind: "reuniao", label: "reúne" },
    { id: "rje-6", fromId: "rj-4", toId: "rj-5", kind: "sequencia" },
    { id: "rje-7", fromId: "rj-5", toId: "rj-6", kind: "sequencia" },
  ],
  inicioId: "rj-1",
});

export function servicosDe(t: Terceirizado): ServicoTerceirizado[] {
  if (t.servicos?.length) return t.servicos;
  if (t.especialidade || (t.valorPorPeca ?? 0) > 0) {
    return [{ id: `${t.id}-svc`, nome: t.especialidade || "Serviço", valorPorPeca: t.valorPorPeca ?? 0 }];
  }
  return [];
}

export function valorServicoTerceirizado(t: Terceirizado, servicoId?: string) {
  const servicos = servicosDe(t);
  return (servicoId ? servicos.find((s) => s.id === servicoId) : servicos[0])?.valorPorPeca ?? t.valorPorPeca ?? 0;
}

export type EtapaValorServico = {
  id: string;
  nome?: string;
  terceirizado?: boolean;
  terceirizadoId?: string;
  servicoId?: string;
  altGroup?: string;
};

export type LinhaValorServico = {
  id: string;
  terceirizadoNome: string;
  servicoNome: string;
  pecas: number;
  valorPorPeca: number;
  total: number;
  alternativa: boolean;
  pendente?: "terceirizado" | "servico" | "valor";
};

export function linhasValorServico(
  etapas: EtapaValorServico[],
  terceirizados: Terceirizado[],
  pecas: number,
): { linhas: LinhaValorServico[]; total: number } {
  const qty = Number.isFinite(pecas) && pecas > 0 ? pecas : 0;
  const linhas: LinhaValorServico[] = [];
  etapas.forEach((etapa, index) => {
    const isTerceiro = Boolean(etapa.terceirizado || etapa.terceirizadoId);
    if (!isTerceiro) return;
    const prev = etapas[index - 1];
    const alternativa = Boolean(etapa.altGroup && prev?.altGroup === etapa.altGroup);
    const t = terceirizados.find((x) => x.id === etapa.terceirizadoId);
    if (!t) {
      linhas.push({
        id: etapa.id,
        terceirizadoNome: "Terceirizado",
        servicoNome: etapa.nome || "Serviço",
        pecas: qty,
        valorPorPeca: 0,
        total: 0,
        alternativa,
        pendente: "terceirizado",
      });
      return;
    }
    const servicos = servicosDe(t);
    const servico = etapa.servicoId
      ? servicos.find((s) => s.id === etapa.servicoId)
      : servicos[0];
    if (!servico) {
      linhas.push({
        id: etapa.id,
        terceirizadoNome: t.nome,
        servicoNome: etapa.nome || "Serviço",
        pecas: qty,
        valorPorPeca: 0,
        total: 0,
        alternativa,
        pendente: "servico",
      });
      return;
    }
    const valorPorPeca = servico.valorPorPeca || t.valorPorPeca || 0;
    linhas.push({
      id: etapa.id,
      terceirizadoNome: t.nome,
      servicoNome: servico.nome,
      pecas: qty,
      valorPorPeca,
      total: qty * valorPorPeca,
      alternativa,
      pendente: valorPorPeca > 0 ? undefined : "valor",
    });
  });
  const total = linhas.filter((l) => !l.alternativa).reduce((sum, l) => sum + l.total, 0);
  return { linhas, total };
}

export function microsFromRoteiro(
  roteiro: RoteiroModelo,
  quantidade: number,
  terceirizadoId?: string,
  servicoId?: string,
): MicroEtapa[] {
  const g = ensureRoteiroGraph(roteiro);
  return microsComGrafo(g.etapas, g.arestas, quantidade, { terceirizadoId, servicoId }).micros;
}

export function valorServicosOp(op: OrdemProducao, terceirizados: Terceirizado[], pecas?: number) {
  const qty = pecas ?? (op.quantidadeProduzida || op.quantidade);
  const { total } = linhasValorServico(op.micros, terceirizados, qty);
  if (total > 0) return total;
  return qty * (op.valorServicoPorPeca || 0);
}

function defaultBoard() {
  return MACRO_STAGES.map((stage, index) => ({
    id: stage.id,
    kind: stage.kind,
    label: stage.label,
    color: stageColors[stage.kind],
    x: 24 + index * 280,
    y: 140,
  }));
}

function mapLegacyStage(id: string) {
  if (id === "st-faccao") return "st-costura";
  if (id === "st-embalagem") return "st-acabamento";
  return id;
}

export function migrateState(raw: AppState): AppState {
  const roteiros = (raw.roteiros?.length ? raw.roteiros : [ROTEIRO_PADRAO, ROTEIRO_JEANS]).map((r) =>
    ensureRoteiroGraph(r),
  );
  const padrao = roteiros[0] ?? ROTEIRO_PADRAO;

  const terceirizados = (raw.terceirizados ?? []).map((t) => {
    const servicos = servicosDe(t);
    return {
      ...t,
      servicos,
      especialidade: servicos.map((s) => s.nome).join(", "),
      valorPorPeca: servicos[0]?.valorPorPeca ?? t.valorPorPeca ?? 0,
    };
  });

  const produtos: Produto[] = (raw.produtos ?? []).map((p) => {
    const tamanhos = p.tamanhos ?? [];
    const cores = p.cores ?? [];
    const variacoes =
      p.variacoes?.length
        ? p.variacoes
        : tamanhos.length
          ? tamanhos.map((tamanho) => ({ tamanho, cores }))
          : cores.length
            ? [{ tamanho: "", cores }]
            : [];
    return {
      id: p.id,
      referencia: p.referencia,
      nome: p.nome,
      tipoNegocio: p.tipoNegocio ?? "servico",
      categoria: p.categoria ?? "",
      linha: p.linha ?? "",
      cores,
      tamanhos,
      variacoes,
      materiaPrimaId: p.materiaPrimaId ?? "",
      consumoTecidoPorPeca: p.consumoTecidoPorPeca ?? 0,
      aviamentos: p.aviamentos ?? [],
      precoVenda: p.precoVenda ?? 0,
      descricao: p.descricao ?? "",
      imagens: p.imagens ?? [],
    };
  });

  const ops: OrdemProducao[] = (raw.ops ?? []).map((op) => {
    const stageId = mapLegacyStage(op.stageId);
    const terceirizadoId = op.terceirizadoIds[0];
    const t = terceirizados.find((x) => x.id === terceirizadoId);
    const microsRaw =
      op.micros?.length
        ? op.micros.map((m) => ({ ...m, macroId: mapLegacyStage(m.macroId) }))
        : microsFromRoteiro(padrao, op.quantidade, terceirizadoId, t?.servicos[0]?.id).map((m) =>
            m.macroId === stageId ? { ...m, status: "em_andamento" as const } : m,
          );
    const graph = ensureOpMicroGraph({
      micros: microsRaw,
      microArestas: op.microArestas,
      microAtualId: op.microAtualId,
    });
    const produto = produtos.find((p) => p.id === op.produtoId);
    return {
      ...op,
      stageId,
      atados: (op.atados ?? []).map((a) => ({ ...a, stageId: mapLegacyStage(a.stageId) })),
      urgente: op.urgente ?? false,
      prioridade: op.prioridade ?? false,
      fotosFicha: op.fotosFicha ?? [],
      anexos: op.anexos ?? [],
      linhas:
        op.linhas?.length
          ? op.linhas
          : [
              {
                id: uid("lin"),
                produtoId: op.produtoId,
                quantidade: op.quantidade,
                precoUnitario: op.precoUnitario,
                variacoes: op.cor
                  ? [{ tamanho: produto?.tamanhos[0] ?? "", cor: op.cor, quantidade: op.quantidade }]
                  : [],
              },
            ],
      roteiroId: op.roteiroId ?? padrao.id,
      roteiroNome: op.roteiroNome ?? padrao.nome,
      micros: graph.micros,
      microArestas: graph.microArestas,
      microAtualId: graph.microAtualId,
      pendencias: op.pendencias ?? [],
    };
  });

  const macros = defaultBoard();
  const hasMacros = MACRO_STAGES.every((m) => (raw.boardNodes ?? []).some((n) => n.id === m.id));
  const boardNodes = hasMacros
    ? raw.boardNodes.filter((n) => n.id !== "st-faccao" && n.id !== "st-embalagem")
    : macros;
  const boardEdges = hasMacros
    ? (raw.boardEdges ?? []).filter((e) => e.source !== "st-faccao" && e.target !== "st-faccao" && e.source !== "st-embalagem" && e.target !== "st-embalagem")
    : macros.slice(0, -1).map((n, i) => ({
        id: `e-m${i}`,
        source: n.id,
        target: macros[i + 1].id,
      }));

  const nodeIds = new Set(boardNodes.map((n) => n.id));
  const fallbackStage = boardNodes.find((n) => n.kind === "recebimento")?.id ?? boardNodes[0]?.id;
  const opsOnBoard = ops.map((op) => {
    const stageId = op.stageId && nodeIds.has(op.stageId) ? op.stageId : fallbackStage ?? op.stageId;
    return {
      ...op,
      stageId,
      atados: (op.atados ?? []).map((a) => ({
        ...a,
        stageId: a.stageId && nodeIds.has(a.stageId) ? a.stageId : stageId,
      })),
    };
  });

  const atrasadas = opsOnBoard.filter(opAtrasada).map((op) => ({
    id: `nt-atr-${op.id}`,
    tipo: "op_atrasada" as const,
    titulo: `${op.numero} atrasada`,
    texto: `${op.numero} ultrapassou o prazo de 20 dias úteis.`,
    opId: op.id,
    lida: false,
    createdAt: new Date().toISOString(),
  }));

  const existentes = new Set((raw.notificacoes ?? []).map((n) => `${n.tipo}:${n.opId ?? n.id}`));
  const notificacoes = [
    ...(raw.notificacoes ?? []),
    ...atrasadas.filter((n) => !existentes.has(`${n.tipo}:${n.opId}`)),
  ];

  return {
    ...raw,
    empresas: (raw.empresas ?? []).map((e) => ({ ...e, cnpj: e.cnpj ?? "", razaoSocial: e.razaoSocial ?? e.nome })),
    clientes: (() => {
      const list = (raw.clientes ?? []).map((e) => ({ ...e, cnpj: e.cnpj ?? "", razaoSocial: e.razaoSocial ?? e.nome }));
      if (!list.some((c) => c.id === "cli-delpaz" || c.nome.toLowerCase() === "delpaz")) {
        list.push({ id: "cli-delpaz", nome: "Delpaz", ativo: true, cnpj: "", razaoSocial: "Delpaz" });
      }
      return list;
    })(),
    terceirizados,
    produtos,
    ops: opsOnBoard,
    boardNodes,
    boardEdges,
    roteiros,
    notificacoes,
    recibos: raw.recibos ?? [],
    categoriasInsumo: raw.categoriasInsumo?.length
      ? raw.categoriasInsumo
      : ["tecido", "linha", "botao", "ziper", "etiqueta", "embalagem", "aviamento"],
    tamanhosPadrao: raw.tamanhosPadrao?.length
      ? raw.tamanhosPadrao
      : ["PP", "P", "M", "G", "GG", "XGG", "38", "40", "42", "44", "46"],
    coresPadrao: (() => {
      const padrao = ["Azul Marinho", "Azul Royal", "Indigo", "Laranja", "Caqui", "Verde", "Branco"];
      const existentes = raw.coresPadrao ?? [];
      if (!existentes.length) return padrao;
      const have = new Set(existentes.map((c) => c.toLowerCase()));
      return [...existentes, ...padrao.filter((c) => !have.has(c.toLowerCase()))];
    })(),
    insumos: (raw.insumos ?? []).map((i) => {
      const { custoMedio: _custo, ...rest } = i as typeof i & { custoMedio?: number };
      return {
        ...rest,
        estoqueMinimo: i.estoqueMinimo ?? 0,
        cor:
          i.cor ||
          ({
            "ins-malha": "Cru",
            "ins-viscose": "Preto",
            "ins-jeans": "Indigo",
            "ins-ziper": "Preto",
            "ins-botao": "Pérola",
            "ins-linha": "Preto",
          }[i.id] ??
            ""),
      };
    }),
  };
}
