import type { Insumo, Produto, TipoNegocio } from "./types";

export type LinhaFicha = {
  insumoId: string;
  consumoPorPeca: number;
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
