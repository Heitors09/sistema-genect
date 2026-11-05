import { saldoConta, uid } from "./format";
import type {
  AppState,
  ContaPagar,
  ContaReceber,
  FaltaFuncionario,
  FormaPagamento,
  Funcionario,
  ParcelaPrevista,
  TipoContaBancaria,
  TipoFolha,
} from "./types";

export const formaPagamentoLabel: Record<FormaPagamento, string> = {
  pix: "PIX",
  boleto: "Boleto",
  transferencia: "Transferência",
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  cheque: "Cheque",
  debito_automatico: "Débito automático",
};

export const FORMAS_PAGAMENTO = Object.keys(formaPagamentoLabel) as FormaPagamento[];

export const tipoFolhaLabel: Record<TipoFolha, string> = {
  salario: "Salário",
  adiantamento: "Adiantamento",
  bonificacao: "Bonificação",
  vale: "Vale",
  rescisao: "Rescisão",
  outros: "Outros",
};

export const tipoContaBancariaLabel: Record<TipoContaBancaria, string> = {
  corrente: "Conta corrente",
  poupanca: "Poupança",
  caixa: "Caixa (dinheiro)",
  cartao: "Cartão",
  investimento: "Investimento",
};

/* ---------- datas ---------- */

export function addDays(iso: string, dias: number) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + dias);
  return toISO(dt);
}

export function addMonths(iso: string, meses: number, dia?: number) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const alvoDia = dia ?? d ?? 1;
  const base = new Date(y, (m || 1) - 1 + meses, 1);
  const ultimo = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  base.setDate(Math.min(alvoDia, ultimo));
  return toISO(base);
}

function toISO(dt: Date) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function competenciaDe(iso: string) {
  return iso.slice(0, 7);
}

