import type { InsumoCategoria, OpStatus, OrcamentoStatus, OrigemFinanceira, StageKind, TipoNegocio } from "./types";

export const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const nInt = new Intl.NumberFormat("pt-BR");

export function formatDate(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function parseBRL(value: string) {
  const cleaned = value.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return NaN;
  if (cleaned.includes(",")) {
    return Number(cleaned.replace(/\./g, "").replace(",", "."));
  }
  return Number(cleaned);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function competenciaAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export function produtoLabel(nome: string, referencia?: string) {
  return referencia ? `${nome} · ${referencia}` : nome;
}

export const categoriaLabel: Record<InsumoCategoria, string> = {
  tecido: "Tecidos",
  linha: "Linhas",
  botao: "Botões",
  ziper: "Zíperes",
  etiqueta: "Etiquetas",
  embalagem: "Embalagens",
  aviamento: "Aviamentos",
};

export const tipoNegocioLabel: Record<TipoNegocio, string> = {
  servico: "Serviço de costura",
  fabricacao: "Fabricação própria",
};

export const statusOpLabel: Record<OpStatus, string> = {
  aberta: "Aberta",
  em_producao: "Em produção",
  revisao: "Revisão",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

export const orcamentoLabel: Record<OrcamentoStatus, string> = {
  rascunho: "Rascunho",
  aprovado: "Aprovado",
  fechado: "Fechado",
};

export const origemLabel: Record<OrigemFinanceira, string> = {
  manual: "Manual",
  faccao: "Terceirizado",
  compra: "Compra",
  faturamento: "Faturamento",
};

export const stageKindLabel: Record<StageKind, string> = {
  recebimento: "Recebimento",
  corte: "Corte",
  costura: "Costura",
  faccao: "Terceirizado",
  acabamento: "Acabamento",
  revisao: "Revisão",
  embalagem: "Embalagem",
  expedicao: "Expedição",
  custom: "Etapa",
};

export const stageColors: Record<StageKind, string> = {
  recebimento: "#8a8f9c",
  corte: "#c4b07a",
  costura: "#7ea2d6",
  faccao: "#9b8ec4",
  acabamento: "#c9a0a8",
  revisao: "#d97a86",
  embalagem: "#d4b56a",
  expedicao: "#7dba8a",
  custom: "#6b7280",
};

export function saldoConta(valor: number, movimentos: { valor: number; estornado: boolean }[]) {
  const pago = movimentos.filter((m) => !m.estornado).reduce((a, b) => a + b.valor, 0);
  return Math.max(0, Number((valor - pago).toFixed(2)));
}

export function statusConta(valor: number, movimentos: { valor: number; estornado: boolean }[]) {
  const saldo = saldoConta(valor, movimentos);
  if (saldo === 0) return "quitado" as const;
  const pago = valor - saldo;
  if (pago > 0) return "parcial" as const;
  return "aberto" as const;
}
