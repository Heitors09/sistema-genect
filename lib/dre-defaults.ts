import type { CategoriaFinanceira, GrupoDre, PlanoConta } from "./types";

/** IDs estáveis — alinhados à estrutura do DRE Gerencial Sensio (sem impostos). */
export const GRUPO_DRE_IDS = {
  receitaVendas: "gdre-receita-bruta",
  deducoes: "gdre-deducoes",
  custos: "gdre-custos",
  despesasOp: "gdre-despesas-op",
  despesasVendas: "gdre-despesas-vendas",
  despesasAdmin: "gdre-despesas-admin",
  despesasFin: "gdre-despesas-fin",
  receitasFin: "gdre-receitas-fin",
  /** legado — migrado para despesasFin */
  resultadoFinLegacy: "gdre-resultado-fin",
} as const;

export const PLANO_CONTA_IDS = {
  receitaVendas: "pc-rec-vendas",
  devolucoes: "pc-ded-devolucoes",
  custoFaccao: "pc-custo-faccao",
  custoCompras: "pc-custo-compras",
  despOp: "pc-desp-op",
  marketing: "pc-desp-marketing",
  comissoes: "pc-desp-comissoes",
  folha: "pc-desp-folha",
  aluguel: "pc-desp-aluguel",
  utilidades: "pc-desp-utilidades",
  admin: "pc-desp-admin",
  financeiro: "pc-fin-juros",
  receitaFin: "pc-rec-financeira",
} as const;

export const CATEGORIA_IDS = {
  receitaVendas: "cat-rec-vendas",
  devolucoes: "cat-ded-devolucoes",
  custoFaccao: "cat-custo-faccao",
  custoCompras: "cat-custo-compras",
  despOp: "cat-desp-op",
  marketing: "cat-desp-marketing",
  comissoes: "cat-desp-comissoes",
  folha: "cat-desp-folha",
  aluguel: "cat-desp-aluguel",
  utilidades: "cat-desp-utilidades",
  admin: "cat-desp-admin",
  despFin: "cat-desp-fin",
  recFin: "cat-rec-fin",
} as const;

/** Grupos DRE no padrão Sensio — deduções sem linha de impostos (regime indefinido). */
export const DEFAULT_GRUPOS_DRE: GrupoDre[] = [
  {
    id: GRUPO_DRE_IDS.receitaVendas,
    codigo: "01",
    nome: "Receita de vendas",
    tipo: "receita",
    ordem: 10,
    sinal: 1,
    ativo: true,
    fixo: true,
  },
  {
    id: GRUPO_DRE_IDS.deducoes,
    codigo: "02",
    nome: "Deduções da receita",
    tipo: "deducao",
    ordem: 20,
    sinal: -1,
    ativo: true,
    fixo: true,
  },
  {
    id: GRUPO_DRE_IDS.custos,
    codigo: "03",
    nome: "Custo variável (CPV/CMV)",
    tipo: "custo",
    ordem: 30,
    sinal: -1,
    ativo: true,
    fixo: true,
  },
  {
    id: GRUPO_DRE_IDS.despesasOp,
    codigo: "04",
    nome: "Despesas operacionais",
    tipo: "despesa",
    ordem: 40,
    sinal: -1,
    ativo: true,
    fixo: true,
  },
  {
    id: GRUPO_DRE_IDS.despesasVendas,
    codigo: "05",
    nome: "Despesas com vendas",
    tipo: "despesa",
    ordem: 50,
    sinal: -1,
    ativo: true,
    fixo: true,
  },
  {
    id: GRUPO_DRE_IDS.despesasAdmin,
    codigo: "06",
    nome: "Despesas administrativas",
    tipo: "despesa",
    ordem: 60,
    sinal: -1,
    ativo: true,
    fixo: true,
  },
  {
    id: GRUPO_DRE_IDS.despesasFin,
    codigo: "07",
    nome: "Despesas financeiras",
    tipo: "despesa",
    ordem: 70,
    sinal: -1,
    ativo: true,
    fixo: true,
  },
  {
    id: GRUPO_DRE_IDS.receitasFin,
    codigo: "08",
    nome: "Receitas financeiras",
    tipo: "resultado",
    ordem: 80,
    sinal: 1,
    ativo: true,
    fixo: true,
  },
];

