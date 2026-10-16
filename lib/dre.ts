import {
  CATEGORIA_IDS,
  categoriaPadraoPorOrigem,
  PLANO_CONTA_IDS,
} from "./dre-defaults";
import type {
  AppState,
  CategoriaFinanceira,
  DreRegime,
  GrupoDre,
} from "./types";

export type DreLinhaTipo = "grupo" | "categoria" | "subtotal" | "total";

export interface DreLinha {
  id: string;
  tipo: DreLinhaTipo;
  label: string;
  valor: number;
  /** % sobre receita bruta */
  pctReceita?: number;
  destaque?: boolean;
  grupoId?: string;
  categorias?: { id: string; nome: string; valor: number; pctReceita: number }[];
}

export interface DreResultado {
  regime: DreRegime;
  linhas: DreLinha[];
  receitaBruta: number;
  deducoes: number;
  receitaLiquida: number;
  custos: number;
  lucroBruto: number;
  despesasOp: number;
  despesasVendas: number;
  despesasAdmin: number;
  despesasFin: number;
  receitasFin: number;
  resultadoOperacional: number;
  resultadoLiquido: number;
  margemBrutaPct: number;
  margemLiquidaPct: number;
  porCategoria: Record<string, number>;
  porGrupo: Record<string, number>;
}

function ym(iso: string) {
  return iso.slice(0, 7);
}

function pct(valor: number, base: number) {
  if (!base) return 0;
  return (valor / base) * 100;
}

export function categoriaDeLancamento(
  state: AppState,
  opts: { categoriaId?: string; contaPlanoId?: string; origem?: string },
): CategoriaFinanceira | undefined {
  const cats = state.categoriasFinanceiras ?? [];
  if (opts.categoriaId) {
    const c = cats.find((x) => x.id === opts.categoriaId);
    if (c) return c;
  }
  if (opts.contaPlanoId) {
    const c = cats.find((x) => x.contaPlanoId === opts.contaPlanoId && x.ativa);
    if (c) return c;
  }
  const byOrigem = opts.origem ? categoriaPadraoPorOrigem(opts.origem) : undefined;
  if (byOrigem) return cats.find((x) => x.id === byOrigem);
  return undefined;
}

/** Soma lançamentos por categoria conforme regime Sensio. */
export function lancamentosPorCategoria(
  state: AppState,
  empresaId: string,
  periodo: string,
  regime: DreRegime,
): Record<string, number> {
  const porCat: Record<string, number> = {};
  const add = (categoriaId: string | undefined, valor: number) => {
    if (!categoriaId || !valor) return;
    porCat[categoriaId] = (porCat[categoriaId] ?? 0) + valor;
  };

  const resolve = (opts: { categoriaId?: string; contaPlanoId?: string; origem?: string }) =>
    categoriaDeLancamento(state, opts)?.id;

  if (regime === "caixa") {
    for (const c of state.contasReceber) {
      if (c.empresaId !== empresaId) continue;
      const catId = resolve({
        categoriaId: c.categoriaId,
        contaPlanoId: c.contaPlanoId,
        origem: c.origem,
      });
      for (const r of c.recebimentos) {
        if (r.estornado || ym(r.data) !== periodo) continue;
        add(catId, r.valor);
      }
    }
    for (const c of state.contasPagar) {
      if (c.empresaId !== empresaId) continue;
      const catId = resolve({
        categoriaId: c.categoriaId,
        contaPlanoId: c.contaPlanoId,
        origem: c.origem,
      });
      for (const p of c.pagamentos) {
        if (p.estornado || ym(p.data) !== periodo) continue;
        add(catId, p.valor);
      }
    }
    return porCat;
  }

  if (regime === "faturamento") {
    for (const f of state.faturamentos) {
      if (f.empresaId !== empresaId || ym(f.data) !== periodo) continue;
      const cr = state.contasReceber.find((c) => c.id === f.contaReceberId);
      add(
        resolve({
          categoriaId: cr?.categoriaId,
          contaPlanoId: cr?.contaPlanoId ?? PLANO_CONTA_IDS.receitaVendas,
          origem: "faturamento",
        }) ?? CATEGORIA_IDS.receitaVendas,
        f.valor,
      );
    }
    for (const c of state.contasReceber) {
      if (c.empresaId !== empresaId || c.competencia !== periodo) continue;
      if (c.origem === "faturamento") continue;
      add(
        resolve({
          categoriaId: c.categoriaId,
          contaPlanoId: c.contaPlanoId,
          origem: c.origem,
        }),
        c.valor,
      );
    }
    for (const c of state.contasPagar) {
      if (c.empresaId !== empresaId || c.competencia !== periodo) continue;
      add(
        resolve({
          categoriaId: c.categoriaId,
          contaPlanoId: c.contaPlanoId,
          origem: c.origem,
        }),
        c.valor,
      );
    }
    return porCat;
  }

  // competência (padrão)
  for (const f of state.faturamentos) {
    if (f.empresaId !== empresaId || f.competencia !== periodo) continue;
    const cr = state.contasReceber.find((c) => c.id === f.contaReceberId);
    add(
      resolve({
        categoriaId: cr?.categoriaId,
        contaPlanoId: cr?.contaPlanoId ?? PLANO_CONTA_IDS.receitaVendas,
        origem: "faturamento",
      }) ?? CATEGORIA_IDS.receitaVendas,
      f.valor,
    );
  }
  for (const c of state.contasReceber) {
    if (c.empresaId !== empresaId || c.competencia !== periodo) continue;
    if (c.origem === "faturamento") continue;
    add(
      resolve({
        categoriaId: c.categoriaId,
        contaPlanoId: c.contaPlanoId,
        origem: c.origem,
      }),
      c.valor,
    );
  }
  for (const c of state.contasPagar) {
    if (c.empresaId !== empresaId || c.competencia !== periodo) continue;
    add(
      resolve({
        categoriaId: c.categoriaId,
        contaPlanoId: c.contaPlanoId,
        origem: c.origem,
      }),
      c.valor,
    );
  }
  return porCat;
}

