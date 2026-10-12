import type {
  AnexoOp,
  OpProdutoLinha,
  OpVariacao,
  RoteiroAresta,
  RoteiroEtapaDef,
  TipoNegocio,
} from "./types";

export const OP_NOVA_DRAFT_KEY = "genecthub-op-nova-draft";
export const OP_NOVA_DRAFT_EVENT = "genecthub-op-nova-draft";

export type OpNovaDraft = {
  numero: string;
  dataEntrada: string;
  empresaId: string;
  clienteId: string;
  produtoId: string;
  tipoNegocio: TipoNegocio;
  tipoTouched: boolean;
  tamanho: string;
  cor: string;
  quantidade: string;
  /** Como informar a grade na OP: um tamanho ou grade por variação. */
  modoEntrada?: "tamanho" | "variacao";
  grade?: OpVariacao[];
  observacoes: string;
  loteId: string;
  roteiroId: string;
  fluxo: {
    etapas: RoteiroEtapaDef[];
    arestas: RoteiroAresta[];
    inicioId?: string;
  };
  extraLinhas: OpProdutoLinha[];
  fotos: string[];
  anexos: AnexoOp[];
  /** Preenchimento real do usuário — chip só aparece com isto. */
  dirty?: boolean;
};

function notifyDraftChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OP_NOVA_DRAFT_EVENT));
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Tem conteúdo preenchido o bastante para mostrar o atalho na barra. */
export function opNovaDraftActive(draft: OpNovaDraft | null): boolean {
  if (!draft) return false;
  if (draft.dirty) return true;
  if ((draft.numero ?? "").trim()) return true;
  if (draft.produtoId) return true;
  if ((draft.observacoes ?? "").trim()) return true;
  if (draft.tamanho || draft.cor) return true;
  if (draft.quantidade && draft.quantidade !== "50") return true;
  if (draft.fotos?.length || draft.anexos?.length) return true;
  if (draft.extraLinhas?.some((l) => l.produtoId)) return true;
  if (draft.grade?.some((g) => g.quantidade > 0)) return true;
  return false;
}

export function readOpNovaDraft(): OpNovaDraft | null {
  const store = storage();
  if (!store) return null;
  try {
    // Migra rascunho antigo da session, se houver.
    const raw =
      store.getItem(OP_NOVA_DRAFT_KEY) ??
      (typeof sessionStorage !== "undefined"
        ? sessionStorage.getItem(OP_NOVA_DRAFT_KEY)
        : null);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OpNovaDraft;
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.fluxo?.etapas)) return null;
    if (!store.getItem(OP_NOVA_DRAFT_KEY) && typeof sessionStorage !== "undefined") {
      store.setItem(OP_NOVA_DRAFT_KEY, raw);
      sessionStorage.removeItem(OP_NOVA_DRAFT_KEY);
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeOpNovaDraft(draft: OpNovaDraft) {
  const store = storage();
  if (!store) return;
  const payload: OpNovaDraft = { ...draft, dirty: true };
  try {
    store.setItem(OP_NOVA_DRAFT_KEY, JSON.stringify(payload));
    notifyDraftChange();
  } catch {
    try {
      store.setItem(
        OP_NOVA_DRAFT_KEY,
        JSON.stringify({ ...payload, fotos: [], anexos: [] }),
      );
      notifyDraftChange();
    } catch {
      /* quota / private mode */
    }
  }
}

export function clearOpNovaDraft() {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(OP_NOVA_DRAFT_KEY);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(OP_NOVA_DRAFT_KEY);
    }
    notifyDraftChange();
  } catch {
    /* ignore */
  }
}