export const DEFAULT_PLANO_CONTAS: PlanoConta[] = [
  {
    id: PLANO_CONTA_IDS.receitaVendas,
    codigo: "3.1.01",
    nome: "Receita de vendas",
    grupoDreId: GRUPO_DRE_IDS.receitaVendas,
    natureza: "receita",
    ativa: true,
    aceitaLancamento: true,
  },
  {
    id: PLANO_CONTA_IDS.devolucoes,
    codigo: "3.2.01",
    nome: "Devoluções e cancelamentos",
    grupoDreId: GRUPO_DRE_IDS.deducoes,
    natureza: "despesa",
    ativa: true,
    aceitaLancamento: true,
  },
  {
    id: PLANO_CONTA_IDS.custoFaccao,
    codigo: "4.1.01",
    nome: "Terceirização / facção",
    grupoDreId: GRUPO_DRE_IDS.custos,
    natureza: "custo",
    ativa: true,
    aceitaLancamento: true,
  },
  {
    id: PLANO_CONTA_IDS.custoCompras,
    codigo: "4.1.02",
    nome: "Matéria-prima e compras",
    grupoDreId: GRUPO_DRE_IDS.custos,
    natureza: "custo",
    ativa: true,
    aceitaLancamento: true,
  },
  {
    id: PLANO_CONTA_IDS.despOp,
    codigo: "5.1.01",
    nome: "Despesas operacionais gerais",
    grupoDreId: GRUPO_DRE_IDS.despesasOp,
    natureza: "despesa",
    ativa: true,
    aceitaLancamento: true,
  },
  {
    id: PLANO_CONTA_IDS.marketing,
    codigo: "5.2.01",
    nome: "Marketing e propaganda",
    grupoDreId: GRUPO_DRE_IDS.despesasVendas,
    natureza: "despesa",
    ativa: true,
    aceitaLancamento: true,
  },
  {
    id: PLANO_CONTA_IDS.comissoes,
    codigo: "5.2.02",
    nome: "Comissões sobre vendas",
    grupoDreId: GRUPO_DRE_IDS.despesasVendas,
    natureza: "despesa",
    ativa: true,
    aceitaLancamento: true,
  },
  {
    id: PLANO_CONTA_IDS.folha,
    codigo: "5.3.01",
    nome: "Folha de pagamento",
    grupoDreId: GRUPO_DRE_IDS.despesasAdmin,
    natureza: "despesa",
    ativa: true,
    aceitaLancamento: true,
  },
  {
    id: PLANO_CONTA_IDS.aluguel,
    codigo: "5.3.02",
    nome: "Aluguel",
    grupoDreId: GRUPO_DRE_IDS.despesasAdmin,
    natureza: "despesa",
    ativa: true,
    aceitaLancamento: true,
  },
  {
    id: PLANO_CONTA_IDS.utilidades,
    codigo: "5.3.03",
    nome: "Energia, água e utilidades",
    grupoDreId: GRUPO_DRE_IDS.despesasAdmin,
    natureza: "despesa",
    ativa: true,
    aceitaLancamento: true,
  },
  {
    id: PLANO_CONTA_IDS.admin,
    codigo: "5.3.04",
    nome: "Despesas administrativas",
    grupoDreId: GRUPO_DRE_IDS.despesasAdmin,
    natureza: "despesa",
    ativa: true,
    aceitaLancamento: true,
  },
  {
    id: PLANO_CONTA_IDS.financeiro,
    codigo: "5.4.01",
    nome: "Juros, tarifas e encargos",
    grupoDreId: GRUPO_DRE_IDS.despesasFin,
    natureza: "despesa",
    ativa: true,
    aceitaLancamento: true,
  },
  {
    id: PLANO_CONTA_IDS.receitaFin,
    codigo: "3.3.01",
    nome: "Juros e rendimentos financeiros",
    grupoDreId: GRUPO_DRE_IDS.receitasFin,
    natureza: "receita",
    ativa: true,
    aceitaLancamento: true,
  },
];