/** @deprecated use lancamentosPorCategoria — mantido para gráficos que leem por conta. */
export function lancamentosPorConta(
  state: AppState,
  empresaId: string,
  competencia: string,
  regime: DreRegime = "competencia",
): Record<string, number> {
  const porCat = lancamentosPorCategoria(state, empresaId, competencia, regime);
  const porConta: Record<string, number> = {};
  for (const cat of state.categoriasFinanceiras ?? []) {
    const v = porCat[cat.id] ?? 0;
    if (!v || !cat.contaPlanoId) continue;
    porConta[cat.contaPlanoId] = (porConta[cat.contaPlanoId] ?? 0) + v;
  }
  return porConta;
}

export function competenciaAnterior(comp: string) {
  const [y, m] = comp.split("-").map(Number);
  if (!y || !m) return comp;
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function listCompetencias(around: string, count = 6): string[] {
  const [y, m] = around.split("-").map(Number);
  if (!y || !m) return [around];
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export function computeDre(
  state: AppState,
  empresaId: string,
  periodo: string,
  regime: DreRegime = "competencia",
): DreResultado {
  const grupos = [...(state.gruposDre ?? [])]
    .filter((g) => g.ativo)
    .sort((a, b) => a.ordem - b.ordem);
  const categorias = (state.categoriasFinanceiras ?? []).filter(
    (c) => c.ativa && c.grupoDreId,
  );
  const porCategoria = lancamentosPorCategoria(state, empresaId, periodo, regime);
  const porGrupo: Record<string, number> = {};

  for (const g of grupos) {
    porGrupo[g.id] = categorias
      .filter((c) => c.grupoDreId === g.id)
      .reduce((a, c) => a + (porCategoria[c.id] ?? 0), 0);
  }

  const gByTipo = (tipo: GrupoDre["tipo"]) => grupos.filter((g) => g.tipo === tipo);
  const sumTipo = (tipo: GrupoDre["tipo"]) =>
    gByTipo(tipo).reduce((a, g) => a + (porGrupo[g.id] ?? 0), 0);

  const receitaBruta = sumTipo("receita");
  const deducoes = sumTipo("deducao");
  const receitaLiquida = receitaBruta - deducoes;
  const custos = sumTipo("custo");
  const lucroBruto = receitaLiquida - custos;

  // Despesas por grupo específico (ordem Sensio)
  const despesasOp = porGrupo["gdre-despesas-op"] ?? 0;
  const despesasVendas = porGrupo["gdre-despesas-vendas"] ?? 0;
  const despesasAdmin = porGrupo["gdre-despesas-admin"] ?? 0;
  const despesasFin =
    (porGrupo["gdre-despesas-fin"] ?? 0) + (porGrupo["gdre-resultado-fin"] ?? 0);
  const receitasFin = porGrupo["gdre-receitas-fin"] ?? 0;

  const outrasDespesas = gByTipo("despesa").reduce((a, g) => {
    if (
      [
        "gdre-despesas-op",
        "gdre-despesas-vendas",
        "gdre-despesas-admin",
        "gdre-despesas-fin",
        "gdre-resultado-fin",
      ].includes(g.id)
    ) {
      return a;
    }
    return a + (porGrupo[g.id] ?? 0);
  }, 0);

  const resultadoOperacional =
    lucroBruto - despesasOp - despesasVendas - despesasAdmin - outrasDespesas - despesasFin + receitasFin;
  const resultadoLiquido = resultadoOperacional;

  const linhas: DreLinha[] = [];
  const pushSub = (id: string, label: string, valor: number, destaque?: boolean) => {
    linhas.push({
      id,
      tipo: destaque ? "total" : "subtotal",
      label,
      valor,
      pctReceita: pct(valor, receitaBruta),
      destaque,
    });
  };

  const pushGrupo = (g: GrupoDre) => {
    const valorAbs = porGrupo[g.id] ?? 0;
    const valor = g.sinal === -1 ? -valorAbs : valorAbs;
    const cats = categorias
      .filter((c) => c.grupoDreId === g.id)
      .map((c) => ({
        id: c.id,
        nome: c.nome,
        valor: porCategoria[c.id] ?? 0,
        pctReceita: pct(porCategoria[c.id] ?? 0, receitaBruta),
      }))
      .filter((c) => c.valor !== 0)
      .sort((a, b) => b.valor - a.valor);

    linhas.push({
      id: g.id,
      tipo: "grupo",
      label: g.sinal === -1 ? `(-) ${g.nome}` : g.sinal === 1 && g.tipo === "resultado" ? `(+) ${g.nome}` : g.nome,
      valor,
      pctReceita: pct(Math.abs(valor), receitaBruta),
      grupoId: g.id,
      categorias: cats,
    });
  };

  for (const g of gByTipo("receita")) pushGrupo(g);
  for (const g of gByTipo("deducao")) pushGrupo(g);
  pushSub("sub-liquida", "(=) Receita líquida", receitaLiquida);
  for (const g of gByTipo("custo")) pushGrupo(g);
  pushSub("sub-bruto", "(=) Lucro bruto", lucroBruto);

  for (const g of grupos.filter((x) =>
    ["gdre-despesas-op", "gdre-despesas-vendas", "gdre-despesas-admin"].includes(x.id),
  )) {
    pushGrupo(g);
  }
  for (const g of gByTipo("despesa").filter(
    (x) =>
      ![
        "gdre-despesas-op",
        "gdre-despesas-vendas",
        "gdre-despesas-admin",
        "gdre-despesas-fin",
        "gdre-resultado-fin",
      ].includes(x.id),
  )) {
    pushGrupo(g);
  }

  const finDesp = grupos.find((g) => g.id === "gdre-despesas-fin" || g.id === "gdre-resultado-fin");
  if (finDesp) pushGrupo(finDesp);
  for (const g of gByTipo("resultado")) pushGrupo(g);

  pushSub("total-liquido", "(=) Lucro / prejuízo operacional", resultadoLiquido, true);

  return {
    regime,
    linhas,
    receitaBruta,
    deducoes,
    receitaLiquida,
    custos,
    lucroBruto,
    despesasOp,
    despesasVendas,
    despesasAdmin,
    despesasFin,
    receitasFin,
    resultadoOperacional,
    resultadoLiquido,
    margemBrutaPct: pct(lucroBruto, receitaBruta),
    margemLiquidaPct: pct(resultadoLiquido, receitaBruta),
    porCategoria,
    porGrupo,
  };
}

export function variacaoPct(atual: number, anterior: number) {
  if (!anterior) return atual ? 100 : 0;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

export const REGIME_LABEL: Record<DreRegime, string> = {
  competencia: "Competência",
  caixa: "Caixa",
  faturamento: "Vendas / compras",
};
