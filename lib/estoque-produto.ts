import type { OrdemProducao, Produto } from "./types";

export type PecaSku = { tamanho: string; cor: string; quantidade: number };

export type SkuSaldo = PecaSku & { produzido: number; faturado: number; saldo: number };

export function pecasOpPorSku(op: OrdemProducao): PecaSku[] {
  const rows: PecaSku[] = [];
  for (const linha of op.linhas ?? []) {
    if (linha.variacoes?.length) {
      for (const v of linha.variacoes) {
        if (v.quantidade > 0) rows.push({ tamanho: v.tamanho, cor: v.cor, quantidade: v.quantidade });
      }
    } else if (linha.quantidade > 0) {
      rows.push({ tamanho: linha.tamanho ?? "", cor: op.cor, quantidade: linha.quantidade });
    }
  }
  if (rows.length) return rows;
  const q = op.quantidadeProduzida || op.quantidade;
  if (q > 0) return [{ tamanho: "", cor: op.cor || "", quantidade: q }];
  return [];
}

export function resumoPecasSku(skus: PecaSku[]) {
  return skus
    .map((s) => [s.tamanho, s.cor, `${s.quantidade} pç`].filter(Boolean).join(" "))
    .join(" · ");
}

export function estoqueDoProduto(produto: Produto, ops: OrdemProducao[], faturados: Set<string>): SkuSaldo[] {
  const map = new Map<string, SkuSaldo>();

  function slot(tamanho: string, cor: string) {
    const k = `${tamanho}||${cor}`;
    let s = map.get(k);
    if (!s) {
      s = { tamanho, cor, quantidade: 0, produzido: 0, faturado: 0, saldo: 0 };
      map.set(k, s);
    }
    return s;
  }

  for (const v of produto.variacoes ?? []) {
    for (const cor of v.cores) slot(v.tamanho, cor);
  }

  for (const op of ops) {
    if (op.produtoId !== produto.id || op.status === "cancelada") continue;
    const pecas = pecasOpPorSku(op);
    const totalLinha = pecas.reduce((a, p) => a + p.quantidade, 0) || 1;
    const produzidoOp = op.quantidadeProduzida || (op.status === "finalizada" ? op.quantidade : 0);
    if (!produzidoOp) continue;
    const billed = faturados.has(op.id);
    for (const p of pecas) {
      const q = Math.round((produzidoOp * p.quantidade) / totalLinha);
      const s = slot(p.tamanho, p.cor);
      s.produzido += q;
      if (billed) s.faturado += q;
    }
  }

  for (const s of map.values()) {
    s.saldo = Math.max(0, s.produzido - s.faturado);
    s.quantidade = s.saldo;
  }
  return [...map.values()];
}