/** Categorias financeiras (camada Sensio): o lançamento usa a categoria; ela leva ao grupo DRE + plano. */
export const DEFAULT_CATEGORIAS: CategoriaFinanceira[] = [
  {
    id: CATEGORIA_IDS.receitaVendas,
    nome: "Receita de vendas",
    tipo: "receita",
    grupoDreId: GRUPO_DRE_IDS.receitaVendas,
    contaPlanoId: PLANO_CONTA_IDS.receitaVendas,
    ativa: true,
    padraoVendas: true,
    padraoReceber: true,
  },
  {
    id: CATEGORIA_IDS.devolucoes,
    nome: "Devoluções e cancelamentos",
    tipo: "despesa_custo",
    grupoDreId: GRUPO_DRE_IDS.deducoes,
    contaPlanoId: PLANO_CONTA_IDS.devolucoes,
    ativa: true,
  },
  {
    id: CATEGORIA_IDS.custoFaccao,
    nome: "Terceirização / facção",
    tipo: "despesa_custo",
    grupoDreId: GRUPO_DRE_IDS.custos,
    contaPlanoId: PLANO_CONTA_IDS.custoFaccao,
    ativa: true,
  },
  {
    id: CATEGORIA_IDS.custoCompras,
    nome: "Compras e matéria-prima",
    tipo: "despesa_custo",
    grupoDreId: GRUPO_DRE_IDS.custos,
    contaPlanoId: PLANO_CONTA_IDS.custoCompras,
    ativa: true,
    padraoCompras: true,
  },
  {
    id: CATEGORIA_IDS.despOp,
    nome: "Despesas operacionais",
    tipo: "despesa_custo",
    grupoDreId: GRUPO_DRE_IDS.despesasOp,
    contaPlanoId: PLANO_CONTA_IDS.despOp,
    ativa: true,
  },
  {
    id: CATEGORIA_IDS.marketing,
    nome: "Marketing e propaganda",
    tipo: "despesa_custo",
    grupoDreId: GRUPO_DRE_IDS.despesasVendas,
    contaPlanoId: PLANO_CONTA_IDS.marketing,
    ativa: true,
  },
  {
    id: CATEGORIA_IDS.comissoes,
    nome: "Comissões",
    tipo: "despesa_custo",
    grupoDreId: GRUPO_DRE_IDS.despesasVendas,
    contaPlanoId: PLANO_CONTA_IDS.comissoes,
    ativa: true,
  },
  {
    id: CATEGORIA_IDS.folha,
    nome: "Folha de pagamento",
    tipo: "despesa_custo",
    grupoDreId: GRUPO_DRE_IDS.despesasAdmin,
    contaPlanoId: PLANO_CONTA_IDS.folha,
    ativa: true,
  },
  {
    id: CATEGORIA_IDS.aluguel,
    nome: "Aluguel",
    tipo: "despesa_custo",
    grupoDreId: GRUPO_DRE_IDS.despesasAdmin,
    contaPlanoId: PLANO_CONTA_IDS.aluguel,
    ativa: true,
  },
  {
    id: CATEGORIA_IDS.utilidades,
    nome: "Energia, água e utilidades",
    tipo: "despesa_custo",
    grupoDreId: GRUPO_DRE_IDS.despesasAdmin,
    contaPlanoId: PLANO_CONTA_IDS.utilidades,
    ativa: true,
  },
  {
    id: CATEGORIA_IDS.admin,
    nome: "Despesas administrativas",
    tipo: "despesa_custo",
    grupoDreId: GRUPO_DRE_IDS.despesasAdmin,
    contaPlanoId: PLANO_CONTA_IDS.admin,
    ativa: true,
    padraoPagar: true,
  },
  {
    id: CATEGORIA_IDS.despFin,
    nome: "Despesas financeiras",
    tipo: "despesa_custo",
    grupoDreId: GRUPO_DRE_IDS.despesasFin,
    contaPlanoId: PLANO_CONTA_IDS.financeiro,
    ativa: true,
  },
  {
    id: CATEGORIA_IDS.recFin,
    nome: "Receitas financeiras",
    tipo: "receita",
    grupoDreId: GRUPO_DRE_IDS.receitasFin,
    contaPlanoId: PLANO_CONTA_IDS.receitaFin,
    ativa: true,
  },
];

export function contaPlanoPadraoPorOrigem(origem: string): string | undefined {
  if (origem === "faturamento") return PLANO_CONTA_IDS.receitaVendas;
  if (origem === "faccao") return PLANO_CONTA_IDS.custoFaccao;
  if (origem === "compra") return PLANO_CONTA_IDS.custoCompras;
  if (origem === "folha") return PLANO_CONTA_IDS.folha;
  return undefined;
}

export function categoriaPadraoPorOrigem(origem: string): string | undefined {
  if (origem === "faturamento") return CATEGORIA_IDS.receitaVendas;
  if (origem === "faccao") return CATEGORIA_IDS.custoFaccao;
  if (origem === "compra") return CATEGORIA_IDS.custoCompras;
  if (origem === "folha") return CATEGORIA_IDS.folha;
  return undefined;
}

/** Remapeia grupo legado → novo após expansão Sensio. */
export function remapGrupoDreId(grupoId: string): string {
  if (grupoId === GRUPO_DRE_IDS.resultadoFinLegacy) return GRUPO_DRE_IDS.despesasFin;
  return grupoId;
}

export function remapPlanoGrupo(contaId: string, grupoDreId: string): string {
  if (
    contaId === PLANO_CONTA_IDS.folha ||
    contaId === PLANO_CONTA_IDS.aluguel ||
    contaId === PLANO_CONTA_IDS.utilidades ||
    contaId === PLANO_CONTA_IDS.admin
  ) {
    return GRUPO_DRE_IDS.despesasAdmin;
  }
  if (contaId === PLANO_CONTA_IDS.financeiro) return GRUPO_DRE_IDS.despesasFin;
  return remapGrupoDreId(grupoDreId);
}
