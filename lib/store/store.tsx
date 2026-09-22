"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import { competenciaAtual, stageColors, todayISO, uid } from "../format";
import type {
  AppState,
  BoardEdge,
  BoardNode,
  ContaPagar,
  ContaReceber,
  Insumo,
  OrdemProducao,
  OrcamentoDre,
  Produto,
  StageKind,
  Terceirizado,
} from "../types";
import { linhasReserva } from "../ficha";
import { seed, STORE_KEY } from "./seed";

type Action =
  | { type: "HYDRATE"; payload: AppState }
  | { type: "SET_USER"; usuarioId: string }
  | { type: "SAVE_OP"; op: OrdemProducao; isNew: boolean }
  | { type: "MOVE_OP"; opId: string; stageId: string; fromStageId?: string }
  | { type: "SPLIT_OP"; parentId: string; quantidade: number; terceirizadoId?: string; stageId: string }
  | { type: "UPDATE_OP_PRODUCTION"; opId: string; produzida: number; perdas: number; refugo: number }
  | { type: "CANCEL_OP"; opId: string }
  | { type: "DELETE_OP"; opId: string }
  | { type: "SAVE_PRODUCT"; produto: Produto }
  | { type: "ADD_PRODUCT_COLOR"; produtoId: string; cor: string }
  | { type: "SAVE_TERCEIRIZADO"; terceirizado: Terceirizado }
  | { type: "SAVE_INSUMO"; insumo: Insumo }
  | {
      type: "ENTRADA_LOTE";
      payload: {
        insumoId: string;
        loteFabricante: string;
        quantidade: number;
        preco: number;
        nf: string;
        dataEntrada: string;
        fornecedorId: string;
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

function consumeForOp(state: AppState, op: OrdemProducao, mode: "reserve" | "release") {
  const produto = state.produtos.find((p) => p.id === op.produtoId);
  if (!produto) return state;
  const sign = mode === "reserve" ? 1 : -1;
  const qty = op.quantidade;
  const insumos = state.insumos.map((ins) => {
    const extra = linhasReserva(produto, op.tipoNegocio ?? "servico")
      .filter((l) => l.insumoId === ins.id)
      .reduce((a, l) => a + l.consumoPorPeca * qty, 0);
    if (!extra) return ins;
    return { ...ins, reservado: Math.max(0, ins.reservado + extra * sign) };
  });
  return { ...state, insumos };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "HYDRATE":
      return action.payload;
    case "SET_USER":
      return { ...state, usuarioId: action.usuarioId };
    case "SAVE_OP": {
      const exists = state.ops.some((o) => o.id === action.op.id);
      let next = exists
        ? { ...state, ops: state.ops.map((o) => (o.id === action.op.id ? action.op : o)) }
        : { ...state, ops: [action.op, ...state.ops] };
      if (action.isNew) {
        next = consumeForOp(next, action.op, "reserve");
        next = {
          ...next,
          movimentos: [
            {
              id: uid("mv"),
              tipo: "reserva",
              insumoId: next.produtos.find((p) => p.id === action.op.produtoId)?.materiaPrimaId ?? "",
              quantidade: action.op.quantidade,
              opId: action.op.id,
              data: todayISO(),
              nota: `Reserva ${action.op.numero}`,
              loteId: action.op.lotesInsumo[0]?.loteId,
            },
            ...next.movimentos,
          ],
        };
      }
      return next;
    }
    case "MOVE_OP":
      return {
        ...state,
        ops: state.ops.map((o) => {
          if (o.id !== action.opId) return o;
          const from = action.fromStageId ?? o.stageId;
          const atados = o.atados.length
            ? o.atados.map((a) =>
                a.status !== "concluido" && a.stageId === from ? { ...a, stageId: action.stageId } : a,
              )
            : o.atados;
          const open = atados.filter((a) => a.status !== "concluido");
          const weight = new Map<string, number>();
          for (const a of open) weight.set(a.stageId, (weight.get(a.stageId) ?? 0) + a.quantidade);
          const primary =
            [...weight.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? action.stageId;
          return {
            ...o,
            atados,
            stageId: atados.length ? primary : action.stageId,
            status:
              action.stageId === "st-expedicao"
                ? "finalizada"
                : action.stageId === "st-revisao"
                  ? "revisao"
                  : o.status === "aberta"
                    ? "em_producao"
                    : o.status,
          };
        }),
      };
    case "SPLIT_OP": {
      const parent = state.ops.find((o) => o.id === action.parentId);
      if (!parent || action.quantidade <= 0 || action.quantidade >= parent.quantidade) return state;
      const child: OrdemProducao = {
        ...parent,
        id: uid("op"),
        numero: `${parent.numero}-${String.fromCharCode(65 + state.ops.filter((o) => o.parentOpId === parent.id).length)}`,
        quantidade: action.quantidade,
        quantidadeProduzida: 0,
        perdas: 0,
        refugo: 0,
        parentOpId: parent.id,
        terceirizadoIds: action.terceirizadoId ? [action.terceirizadoId] : parent.terceirizadoIds,
        stageId: action.stageId,
        status: "em_producao",
        observacoes: `OP filha de ${parent.numero}. Divisão de lote.`,
        atados: [
          {
            id: uid("at"),
            codigo: `AT-${parent.numero.replace("OP-", "")}-F`,
            quantidade: action.quantidade,
            terceirizadoId: action.terceirizadoId,
            stageId: action.stageId,
            status: "em_setor",
          },
        ],
        createdAt: new Date().toISOString(),
      };
      return {
        ...state,
        ops: [
          child,
          ...state.ops.map((o) =>
            o.id === parent.id ? { ...o, quantidade: o.quantidade - action.quantidade } : o,
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
    case "ADD_PRODUCT_COLOR": {
      const cor = action.cor.trim();
      if (!cor) return state;
      return {
        ...state,
        produtos: state.produtos.map((p) => {
          if (p.id !== action.produtoId) return p;
          if (p.cores.some((c) => c.toLowerCase() === cor.toLowerCase())) return p;
          return { ...p, cores: [...p.cores, cor] };
        }),
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
            loteFabricante: action.payload.loteFabricante,
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
                custoMedio:
                  (i.custoMedio * i.estoqueAtual + action.payload.preco * action.payload.quantidade) /
                  (i.estoqueAtual + action.payload.quantidade || 1),
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
            nota: `Entrada lote ${action.payload.loteFabricante}`,
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
      const valor = op.quantidade * op.precoUnitario;
      const crId = uid("cr");
      const fatId = uid("fat");
      const conta: ContaReceber = {
        id: crId,
        empresaId: op.empresaId,
        clienteId: op.clienteId,
        descricao: `Faturamento ${op.numero}`,
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
      const valor = pecas * op.valorServicoPorPeca;
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        if (parsed?.ops && parsed?.boardNodes) {
          dispatch({
            type: "HYDRATE",
            payload: {
              ...parsed,
              ops: parsed.ops.map((o) => ({
                ...o,
                cor: o.cor ?? "",
                tipoNegocio: o.tipoNegocio ?? "servico",
              })),
              produtos: (parsed.produtos ?? []).map((p) => ({
                ...p,
                tipoNegocio: p.tipoNegocio ?? "servico",
              })),
            },
          });
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

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
