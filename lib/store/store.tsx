"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";
import { competenciaAtual, stageColors, todayISO, uid } from "../format";
import { migrateState, servicosDe, valorServicoTerceirizado, valorServicosOp } from "../migrate";
import { notifyLive } from "../notif-live";
import {
  arestasFromLinear,
  ensureOpMicroGraph,
  proximoPorAresta,
  ramoFilha,
  sucessores,
} from "../roteiro-graph";
import { resumoMicroCaminho } from "../roteiro-path";
import type {
  AppState,
  BoardEdge,
  BoardNode,
  Cliente,
  ContaPagar,
  ContaReceber,
  Empresa,
  Fornecedor,
  Insumo,
  MicroEtapa,
  MicroStatus,
  OpStatus,
  OrdemProducao,
  OrcamentoDre,
  Produto,
  ReciboTerceirizado,
  RoteiroAresta,
  RoteiroModelo,
  StageKind,
  Terceirizado,
} from "../types";
import { consumoEmEstoque, necessidadesOp } from "../ficha";
import { pecasOpPorSku, resumoPecasSku } from "../estoque-produto";
import { seed, STORE_KEY } from "./seed";

type Action =
  | { type: "HYDRATE"; payload: AppState }
  | { type: "SET_USER"; usuarioId: string }
  | { type: "SAVE_OP"; op: OrdemProducao; isNew: boolean }
  | { type: "MOVE_OP"; opId: string; stageId: string; fromStageId?: string }
  | {
      type: "SPLIT_OP";
      parentId: string;
      quantidade: number;
      terceirizadoId?: string;
      stageId: string;
      /** Nó onde a filha está no fluxograma. */
      fromMicroId?: string;
      /** Caminho da filha (já existente). */
      nextMicroId?: string;
      /** Criar card de início da filha. */
      novoInicio?: {
        nome: string;
        macroId: string;
        terceirizado?: boolean;
        terceirizadoId?: string;
        servicoId?: string;
      };
      /** Criar card de caminho da filha (pode reunir depois). */
      novoDestino?: {
        nome: string;
        macroId: string;
        terceirizado?: boolean;
        terceirizadoId?: string;
        servicoId?: string;
        reunirEmId?: string;
      };
      /** Destino final (reunião na mãe), quando o caminho já existe. */
      reunirEmId?: string;
      /** @deprecated */
      escolhasAlt?: Record<string, string>;
    }
  | { type: "UPDATE_OP_PRODUCTION"; opId: string; produzida: number; perdas: number; refugo: number }
  | { type: "CANCEL_OP"; opId: string }
  | { type: "DELETE_OP"; opId: string }
  | { type: "SET_OP_STATUS"; opId: string; status: OpStatus }
  | { type: "SET_OP_FLAGS"; opId: string; urgente?: boolean; prioridade?: boolean }
  | { type: "MICRO_ACTION"; opId: string; microId: string; status: MicroStatus }
  | {
      type: "UPDATE_MICRO";
      opId: string;
      microId: string;
      patch: Partial<Pick<MicroEtapa, "nome" | "macroId" | "terceirizadoId" | "servicoId" | "x" | "y">>;
    }
  | { type: "REMOVE_MICRO"; opId: string; microId: string }
  | { type: "REMOVE_MICRO_ARESTA"; opId: string; arestaId: string }
  | { type: "ADD_MICRO_ARESTA"; opId: string; aresta: RoteiroAresta }
  | { type: "ADD_PENDENCIA"; opId: string; texto: string; autor: string }
  | { type: "SAVE_ROTEIRO"; roteiro: RoteiroModelo }
  | { type: "DELETE_ROTEIRO"; id: string }
  | { type: "SAVE_PRODUCT"; produto: Produto }
  | { type: "ADD_PRODUCT_COLOR"; produtoId: string; cor: string }
  | { type: "ADD_PRODUCT_SIZE"; produtoId: string; tamanho: string }
  | { type: "SAVE_TERCEIRIZADO"; terceirizado: Terceirizado }
  | { type: "SAVE_CLIENTE"; cliente: Cliente }
  | { type: "SAVE_EMPRESA"; empresa: Empresa }
  | { type: "SAVE_FORNECEDOR"; fornecedor: Fornecedor }
  | { type: "ADD_CATEGORIA_INSUMO"; categoria: string }
  | { type: "ADD_TAMANHO"; tamanho: string }
  | { type: "ADD_COR"; cor: string }
  | { type: "MARK_NOTIF"; id: string; lida?: boolean }
  | { type: "MARK_ALL_NOTIF" }
  | { type: "ADD_RECIBO"; recibo: ReciboTerceirizado }
  | { type: "SAVE_INSUMO"; insumo: Insumo }
  | {
      type: "ENTRADA_LOTE";
      payload: {
        insumoId: string;
        loteFabricante?: string;
        quantidade: number;
        preco: number;
        nf: string;
        anexoNf?: string;
        dataEntrada: string;
        fornecedorId: string;
        refFornecedor?: string;
        cor?: string;
      };
    }
  | { type: "SET_BOARD"; nodes: BoardNode[]; edges: BoardEdge[] }
  | { type: "ADD_STAGE"; node: BoardNode }
  | { type: "REMOVE_STAGE"; id: string }
  | { type: "REMOVE_EDGE"; id: string }
  | { type: "RENAME_STAGE"; id: string; label: string }
  | { type: "SAVE_CONTA_PAGAR"; conta: ContaPagar }
  | { type: "PAGAR"; contaId: string; valor: number; data: string }
  | { type: "ESTORNAR_PAGAMENTO"; contaId: string; pagamentoId: string; motivo: string; autor: string }
  | { type: "FATURAR_OP"; opId: string; vencimento: string; competencia: string }
  | { type: "RECEBER"; contaId: string; valor: number; data: string }
  | { type: "ESTORNAR_RECEBIMENTO"; contaId: string; recebimentoId: string; motivo: string; autor: string }
  | { type: "SAVE_ORCAMENTO"; orcamento: OrcamentoDre }
  | { type: "COPY_ORCAMENTO"; id: string; competencia: string }
  | { type: "CYCLE_ORCAMENTO"; id: string }
  | { type: "GERAR_ACERTO_FACCAO"; opId: string; vencimento: string }
  | { type: "BAIXA_ATADO"; opId: string; atadoId: string };

