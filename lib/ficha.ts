import type { Insumo, OrdemProducao, Produto, TipoNegocio } from "./types";

export type LinhaFicha = {
  insumoId: string;
  consumoPorPeca: number;
};

export type NecessidadeInsumo = {
  insumoId: string;
  qtdConsumo: number;
};

export function fichaLinhas(produto: Produto): LinhaFicha[] {
  const extras = produto.aviamentos ?? [];
  const jaTemBase = extras.some((a) => a.insumoId === produto.materiaPrimaId);
  const base =
    produto.materiaPrimaId && !jaTemBase
      ? [{ insumoId: produto.materiaPrimaId, consumoPorPeca: produto.consumoTecidoPorPeca }]
      : [];
  return [...base, ...extras].filter((l) => l.insumoId && l.consumoPorPeca > 0);
}

export function linhasReserva(produto: Produto, tipo: TipoNegocio): LinhaFicha[] {
  if (tipo === "servico") {
    return (produto.aviamentos ?? []).filter((l) => l.insumoId && l.consumoPorPeca > 0);
  }
  return fichaLinhas(produto);
}

export function tecidoBase(produto: Produto, insumos: Insumo[]) {
  return fichaLinhas(produto).find((l) => insumos.find((i) => i.id === l.insumoId)?.categoria === "tecido");
}

export function findProdutoByNumero(produtos: Produto[], numero: string) {
  const q = numero.trim().toLowerCase();
  if (!q) return undefined;
  return produtos.find((p) => p.referencia.toLowerCase() === q);
}

/** Peças da OP por produto (linha principal + extras). */
export function pecasOpPorProduto(op: OrdemProducao): { produtoId: string; pecas: number }[] {
  if (op.linhas?.length) {
    return op.linhas
      .filter((l) => l.produtoId && l.quantidade > 0)
      .map((l) => ({ produtoId: l.produtoId, pecas: l.quantidade }));
  }
  return op.produtoId && op.quantidade > 0 ? [{ produtoId: op.produtoId, pecas: op.quantidade }] : [];
}

/** Quantidade na unidade de compra (estoque), a partir do consumo da ficha. */
export function consumoEmEstoque(qtdConsumo: number, insumo: Insumo) {
  const fator = insumo.fatorConversao > 0 ? insumo.fatorConversao : 1;
  return qtdConsumo / fator;
}

/** Consumo da OP na unidade de consumo de cada insumo, lido da ficha do produto. */
export function necessidadesOp(op: OrdemProducao, produtos: Produto[]): NecessidadeInsumo[] {
  const map = new Map<string, number>();
  for (const { produtoId, pecas } of pecasOpPorProduto(op)) {
    const produto = produtos.find((p) => p.id === produtoId);
    if (!produto) continue;
    const tipo = op.tipoNegocio ?? produto.tipoNegocio;
    for (const linha of linhasReserva(produto, tipo)) {
      map.set(linha.insumoId, (map.get(linha.insumoId) ?? 0) + linha.consumoPorPeca * pecas);
    }
  }
  return [...map.entries()].map(([insumoId, qtdConsumo]) => ({ insumoId, qtdConsumo }));
}