export function diasNoMes(comp: string) {
  const [y, m] = comp.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function listarDias(de: string, ate: string) {
  const out: string[] = [];
  let cur = de;
  let guard = 0;
  while (cur <= ate && guard < 800) {
    out.push(cur);
    cur = addDays(cur, 1);
    guard++;
  }
  return out;
}

/* ---------- parcelas ---------- */

function arred(v: number) {
  return Math.round(v * 100) / 100;
}

/**
 * Divide `total` em `n` parcelas. A 1ª vence em `primeiroVencimento`;
 * as demais a cada `intervaloDias` (padrão: mensal no mesmo dia).
 * Diferença de centavos vai para a última parcela.
 */
export function gerarParcelas(
  total: number,
  n: number,
  primeiroVencimento: string,
  intervaloDias?: number,
): ParcelaPrevista[] {
  const qtd = Math.max(1, Math.floor(n) || 1);
  const base = arred(total / qtd);
  return Array.from({ length: qtd }, (_, i) => ({
    id: uid("par"),
    numero: i + 1,
    valor: i === qtd - 1 ? arred(total - base * (qtd - 1)) : base,
    vencimento: intervaloDias
      ? addDays(primeiroVencimento, intervaloDias * i)
      : addMonths(primeiroVencimento, i),
  }));
}

export function somaParcelas(parcelas: { valor: number }[]) {
  return arred(parcelas.reduce((a, p) => a + (Number(p.valor) || 0), 0));
}

/* ---------- favorecido / cliente ---------- */

export function nomeFavorecido(state: AppState, c: ContaPagar) {
  if (c.funcionarioId) return state.funcionarios.find((f) => f.id === c.funcionarioId)?.nome ?? "Funcionário";
  if (c.fornecedorId) return state.fornecedores.find((f) => f.id === c.fornecedorId)?.razaoSocial ?? "—";
  if (c.clienteId) return state.clientes.find((f) => f.id === c.clienteId)?.nome ?? "—";
  if (c.favorecido) return c.favorecido;
  if (c.origem === "faccao") return c.descricao.split(" · ")[0] || "Terceirizado";
  return "—";
}

/* ---------- RH / folha ---------- */

export function funcionarioAtivoEm(f: Funcionario, comp: string) {
  const inicio = `${comp}-01`;
  const fim = `${comp}-${String(diasNoMes(comp)).padStart(2, "0")}`;
  if (f.dataAdmissao && f.dataAdmissao > fim) return false;
  if (f.dataDemissao && f.dataDemissao < inicio) return false;
  return true;
}

export function funcionarioDemitido(f: Funcionario, hoje: string) {
  return Boolean(f.dataDemissao && f.dataDemissao <= hoje);
}

export type ResumoFolha = {
  funcionario: Funcionario;
  competencia: string;
  diasTrabalhaveis: number;
  diasNoMes: number;
  bruto: number;
  faltas: FaltaFuncionario[];
  faltasDescontadas: number;
  descontoFaltas: number;
  adiantamentos: ContaPagar[];
  totalAdiantamentos: number;
  outros: ContaPagar[];
  liquido: number;
  salario?: ContaPagar;
  pago: number;
  saldo: number;
};

/** Calcula salário do mês: proporcional à admissão/demissão, menos faltas e adiantamentos. */
export function resumoFolha(state: AppState, f: Funcionario, comp: string): ResumoFolha {
  const total = diasNoMes(comp);
  const inicio = `${comp}-01`;
  const fim = `${comp}-${String(total).padStart(2, "0")}`;
  const de = f.dataAdmissao && f.dataAdmissao > inicio ? f.dataAdmissao : inicio;
  const ate = f.dataDemissao && f.dataDemissao < fim ? f.dataDemissao : fim;
  const dias = de > ate ? 0 : Number(ate.slice(8, 10)) - Number(de.slice(8, 10)) + 1;
  const bruto = arred((f.salarioMensal || 0) * (dias / total));
  const faltas = state.faltas.filter((x) => x.funcionarioId === f.id && x.competencia === comp);
  const faltasDescontadas = faltas.filter((x) => !x.justificada).length;
  const descontoFaltas = arred(((f.salarioMensal || 0) / 30) * faltasDescontadas);
  const lanc = state.contasPagar.filter(
    (c) => c.funcionarioId === f.id && c.competencia === comp && c.origem === "folha",
  );
  const adiantamentos = lanc.filter((c) => c.tipoFolha === "adiantamento" || c.tipoFolha === "vale");
  const totalAdiantamentos = arred(adiantamentos.reduce((a, c) => a + c.valor, 0));
  const outros = lanc.filter(
    (c) => c.tipoFolha && c.tipoFolha !== "salario" && c.tipoFolha !== "adiantamento" && c.tipoFolha !== "vale",
  );
  const liquido = Math.max(0, arred(bruto - descontoFaltas - totalAdiantamentos));
  const salario = lanc.find((c) => c.tipoFolha === "salario");
  const pago = salario ? arred(salario.valor - saldoConta(salario.valor, salario.pagamentos)) : 0;
  return {
    funcionario: f,
    competencia: comp,
    diasTrabalhaveis: dias,
    diasNoMes: total,
    bruto,
    faltas,
    faltasDescontadas,
    descontoFaltas,
    adiantamentos,
    totalAdiantamentos,
    outros,
    liquido,
    salario,
    pago,
    saldo: salario ? saldoConta(salario.valor, salario.pagamentos) : liquido,
  };
}

export function salarioOrigemId(funcionarioId: string, comp: string) {
  return `sal:${funcionarioId}:${comp}`;
}

/**
 * Gera (ou atualiza) o lançamento de salário de cada funcionário ativo na competência.
 * Salário já pago (com pagamentos) não é alterado.
 */
export function sincronizarSalarios(
  state: AppState,
  comps: string[],
  categoria: { categoriaId?: string; contaPlanoId?: string },
): AppState {
  let contasPagar = state.contasPagar;
  let mudou = false;
  for (const comp of [...new Set(comps.filter(Boolean))]) {
    for (const f of state.funcionarios) {
      const origemId = salarioOrigemId(f.id, comp);
      const existente = contasPagar.find((c) => c.origem === "folha" && c.origemId === origemId);
      const ativo = funcionarioAtivoEm(f, comp);
      if (!ativo) {
        if (existente && !existente.pagamentos.some((p) => !p.estornado)) {
          contasPagar = contasPagar.filter((c) => c.id !== existente.id);
          mudou = true;
        }
        continue;
      }
      const r = resumoFolha({ ...state, contasPagar }, f, comp);
      const venc = `${comp}-${String(Math.min(28, Math.max(1, f.diaPagamento || 5))).padStart(2, "0")}`;
      const vencimento = addMonths(venc, 1, Math.min(28, Math.max(1, f.diaPagamento || 5)));
      if (!existente) {
        contasPagar = [
          {
            id: uid("cp"),
            empresaId: f.empresaId,
            descricao: `Salário ${comp} · ${f.nome}`,
            origem: "folha",
            origemId,
            funcionarioId: f.id,
            tipoFolha: "salario",
            categoriaId: categoria.categoriaId,
            contaPlanoId: categoria.contaPlanoId,
            contaBancariaId: f.contaBancariaId,
            formaPagamento: "pix",
            valor: r.liquido,
            vencimento,
            competencia: comp,
            pagamentos: [],
          },
          ...contasPagar,
        ];
        mudou = true;
        continue;
      }
      const temPagamento = existente.pagamentos.some((p) => !p.estornado);
      if (!temPagamento && existente.valor !== r.liquido) {
        contasPagar = contasPagar.map((c) => (c.id === existente.id ? { ...c, valor: r.liquido } : c));
        mudou = true;
      }
    }
  }
  return mudou ? { ...state, contasPagar } : state;
}

/* ---------- fluxo de caixa ---------- */

export type LancamentoFluxo = {
  id: string;
  tipo: "debito" | "credito";
  descricao: string;
  favorecido: string;
  valor: number;
  /** "conta" = lançamento em Despesas/Receitas; "op" = parcela prevista de OP ainda não faturada. */
  fonte: "conta" | "op";
  href: string;
};

/** Uma linha do fluxo. `data` = dia `YYYY-MM-DD`. */
export type DiaFluxo = {
  data: string;
  debito: number;
  credito: number;
  saldoDia: number;
  acumulado: number;
  lancamentos: LancamentoFluxo[];
};

export type FluxoCaixa = {
  abertura: number;
  previsto: DiaFluxo[];
  realizado: DiaFluxo[];
};

function daEmpresa(empresaId: string, id: string) {
  return empresaId === "todas" || empresaId === id;
}

function opsComPrevisao(state: AppState) {
  const faturadas = new Set(state.faturamentos.map((f) => f.opId));
  return state.ops.filter((o) => o.status !== "cancelada" && !faturadas.has(o.id) && o.pagamento?.parcelas?.length);
}

function nomeCliente(state: AppState, c: ContaReceber) {
  return state.clientes.find((x) => x.id === c.clienteId)?.nome ?? "—";
}

/**
 * Fluxo de caixa **diário**.
 * Débito = Despesas (contas a pagar). Crédito = Receitas (contas a receber).
 * Previsto: pelo vencimento (inclui parcelas previstas das OPs ainda não faturadas).
 * Realizado: pela data do pagamento/recebimento efetivo.
 */
export function calcularFluxo(state: AppState, empresaId: string, de: string, ate: string): FluxoCaixa {
  const dias = listarDias(de, ate);
  const vazio = () =>
    new Map(dias.map((d) => [d, { debito: 0, credito: 0, lancamentos: [] as LancamentoFluxo[] }]));
  const prev = vazio();
  const real = vazio();

  const saldoInicial = state.contasBancarias
    .filter((c) => c.ativa && daEmpresa(empresaId, c.empresaId))
    .reduce((a, c) => a + (c.saldoInicial || 0), 0);
  let realizadoAntes = 0;

  for (const c of state.contasPagar) {
    if (!daEmpresa(empresaId, c.empresaId)) continue;
    const fav = nomeFavorecido(state, c);
    const href = c.origem === "folha" ? "/financeiro/folha" : "/financeiro/despesas";
    const dia = prev.get(c.vencimento);
    if (dia) {
      dia.debito += c.valor;
      dia.lancamentos.push({ id: c.id, tipo: "debito", descricao: c.descricao, favorecido: fav, valor: c.valor, fonte: "conta", href });
    }
    for (const p of c.pagamentos) {
      if (p.estornado) continue;
      if (p.data < de) {
        realizadoAntes -= p.valor;
        continue;
      }
      const d = real.get(p.data);
      if (d) {
        d.debito += p.valor;
        d.lancamentos.push({ id: p.id, tipo: "debito", descricao: c.descricao, favorecido: fav, valor: p.valor, fonte: "conta", href });
      }
    }
  }

  for (const c of state.contasReceber) {
    if (!daEmpresa(empresaId, c.empresaId)) continue;
    const fav = nomeCliente(state, c);
    const dia = prev.get(c.vencimento);
    if (dia) {
      dia.credito += c.valor;
      dia.lancamentos.push({ id: c.id, tipo: "credito", descricao: c.descricao, favorecido: fav, valor: c.valor, fonte: "conta", href: "/financeiro/receitas" });
    }
    for (const r of c.recebimentos) {
      if (r.estornado) continue;
      if (r.data < de) {
        realizadoAntes += r.valor;
        continue;
      }
      const d = real.get(r.data);
      if (d) {
        d.credito += r.valor;
        d.lancamentos.push({ id: r.id, tipo: "credito", descricao: c.descricao, favorecido: fav, valor: r.valor, fonte: "conta", href: "/financeiro/receitas" });
      }
    }
  }

  for (const op of opsComPrevisao(state)) {
    if (!daEmpresa(empresaId, op.empresaId)) continue;
    const cli = state.clientes.find((x) => x.id === op.clienteId)?.nome ?? "—";
    const parcelas = op.pagamento?.parcelas ?? [];
    for (const p of parcelas) {
      const dia = prev.get(p.vencimento);
      if (!dia) continue;
      dia.credito += p.valor;
      dia.lancamentos.push({
        id: `${op.id}:${p.id}`,
        tipo: "credito",
        descricao: `${op.numero} · parcela ${p.numero}/${parcelas.length} (a faturar)`,
        favorecido: cli,
        valor: p.valor,
        fonte: "op",
        href: `/ops/${op.id}`,
      });
    }
  }

  const abertura = arred(saldoInicial + realizadoAntes);
  const montar = (mapa: ReturnType<typeof vazio>) => {
    let acc = abertura;
    return dias.map((d) => {
      const x = mapa.get(d)!;
      const saldoDia = arred(x.credito - x.debito);
      acc = arred(acc + saldoDia);
      return { data: d, debito: arred(x.debito), credito: arred(x.credito), saldoDia, acumulado: acc, lancamentos: x.lancamentos };
    });
  };
  return { abertura, previsto: montar(prev), realizado: montar(real) };
}

/* ---------- ordenação estilo planilha ---------- */

export type SortDir = "asc" | "desc";

export function ordenar<T>(
  rows: T[],
  sort: { key: string; dir: SortDir } | null | undefined,
  getters: Record<string, (row: T) => string | number>,
) {
  if (!sort) return rows;
  const get = getters[sort.key];
  if (!get) return rows;
  const mult = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = get(a);
    const vb = get(b);
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * mult;
    return String(va).localeCompare(String(vb), "pt-BR", { sensitivity: "base", numeric: true }) * mult;
  });
}