const PREV_STORE_KEYS = ["genecthub-state-v6", "genecthub-state-v5"];
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function normalizeStored(raw: AppState): AppState {
  return migrateState({
    ...raw,
    ops: (raw.ops ?? []).map((o) => ({
      ...o,
      cor: o.cor ?? "",
      tipoNegocio: o.tipoNegocio ?? "servico",
    })),
    produtos: (raw.produtos ?? []).map((p) => ({
      ...p,
      tipoNegocio: p.tipoNegocio ?? "servico",
    })),
  } as AppState);
}

function mergeMissingOps(base: AppState, extras: AppState["ops"]): AppState {
  const have = new Set(base.ops.map((o) => o.id));
  const add = extras.filter((o) => !have.has(o.id));
  return add.length ? { ...base, ops: [...base.ops, ...add] } : base;
}

function readStored(): AppState | null {
  if (typeof window === "undefined") return null;
  for (const key of [STORE_KEY, ...PREV_STORE_KEYS]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as AppState;
      if (parsed?.ops && parsed?.boardNodes) return normalizeStored(parsed);
    } catch {
      /* ignore corrupt storage */
    }
  }
  return null;
}

function consumeForOp(state: AppState, op: OrdemProducao, mode: "reserve" | "release") {
  const sign = mode === "reserve" ? 1 : -1;
  const needs = necessidadesOp(op, state.produtos);
  if (!needs.length) return state;
  const insumos = state.insumos.map((ins) => {
    const n = needs.find((x) => x.insumoId === ins.id);
    if (!n) return ins;
    const extra = consumoEmEstoque(n.qtdConsumo, ins);
    return { ...ins, reservado: Math.max(0, ins.reservado + extra * sign) };
  });
  return { ...state, insumos };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "HYDRATE": {
      const incoming = new Set(action.payload.ops.map((o) => o.id));
      const keep = state.ops.filter((o) => !incoming.has(o.id));
      return keep.length ? { ...action.payload, ops: [...keep, ...action.payload.ops] } : action.payload;
    }
    case "SET_USER":
      return { ...state, usuarioId: action.usuarioId };
    case "SAVE_OP": {
      const exists = state.ops.some((o) => o.id === action.op.id);
      let next = exists
        ? { ...state, ops: state.ops.map((o) => (o.id === action.op.id ? action.op : o)) }
        : { ...state, ops: [action.op, ...state.ops] };
      if (action.isNew) {
        next = consumeForOp(next, action.op, "reserve");
        const reservas = necessidadesOp(action.op, next.produtos).map((n) => ({
          id: uid("mv"),
          tipo: "reserva" as const,
          insumoId: n.insumoId,
          quantidade: n.qtdConsumo,
          opId: action.op.id,
          data: todayISO(),
          nota: `Reserva ${action.op.numero}`,
          loteId: action.op.lotesInsumo[0]?.loteId,
        }));
        next = { ...next, movimentos: [...reservas, ...next.movimentos] };
      }
      return next;
    }
    case "MOVE_OP":
      return {
        ...state,
        ops: state.ops.map((o) => {
          if (o.id !== action.opId) return o;
          const from = action.fromStageId ?? o.stageId;
          const dest = state.boardNodes.find((n) => n.id === action.stageId);
          const atados = o.atados.length
            ? o.atados.map((a) =>
                a.status !== "concluido" && a.stageId === from ? { ...a, stageId: action.stageId } : a,
              )
            : o.atados;
          return {
            ...o,
            atados,
            stageId: action.stageId,
            status:
              dest?.kind === "revisao"
                ? "revisao"
                : dest?.kind === "expedicao"
                  ? o.status === "cancelada"
                    ? o.status
                    : o.status === "aberta"
                      ? "em_producao"
                      : o.status === "finalizada"
                        ? "finalizada"
                        : o.status
                  : o.status === "aberta"
                    ? "em_producao"
                    : o.status === "finalizada"
                      ? "em_producao"
                      : o.status,
          };
        }),
      };
    case "SPLIT_OP": {
      const parent = state.ops.find((o) => o.id === action.parentId);
      if (!parent || action.quantidade <= 0 || action.quantidade >= parent.quantidade) return state;
      let restante = action.quantidade;
      const atadosPai: typeof parent.atados = [];
      for (const a of parent.atados) {
        if (a.status === "concluido" || restante <= 0) {
          atadosPai.push(a);
          continue;
        }
        if (a.quantidade <= restante) {
          restante -= a.quantidade;
          continue;
        }
        atadosPai.push({ ...a, quantidade: a.quantidade - restante });
        restante = 0;
      }
      const filhaN = state.ops.filter((o) => o.parentOpId === parent.id).length;
      let parentMicros = [...(parent.micros ?? [])];
      let parentArestas = parent.microArestas?.length
        ? [...parent.microArestas]
        : arestasFromLinear(parentMicros);
      let fromMicroId =
        action.fromMicroId && parentMicros.some((m) => m.id === action.fromMicroId)
          ? action.fromMicroId
          : parent.microAtualId ?? parentMicros[0]?.id;

      if (action.novoInicio?.nome.trim() && action.novoInicio.macroId) {
        const inicioId = uid("mic");
        parentMicros = [
          ...parentMicros,
          {
            id: inicioId,
            nome: action.novoInicio.nome.trim(),
            macroId: action.novoInicio.macroId,
            quantidade: parent.quantidade,
            status: "aguardando" as const,
            terceirizadoId: action.novoInicio.terceirizado
              ? action.novoInicio.terceirizadoId
              : undefined,
            servicoId: action.novoInicio.terceirizado ? action.novoInicio.servicoId : undefined,
          },
        ];
        fromMicroId = inicioId;
      }
      if (!fromMicroId) return state;

      let nextId = action.nextMicroId;
      if (action.novoDestino?.nome.trim() && action.novoDestino.macroId) {
        const novoId = uid("mic");
        parentMicros = [
          ...parentMicros,
          {
            id: novoId,
            nome: action.novoDestino.nome.trim(),
            macroId: action.novoDestino.macroId,
            quantidade: parent.quantidade,
            status: "aguardando" as const,
            terceirizadoId: action.novoDestino.terceirizado
              ? action.novoDestino.terceirizadoId
              : undefined,
            servicoId: action.novoDestino.terceirizado ? action.novoDestino.servicoId : undefined,
          },
        ];
        parentArestas = [
          ...parentArestas,
          {
            id: uid("rae"),
            fromId: fromMicroId,
            toId: novoId,
            kind: "filha",
            label: "filha",
          },
        ];
        nextId = novoId;
      }
      if (!nextId) {
        nextId = sucessores(parentArestas, fromMicroId)[0]?.toId ?? fromMicroId;
      }
      if (
        fromMicroId !== nextId &&
        !parentArestas.some((a) => a.fromId === fromMicroId && a.toId === nextId)
      ) {
        parentArestas = [
          ...parentArestas,
          {
            id: uid("rae"),
            fromId: fromMicroId,
            toId: nextId,
            kind: "filha",
            label: "filha",
          },
        ];
      }

      const reunirEmId =
        action.novoDestino?.reunirEmId ?? action.reunirEmId;
      if (
        reunirEmId &&
        reunirEmId !== nextId &&
        reunirEmId !== fromMicroId &&
        parentMicros.some((m) => m.id === reunirEmId) &&
        !parentArestas.some((a) => a.fromId === nextId && a.toId === reunirEmId)
      ) {
        parentArestas = [
          ...parentArestas,
          {
            id: uid("rae"),
            fromId: nextId,
            toId: reunirEmId,
            kind: "reuniao",
            label: "reúne",
          },
        ];
      }

      const ramo = ramoFilha(
        parentMicros.map((m) => m.id),
        parentArestas,
        fromMicroId,
        nextId,
      );
      const idMap = new Map<string, string>();
      const childMicros = ramo.nodes
        .map((id) => parentMicros.find((m) => m.id === id))
        .filter(Boolean)
        .map((m, idx) => {
          const nid = uid("mic");
          idMap.set(m!.id, nid);
          const status = idx === 0 ? ("em_andamento" as const) : ("aguardando" as const);
          return {
            ...m!,
            id: nid,
            origemMicroId: m!.id,
            quantidade: action.quantidade,
            status,
            iniciadaEm: idx === 0 ? new Date().toISOString() : undefined,
            concluidaEm: undefined,
            pendencia: undefined,
          };
        });
      const childArestas = ramo.arestas.map((a) => ({
        ...a,
        id: uid("rae"),
        fromId: idMap.get(a.fromId) ?? a.fromId,
        toId: idMap.get(a.toId) ?? a.toId,
      }));
      const primeiro = childMicros[0];
      const resumo = resumoMicroCaminho(childMicros);
      const child: OrdemProducao = {
        ...parent,
        id: uid("op"),
        numero: `${parent.numero}-${String.fromCharCode(65 + filhaN)}`,
        quantidade: action.quantidade,
        quantidadeProduzida: 0,
        perdas: 0,
        refugo: 0,
        parentOpId: parent.id,
        terceirizadoIds: action.terceirizadoId
          ? [action.terceirizadoId]
          : primeiro?.terceirizadoId
            ? [primeiro.terceirizadoId]
            : parent.terceirizadoIds,
        stageId: action.stageId || primeiro?.macroId || parent.stageId,
        status: "em_producao",
        observacoes: [
          `OP filha de ${parent.numero}.`,
          `Fluxo: ${resumo}.`,
          parent.observacoes?.trim() ? parent.observacoes : "",
        ]
          .filter(Boolean)
          .join(" "),
        urgente: parent.urgente,
        prioridade: parent.prioridade,
        fotosFicha: parent.fotosFicha ?? [],
        anexos: parent.anexos ?? [],
        linhas: parent.linhas ?? [],
        roteiroId: parent.roteiroId,
        roteiroNome: `${parent.roteiroNome ?? "Roteiro"} · ramo ${primeiro?.nome ?? ""}`.trim(),
        micros: childMicros,
        microArestas: childArestas,
        microAtualId: primeiro?.id,
        pendencias: [],
        atados: [
          {
            id: uid("at"),
            codigo: `AT-${parent.numero.replace(/^OP-/, "")}-${String.fromCharCode(65 + filhaN)}1`,
            quantidade: action.quantidade,
            terceirizadoId: action.terceirizadoId ?? primeiro?.terceirizadoId,
            stageId: action.stageId || primeiro?.macroId || parent.stageId,
            status: "em_setor",
          },
        ],
        createdAt: new Date().toISOString(),
      };
      const parentGraph = ensureOpMicroGraph({
        micros: parentMicros.map((m) =>
          m.id === fromMicroId || !action.novoDestino ? m : m,
        ),
        microArestas: parentArestas,
        microAtualId: parent.microAtualId,
      });
      return {
        ...state,
        ops: [
          child,
          ...state.ops.map((o) =>
            o.id === parent.id
              ? {
                  ...o,
                  quantidade: o.quantidade - action.quantidade,
                  atados: atadosPai,
                  micros: parentGraph.micros,
                  microArestas: parentGraph.microArestas,
                  microAtualId: parentGraph.microAtualId,
                  roteiroNome: o.roteiroNome,
                }
              : o,
          ),
        ],
      };
    }
    case "UPDATE_OP_PRODUCTION":
      return {
        ...state,
        ops: state.ops.map((o) =>
          o.id === action.opId
            ? {
                ...o,
                quantidadeProduzida: action.produzida,
                perdas: action.perdas,
                refugo: action.refugo,
              }
            : o,
        ),
      };
    case "CANCEL_OP": {
      const op = state.ops.find((o) => o.id === action.opId);
      if (!op || op.status === "cancelada") return state;
      let next = consumeForOp(state, op, "release");
      next = {
        ...next,
        ops: next.ops.map((o) => (o.id === op.id ? { ...o, status: "cancelada" } : o)),
      };
      return next;
    }
    case "SET_OP_STATUS": {
      const op = state.ops.find((o) => o.id === action.opId);
      if (!op || op.status === action.status) return state;
      if (action.status === "cancelada") {
        return reducer(state, { type: "CANCEL_OP", opId: action.opId });
      }
      if (op.status === "cancelada") return state;
      return {
        ...state,
        ops: state.ops.map((o) => (o.id === action.opId ? { ...o, status: action.status } : o)),
      };
    }
    case "DELETE_OP": {
      const op = state.ops.find((o) => o.id === action.opId);
      if (!op) return state;
      const next = op.status === "cancelada" ? state : consumeForOp(state, op, "release");
      return { ...next, ops: next.ops.filter((o) => o.id !== op.id) };
    }
    case "SAVE_PRODUCT": {
      const exists = state.produtos.some((p) => p.id === action.produto.id);
      return {
        ...state,
        produtos: exists
          ? state.produtos.map((p) => (p.id === action.produto.id ? action.produto : p))
          : [action.produto, ...state.produtos],
      };
    }
    case "SET_OP_FLAGS":
      return {
        ...state,
        ops: state.ops.map((o) =>
          o.id === action.opId
            ? {
                ...o,
                urgente: action.urgente ?? o.urgente,
                prioridade: action.prioridade ?? o.prioridade,
              }
            : o,
        ),
      };
    case "ADD_PENDENCIA":
      return {
        ...state,
        ops: state.ops.map((o) =>
          o.id === action.opId
            ? {
                ...o,
                pendencias: [
                  { id: uid("pen"), texto: action.texto, autor: action.autor, createdAt: new Date().toISOString() },
                  ...o.pendencias,
                ],
              }
            : o,
        ),
      };
    case "SAVE_ROTEIRO": {
      const exists = state.roteiros.some((r) => r.id === action.roteiro.id);
      return {
        ...state,
        roteiros: exists
          ? state.roteiros.map((r) => (r.id === action.roteiro.id ? action.roteiro : r))
          : [action.roteiro, ...state.roteiros],
      };
    }
    case "DELETE_ROTEIRO":
      return { ...state, roteiros: state.roteiros.filter((r) => r.id !== action.id) };
    case "MICRO_ACTION": {
      const op = state.ops.find((o) => o.id === action.opId);
      if (!op) return state;
      const now = new Date().toISOString();
      const doneIdx = op.micros.findIndex((m) => m.id === action.microId);
      const doneOrig = op.micros[doneIdx];
      let micros = op.micros.map((m) => {
        if (m.id !== action.microId) return m;
        if (action.status === "em_andamento") return { ...m, status: action.status, iniciadaEm: m.iniciadaEm ?? now };
        if (action.status === "concluida") return { ...m, status: action.status, concluidaEm: now };
        return { ...m, status: action.status };
      });
      if (action.status === "concluida" && doneOrig?.altGroup) {
        micros = micros.map((m) =>
          m.id !== action.microId && m.altGroup === doneOrig.altGroup && m.status !== "concluida"
            ? { ...m, status: "concluida" as const, concluidaEm: now }
            : m,
        );
      }
      const done = micros.find((m) => m.id === action.microId);
      const arestas = op.microArestas?.length ? op.microArestas : arestasFromLinear(micros);
      let nextMicro =
        action.status === "concluida" && done
          ? proximoPorAresta(micros, arestas, done.id)
          : undefined;
      if (action.status === "concluida" && nextMicro) {
        const nextId = nextMicro.id;
        micros = micros.map((m) =>
          m.id === nextId ? { ...m, status: "em_andamento" as const, iniciadaEm: m.iniciadaEm ?? now } : m,
        );
        nextMicro = micros.find((m) => m.id === nextId);
      }
      const microAtualId =
        action.status === "em_andamento"
          ? action.microId
          : action.status === "concluida"
            ? (nextMicro?.id ?? action.microId)
            : op.microAtualId;
      // Kanban segue o macroId configurado na micro (roteiro), nunca a ordem visual do quadro.
      const destinStageId =
        action.status === "em_andamento" && doneOrig?.macroId
          ? doneOrig.macroId
          : action.status === "concluida"
            ? (nextMicro?.macroId ?? done?.macroId ?? op.stageId)
            : op.stageId;
      const atados = op.atados.map((a) =>
        a.status !== "concluido" ? { ...a, stageId: destinStageId } : a,
      );
      const notificacoes = [...state.notificacoes];
      if (action.status === "concluida" && nextMicro) {
        notificacoes.unshift({
          id: uid("nt"),
          tipo: "micro_recebido",
          titulo: `${op.numero} · próxima etapa`,
          texto: `${done?.nome ?? "Etapa"} concluída. Cobrar ${nextMicro.nome}.`,
          opId: op.id,
          lida: false,
          createdAt: now,
        });
      }
      let contasPagar = state.contasPagar;
      if (action.status === "concluida" && done?.terceirizadoId) {
        const t = state.terceirizados.find((x) => x.id === done.terceirizadoId);
        const valor = done.quantidade * (t ? valorServicoTerceirizado(t, done.servicoId) : op.valorServicoPorPeca);
        if (valor > 0 && !contasPagar.some((c) => c.origem === "faccao" && c.origemId === `${op.id}:${done.id}`)) {
          contasPagar = [
            {
              id: uid("cp"),
              empresaId: op.empresaId,
              descricao: `${t?.nome ?? "Terceirizado"} · ${done.nome} · ${op.numero}`,
              origem: "faccao",
              origemId: `${op.id}:${done.id}`,
              valor,
              vencimento: todayISO(),
              competencia: competenciaAtual(),
              pagamentos: [],
            },
            ...contasPagar,
          ];
        }
      }
      const destNode = state.boardNodes.find((n) => n.id === destinStageId);
      let nextStatus = op.status;
      if (op.status === "aberta" && (action.status === "em_andamento" || action.status === "concluida")) {
        nextStatus = "em_producao";
      }
      if (action.status === "concluida" && destNode?.kind === "revisao") nextStatus = "revisao";
      if (action.status === "concluida" && !nextMicro && destNode?.kind === "expedicao") {
        nextStatus = op.status === "cancelada" ? op.status : "em_producao";
      }
      return {
        ...state,
        contasPagar,
        notificacoes,
        ops: state.ops.map((o) =>
          o.id === op.id
            ? {
                ...o,
                micros,
                microArestas: arestas,
                microAtualId,
                atados,
                stageId: destinStageId,
                status: nextStatus,
                terceirizadoIds: [...new Set(micros.map((m) => m.terceirizadoId).filter(Boolean) as string[])],
              }
            : o,
        ),
      };
    }
    case "UPDATE_MICRO": {
      const op = state.ops.find((o) => o.id === action.opId);
      if (!op) return state;
      const micros = op.micros.map((m) => {
        if (m.id !== action.microId) return m;
        const next = { ...m, ...action.patch };
        if ("terceirizadoId" in action.patch && !action.patch.terceirizadoId) {
          next.terceirizadoId = undefined;
          next.servicoId = undefined;
        }
        const t = next.terceirizadoId
          ? state.terceirizados.find((x) => x.id === next.terceirizadoId)
          : undefined;
        const svc = t && next.servicoId ? servicosDe(t).find((s) => s.id === next.servicoId) : undefined;
        if (action.patch.nome === undefined) {
          if (t && svc) next.nome = `${svc.nome} · ${t.nome}`;
          else if (t) next.nome = t.nome;
          else if (action.patch.macroId || ("terceirizadoId" in action.patch && !t)) {
            next.nome = state.boardNodes.find((n) => n.id === next.macroId)?.label ?? next.nome;
          }
        }
        return next;
      });
      const patched = micros.find((m) => m.id === action.microId);
      const atados =
        patched?.macroId && patched.macroId !== op.stageId && op.microAtualId === action.microId
          ? op.atados.map((a) =>
              a.status !== "concluido" && a.stageId === op.stageId
                ? { ...a, stageId: patched.macroId }
                : a,
            )
          : op.atados;
      const syncPatch = (m: MicroEtapa): MicroEtapa => {
        if (m.origemMicroId !== action.microId) return m;
        const next = { ...m, ...action.patch };
        if ("terceirizadoId" in action.patch && !action.patch.terceirizadoId) {
          next.terceirizadoId = undefined;
          next.servicoId = undefined;
        }
        if (action.patch.nome === undefined && patched) {
          next.nome = patched.nome;
          next.macroId = patched.macroId;
          next.terceirizadoId = patched.terceirizadoId;
          next.servicoId = patched.servicoId;
        }
        return next;
      };
      return {
        ...state,
        ops: state.ops.map((o) => {
          if (o.id === action.opId) {
            return {
              ...o,
              micros,
              atados,
              stageId:
                o.microAtualId === action.microId && patched?.macroId
                  ? patched.macroId
                  : o.stageId,
              terceirizadoIds: [
                ...new Set(micros.map((m) => m.terceirizadoId).filter(Boolean) as string[]),
              ],
            };
          }
          if (o.parentOpId === action.opId) {
            const childMicros = o.micros.map(syncPatch);
            return {
              ...o,
              micros: childMicros,
              terceirizadoIds: [
                ...new Set(childMicros.map((m) => m.terceirizadoId).filter(Boolean) as string[]),
              ],
            };
          }
          return o;
        }),
      };
    }
    case "REMOVE_MICRO": {
      const op = state.ops.find((o) => o.id === action.opId);
      if (!op || op.micros.length <= 1) return state;
      if (!op.micros.some((m) => m.id === action.microId)) return state;
      const micros = op.micros.filter((m) => m.id !== action.microId);
      const prevArestas = op.microArestas?.length
        ? op.microArestas
        : arestasFromLinear(op.micros);
      const microArestas = prevArestas.filter(
        (a) => a.fromId !== action.microId && a.toId !== action.microId,
      );
      const microAtualId =
        op.microAtualId === action.microId
          ? micros.find((m) => m.status === "em_andamento")?.id ?? micros[0]?.id
          : op.microAtualId && micros.some((m) => m.id === op.microAtualId)
            ? op.microAtualId
            : micros[0]?.id;
      const atual = micros.find((m) => m.id === microAtualId);
      return {
        ...state,
        ops: state.ops.map((o) => {
          if (o.id === action.opId) {
            return {
              ...o,
              micros,
              microArestas,
              microAtualId,
              stageId: atual?.macroId ?? o.stageId,
              terceirizadoIds: [
                ...new Set(micros.map((m) => m.terceirizadoId).filter(Boolean) as string[]),
              ],
            };
          }
          if (o.parentOpId === action.opId) {
            const removed = o.micros.filter((m) => m.origemMicroId === action.microId);
            if (!removed.length || o.micros.length - removed.length < 1) return o;
            const removedIds = new Set(removed.map((m) => m.id));
            const childMicros = o.micros.filter((m) => !removedIds.has(m.id));
            const childArestas = (o.microArestas ?? []).filter(
              (a) => !removedIds.has(a.fromId) && !removedIds.has(a.toId),
            );
            const childAtual =
              o.microAtualId && !removedIds.has(o.microAtualId)
                ? o.microAtualId
                : childMicros.find((m) => m.status === "em_andamento")?.id ?? childMicros[0]?.id;
            return {
              ...o,
              micros: childMicros,
              microArestas: childArestas,
              microAtualId: childAtual,
              stageId: childMicros.find((m) => m.id === childAtual)?.macroId ?? o.stageId,
            };
          }
          return o;
        }),
      };
    }
    case "REMOVE_MICRO_ARESTA": {
      const op = state.ops.find((o) => o.id === action.opId);
      if (!op) return state;
      const prevArestas = op.microArestas?.length
        ? op.microArestas
        : arestasFromLinear(op.micros);
      const removed = prevArestas.find((a) => a.id === action.arestaId);
      if (!removed) return state;
      return {
        ...state,
        ops: state.ops.map((o) => {
          if (o.id === action.opId) {
            return {
              ...o,
              microArestas: prevArestas.filter((a) => a.id !== action.arestaId),
            };
          }
          if (o.parentOpId === action.opId) {
            const fromC = o.micros.find((m) => m.origemMicroId === removed.fromId);
            const toC = o.micros.find((m) => m.origemMicroId === removed.toId);
            if (!fromC || !toC || !o.microArestas?.length) return o;
            return {
              ...o,
              microArestas: o.microArestas.filter(
                (a) => !(a.fromId === fromC.id && a.toId === toC.id),
              ),
            };
          }
          return o;
        }),
      };
    }
    case "ADD_MICRO_ARESTA": {
      const op = state.ops.find((o) => o.id === action.opId);
      if (!op) return state;
      const prevArestas = op.microArestas?.length
        ? op.microArestas
        : arestasFromLinear(op.micros);
      if (
        prevArestas.some(
          (a) => a.fromId === action.aresta.fromId && a.toId === action.aresta.toId,
        )
      ) {
        return state;
      }
      return {
        ...state,
        ops: state.ops.map((o) => {
          if (o.id === action.opId) {
            return { ...o, microArestas: [...prevArestas, action.aresta] };
          }
          if (o.parentOpId === action.opId) {
            const fromC = o.micros.find((m) => m.origemMicroId === action.aresta.fromId);
            const toC = o.micros.find((m) => m.origemMicroId === action.aresta.toId);
            if (!fromC || !toC) return o;
            const childEdges = o.microArestas ?? [];
            if (childEdges.some((a) => a.fromId === fromC.id && a.toId === toC.id)) return o;
            return {
              ...o,
              microArestas: [
                ...childEdges,
                {
                  ...action.aresta,
                  id: uid("rae"),
                  fromId: fromC.id,
                  toId: toC.id,
                },
              ],
            };
          }
          return o;
        }),
      };
    }
    case "SAVE_CLIENTE": {
      const exists = state.clientes.some((c) => c.id === action.cliente.id);
      return {
        ...state,
        clientes: exists
          ? state.clientes.map((c) => (c.id === action.cliente.id ? action.cliente : c))
          : [action.cliente, ...state.clientes],
      };
    }
    case "SAVE_EMPRESA": {
      const exists = state.empresas.some((c) => c.id === action.empresa.id);
      return {
        ...state,
        empresas: exists
          ? state.empresas.map((c) => (c.id === action.empresa.id ? action.empresa : c))
          : [action.empresa, ...state.empresas],
      };
    }
    case "SAVE_FORNECEDOR": {
      const exists = state.fornecedores.some((c) => c.id === action.fornecedor.id);
      return {
        ...state,
        fornecedores: exists
          ? state.fornecedores.map((c) => (c.id === action.fornecedor.id ? action.fornecedor : c))
          : [action.fornecedor, ...state.fornecedores],
      };
    }
    case "ADD_CATEGORIA_INSUMO": {
      const cat = action.categoria.trim();
      if (!cat || state.categoriasInsumo.some((c) => c.toLowerCase() === cat.toLowerCase())) return state;
      return { ...state, categoriasInsumo: [...state.categoriasInsumo, cat] };
    }
    case "ADD_TAMANHO": {
      const tam = action.tamanho.trim();
      if (!tam || state.tamanhosPadrao.includes(tam)) return state;
      return { ...state, tamanhosPadrao: [...state.tamanhosPadrao, tam] };
    }
    case "ADD_COR": {
      const cor = action.cor.trim();
      const atuais = state.coresPadrao ?? [];
      if (!cor || atuais.some((c) => c.toLowerCase() === cor.toLowerCase())) return state;
      return { ...state, coresPadrao: [...atuais, cor] };
    }
    case "ADD_RECIBO":
      return { ...state, recibos: [action.recibo, ...state.recibos] };
    case "MARK_NOTIF":
      return {
        ...state,
        notificacoes: state.notificacoes.map((n) =>
          n.id === action.id ? { ...n, lida: action.lida ?? true } : n,
        ),
      };
    case "MARK_ALL_NOTIF":
      return { ...state, notificacoes: state.notificacoes.map((n) => ({ ...n, lida: true })) };
    case "ADD_PRODUCT_SIZE": {
      const tamanho = action.tamanho.trim();
      if (!tamanho) return state;
      return {
        ...state,
        produtos: state.produtos.map((p) => {
          if (p.id !== action.produtoId) return p;
          if (p.tamanhos.some((t) => t.toLowerCase() === tamanho.toLowerCase())) return p;
          return { ...p, tamanhos: [...p.tamanhos, tamanho] };
        }),
        tamanhosPadrao: state.tamanhosPadrao.includes(tamanho)
          ? state.tamanhosPadrao
          : [...state.tamanhosPadrao, tamanho],
      };
    }
    case "ADD_PRODUCT_COLOR": {
      const cor = action.cor.trim();
      if (!cor) return state;
      const lista = state.coresPadrao ?? [];
      return {
        ...state,
        produtos: state.produtos.map((p) => {
          if (p.id !== action.produtoId) return p;
          if (p.cores.some((c) => c.toLowerCase() === cor.toLowerCase())) return p;
          return { ...p, cores: [...p.cores, cor] };
        }),
        coresPadrao: lista.some((c) => c.toLowerCase() === cor.toLowerCase()) ? lista : [...lista, cor],
      };
    }
    case "SAVE_TERCEIRIZADO": {
      const exists = state.terceirizados.some((t) => t.id === action.terceirizado.id);
      return {
        ...state,
        terceirizados: exists
          ? state.terceirizados.map((t) => (t.id === action.terceirizado.id ? action.terceirizado : t))
          : [action.terceirizado, ...state.terceirizados],
      };
    }
    case "SAVE_INSUMO": {
      const exists = state.insumos.some((p) => p.id === action.insumo.id);
      return {
        ...state,
        insumos: exists
          ? state.insumos.map((p) => (p.id === action.insumo.id ? action.insumo : p))
          : [action.insumo, ...state.insumos],
      };
    }
    case "ENTRADA_LOTE": {
      const loteId = uid("lot");
      return {
        ...state,
        lotes: [
          {
            id: loteId,
            insumoId: action.payload.insumoId,
            loteFabricante: action.payload.loteFabricante ?? "",
            anexoNf: action.payload.anexoNf,
            quantidade: action.payload.quantidade,
            quantidadeRestante: action.payload.quantidade,
            preco: action.payload.preco,
            unidade: state.insumos.find((i) => i.id === action.payload.insumoId)?.unidadeCompra ?? "un",
            nf: action.payload.nf,
            dataEntrada: action.payload.dataEntrada,
            fornecedorId: action.payload.fornecedorId,
          },
          ...state.lotes,
        ],
        insumos: state.insumos.map((i) =>
          i.id === action.payload.insumoId
            ? {
                ...i,
                estoqueAtual: i.estoqueAtual + action.payload.quantidade,
                fornecedorId: action.payload.fornecedorId || i.fornecedorId,
                refFornecedor: action.payload.refFornecedor ?? i.refFornecedor,
                cor: action.payload.cor !== undefined ? action.payload.cor : i.cor,
              }
            : i,
        ),
        movimentos: [
          {
            id: uid("mv"),
            tipo: "entrada",
            insumoId: action.payload.insumoId,
            loteId,
            quantidade: action.payload.quantidade,
            data: action.payload.dataEntrada,
            nf: action.payload.nf,
            nota: `Entrada ${action.payload.nf || "sem NF"}`,
          },
          ...state.movimentos,
        ],
      };
    }
    case "SET_BOARD":
      return { ...state, boardNodes: action.nodes, boardEdges: action.edges };
    case "ADD_STAGE":
      return { ...state, boardNodes: [...state.boardNodes, action.node] };
    case "REMOVE_STAGE":
      return {
        ...state,
        boardNodes: state.boardNodes.filter((n) => n.id !== action.id),
        boardEdges: state.boardEdges.filter((e) => e.source !== action.id && e.target !== action.id),
      };
    case "REMOVE_EDGE":
      return {
        ...state,
        boardEdges: state.boardEdges.filter((e) => e.id !== action.id),
      };
    case "RENAME_STAGE":
      return {
        ...state,
        boardNodes: state.boardNodes.map((n) => (n.id === action.id ? { ...n, label: action.label } : n)),
      };
    case "SAVE_CONTA_PAGAR": {
      const exists = state.contasPagar.some((c) => c.id === action.conta.id);
      return {
        ...state,
        contasPagar: exists
          ? state.contasPagar.map((c) => (c.id === action.conta.id ? action.conta : c))
          : [action.conta, ...state.contasPagar],
      };
    }
    case "PAGAR":
      return {
        ...state,
        contasPagar: state.contasPagar.map((c) =>
          c.id === action.contaId
            ? {
                ...c,
                pagamentos: [
                  ...c.pagamentos,
                  { id: uid("pg"), valor: action.valor, data: action.data, estornado: false },
                ],
              }
            : c,
        ),
      };
    case "ESTORNAR_PAGAMENTO":
      return {
        ...state,
        contasPagar: state.contasPagar.map((c) =>
          c.id === action.contaId
            ? {
                ...c,
                pagamentos: c.pagamentos.map((p) =>
                  p.id === action.pagamentoId
                    ? { ...p, estornado: true, motivoEstorno: action.motivo, autorEstorno: action.autor }
                    : p,
                ),
              }
            : c,
        ),
      };
    case "FATURAR_OP": {
      const op = state.ops.find((o) => o.id === action.opId);
      if (!op) return state;
      if (state.faturamentos.some((f) => f.opId === op.id)) return state;
      const pecas = op.quantidadeProduzida || op.quantidade;
      const valor = pecas * (op.precoUnitario || 0);
      const crId = uid("cr");
      const fatId = uid("fat");
      const prod = state.produtos.find((p) => p.id === op.produtoId);
      const skus = pecasOpPorSku(op);
      const skuTxt = resumoPecasSku(skus);
      const conta: ContaReceber = {
        id: crId,
        empresaId: op.empresaId,
        clienteId: op.clienteId,
        descricao: [`Venda ${prod?.referencia ?? op.numero}`, skuTxt, op.numero].filter(Boolean).join(" · "),
        origem: "faturamento",
        origemId: fatId,
        opId: op.id,
        valor,
        vencimento: action.vencimento,
        competencia: action.competencia,
        recebimentos: [],
      };
      return {
        ...state,
        contasReceber: [conta, ...state.contasReceber],
        faturamentos: [
          {
            id: fatId,
            opId: op.id,
            clienteId: op.clienteId,
            empresaId: op.empresaId,
            valor,
            data: todayISO(),
            competencia: action.competencia,
            contaReceberId: crId,
          },
          ...state.faturamentos,
        ],
      };
    }
    case "RECEBER":
      return {
        ...state,
        contasReceber: state.contasReceber.map((c) =>
          c.id === action.contaId
            ? {
                ...c,
                recebimentos: [
                  ...c.recebimentos,
                  { id: uid("rc"), valor: action.valor, data: action.data, estornado: false },
                ],
              }
            : c,
        ),
      };
    case "ESTORNAR_RECEBIMENTO":
      return {
        ...state,
        contasReceber: state.contasReceber.map((c) =>
          c.id === action.contaId
            ? {
                ...c,
                recebimentos: c.recebimentos.map((p) =>
                  p.id === action.recebimentoId
                    ? { ...p, estornado: true, motivoEstorno: action.motivo, autorEstorno: action.autor }
                    : p,
                ),
              }
            : c,
        ),
      };
    case "SAVE_ORCAMENTO": {
      const exists = state.orcamentos.some((o) => o.id === action.orcamento.id);
      return {
        ...state,
        orcamentos: exists
          ? state.orcamentos.map((o) => (o.id === action.orcamento.id ? action.orcamento : o))
          : [action.orcamento, ...state.orcamentos],
      };
    }
    case "COPY_ORCAMENTO": {
      const src = state.orcamentos.find((o) => o.id === action.id);
      if (!src) return state;
      return {
        ...state,
        orcamentos: [
          {
            ...src,
            id: uid("orc"),
            competencia: action.competencia,
            status: "rascunho",
          },
          ...state.orcamentos,
        ],
      };
    }
    case "CYCLE_ORCAMENTO":
      return {
        ...state,
        orcamentos: state.orcamentos.map((o) => {
          if (o.id !== action.id) return o;
          const next =
            o.status === "rascunho" ? "aprovado" : o.status === "aprovado" ? "fechado" : "fechado";
          return { ...o, status: next };
        }),
      };
    case "GERAR_ACERTO_FACCAO": {
      const op = state.ops.find((o) => o.id === action.opId);
      if (!op) return state;
      if (state.contasPagar.some((c) => c.origem === "faccao" && c.origemId === op.id)) return state;
      const pecas = op.quantidadeProduzida || op.quantidade;
      const valor = valorServicosOp(op, state.terceirizados, pecas);
      return {
        ...state,
        contasPagar: [
          {
            id: uid("cp"),
            empresaId: op.empresaId,
            descricao: `Acerto terceirizado ${op.numero}`,
            origem: "faccao",
            origemId: op.id,
            valor,
            vencimento: action.vencimento,
            competencia: competenciaAtual(),
            pagamentos: [],
          },
          ...state.contasPagar,
        ],
      };
    }
    case "BAIXA_ATADO":
      return {
        ...state,
        ops: state.ops.map((o) =>
          o.id === action.opId
            ? {
                ...o,
                atados: o.atados.map((a) =>
                  a.id === action.atadoId ? { ...a, status: "concluido" } : a,
                ),
              }
            : o,
        ),
      };
    default:
      return state;
  }
}

