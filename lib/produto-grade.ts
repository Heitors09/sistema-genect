import type { OpVariacao, Produto } from "./types";

/** Tamanhos salvos no cadastro (lista ou derivados das variações). */
export function tamanhosDoProduto(produto: Produto): string[] {
  if (produto.tamanhos?.length) return produto.tamanhos;
  return [...new Set((produto.variacoes ?? []).map((v) => v.tamanho).filter(Boolean))];
}

/**
 * Variações de estoque (tamanho → cores) preenchidas no cadastro.
 * Sem isso, a OP usa só a grade de tamanhos.
 */
export function produtoTemVariacoesEstoque(produto: Produto): boolean {
  return (produto.variacoes ?? []).some((v) => Boolean(v.tamanho) && v.cores.length > 0);
}

/** Slots da grade na OP: tamanho×cor se houver variações; senão só tamanhos. */
export function slotsGradeProduto(produto: Produto): { tamanho: string; cor: string }[] {
  if (produtoTemVariacoesEstoque(produto)) {
    return (produto.variacoes ?? []).flatMap((g) => {
      if (!g.tamanho) return [];
      const cores = g.cores.length ? g.cores : [];
      if (!cores.length) return [{ tamanho: g.tamanho, cor: "" }];
      return cores.map((cor) => ({ tamanho: g.tamanho, cor }));
    });
  }

  const tams = tamanhosDoProduto(produto);
  if (tams.length) return tams.map((tamanho) => ({ tamanho, cor: "" }));

  if (produto.cores.length) {
    return produto.cores.map((cor) => ({ tamanho: "", cor }));
  }

  return [];
}

export function gradeModoProduto(produto: Produto): "variacoes" | "tamanhos" | "cores" | "nenhuma" {
  if (produtoTemVariacoesEstoque(produto)) return "variacoes";
  if (tamanhosDoProduto(produto).length) return "tamanhos";
  if (produto.cores.length) return "cores";
  return "nenhuma";
}

export function mergeGradeComCadastro(
  produto: Produto,
  existing?: OpVariacao[],
): OpVariacao[] {
  const slots = slotsGradeProduto(produto);
  if (!slots.length) return existing?.length ? existing : [];
  return slots.map((s) => {
    const hit = existing?.find(
      (e) =>
        e.tamanho === s.tamanho &&
        e.cor.toLowerCase() === s.cor.toLowerCase(),
    );
    return { tamanho: s.tamanho, cor: s.cor, quantidade: hit?.quantidade ?? 0 };
  });
}

/** Distribui total igualmente nas combinações do cadastro (linhas extras / fallback). */
export function gradeDoProduto(
  produto: Produto,
  quantidade: number,
  opts?: { tamanho?: string; cor?: string },
): OpVariacao[] {
  let slots = slotsGradeProduto(produto);
  if (opts?.tamanho) slots = slots.filter((s) => !s.tamanho || s.tamanho === opts.tamanho);
  const corFiltro = opts?.cor?.toLowerCase();
  if (corFiltro) {
    slots = slots.filter((s) => s.cor.toLowerCase() === corFiltro);
  }
  if (!slots.length) {
    const cor = opts?.cor || produto.cores[0] || "";
    return cor || opts?.tamanho
      ? [{ tamanho: opts?.tamanho || "", cor, quantidade }]
      : [];
  }
  const base = Math.floor(quantidade / slots.length);
  let resto = quantidade - base * slots.length;
  return slots.map((s) => {
    const q = base + (resto > 0 ? 1 : 0);
    if (resto > 0) resto -= 1;
    return { ...s, quantidade: q };
  });
}