type StoreValue = {
  state: AppState;
  hydrated: boolean;
  dispatch: Dispatch<Action>;
  currentUser: AppState["usuarios"][number];
  isAdmin: boolean;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, seed);
  const [hydrated, setHydrated] = useReducer(() => true, false);
  const primedNotifs = useRef(false);
  const lastNotifId = useRef<string | null>(null);

  useIsoLayoutEffect(() => {
    const stored = readStored();
    dispatch({ type: "HYDRATE", payload: stored ? mergeMissingOps(stored, seed.ops) : seed });
    setHydrated();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {
      /* quota / private mode */
    }
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const newest = state.notificacoes[0];
    if (!primedNotifs.current) {
      primedNotifs.current = true;
      lastNotifId.current = newest?.id ?? null;
      return;
    }
    if (newest && newest.id !== lastNotifId.current) {
      lastNotifId.current = newest.id;
      notifyLive(newest);
    }
  }, [hydrated, state.notificacoes]);

  const currentUser = state.usuarios.find((u) => u.id === state.usuarioId) ?? state.usuarios[0];

  const value = useMemo(
    () => ({
      state,
      hydrated,
      dispatch,
      currentUser,
      isAdmin: currentUser.role === "admin",
    }),
    [state, hydrated, currentUser],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function useLookups() {
  const { state } = useStore();
  const empresa = useCallback((id: string) => state.empresas.find((e) => e.id === id), [state.empresas]);
  const cliente = useCallback((id: string) => state.clientes.find((e) => e.id === id), [state.clientes]);
  const produto = useCallback((id: string) => state.produtos.find((e) => e.id === id), [state.produtos]);
  const insumo = useCallback((id: string) => state.insumos.find((e) => e.id === id), [state.insumos]);
  const terceirizado = useCallback(
    (id: string) => state.terceirizados.find((e) => e.id === id),
    [state.terceirizados],
  );
  const lote = useCallback((id: string) => state.lotes.find((e) => e.id === id), [state.lotes]);
  const stage = useCallback((id: string) => state.boardNodes.find((e) => e.id === id), [state.boardNodes]);
  return { empresa, cliente, produto, insumo, terceirizado, lote, stage };
}

export function newStage(kind: StageKind, label: string, x = 200, y = 200): BoardNode {
  return {
    id: uid("st"),
    kind,
    label,
    color: stageColors[kind],
    x,
    y,
  };
}
