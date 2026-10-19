"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BarChartMensal, DespesaBreakdown } from "@/components/financeiro/finance-charts";
import { Badge, Button, Card, PageHeader, Select, Stat, cn } from "@/components/ui";
import {
  competenciaAnterior,
  computeDre,
  listCompetencias,
  REGIME_LABEL,
  variacaoPct,
} from "@/lib/dre";
import { brl, competenciaAtual, orcamentoLabel, saldoConta } from "@/lib/format";
import type { DreRegime } from "@/lib/types";
import { useStore } from "@/lib/store/store";

const MES_LABEL: Record<string, string> = {
  "01": "Jan",
  "02": "Fev",
  "03": "Mar",
  "04": "Abr",
  "05": "Mai",
  "06": "Jun",
  "07": "Jul",
  "08": "Ago",
  "09": "Set",
  "10": "Out",
  "11": "Nov",
  "12": "Dez",
};

function labelComp(comp: string) {
  const [, m] = comp.split("-");
  return MES_LABEL[m ?? ""] ?? comp;
}

export default function FinanceiroPage() {
  const { state, isAdmin } = useStore();
  const [empresaId, setEmpresaId] = useState(state.empresas[0]?.id ?? "");
  const [comp, setComp] = useState(competenciaAtual());
  const [regime, setRegime] = useState<DreRegime>("competencia");
  const [expand, setExpand] = useState<Record<string, boolean>>({});
  const orc = state.orcamentos.find((o) => o.empresaId === empresaId && o.competencia === comp);

  const comps = useMemo(() => listCompetencias(comp, 6), [comp]);
  const dre = useMemo(() => computeDre(state, empresaId, comp, regime), [state, empresaId, comp, regime]);
  const dreAnt = useMemo(
    () => computeDre(state, empresaId, competenciaAnterior(comp), regime),
    [state, empresaId, comp, regime],
  );

  const receitaSerie = useMemo(() => {
    return comps.map((c) => ({
      label: labelComp(c),
      valor: computeDre(state, empresaId, c, regime).receitaBruta,
    }));
  }, [comps, state, empresaId, regime]);

  const despesaItems = useMemo(() => {
    const cats = state.categoriasFinanceiras.filter(
      (c) => c.ativa && c.tipo === "despesa_custo" && c.grupoDreId,
    );
    return cats
      .map((c) => {
        const valor = dre.porCategoria[c.id] ?? 0;
        const ant = dreAnt.porCategoria[c.id] ?? 0;
        return { label: c.nome, valor, pct: variacaoPct(valor, ant) };
      })
      .filter((x) => x.valor > 0)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 6);
  }, [state.categoriasFinanceiras, dre, dreAnt]);

  const fluxo = useMemo(() => {
    const pagar = state.contasPagar.filter((c) => c.empresaId === empresaId);
    const receber = state.contasReceber.filter((c) => c.empresaId === empresaId);
    const previstoSaida = pagar.reduce((a, c) => a + saldoConta(c.valor, c.pagamentos), 0);
    const previstoEntrada = receber.reduce((a, c) => a + saldoConta(c.valor, c.recebimentos), 0);
    const realizadoSaida = pagar.flatMap((c) => c.pagamentos).filter((p) => !p.estornado).reduce((a, p) => a + p.valor, 0);
    const realizadoEntrada = receber.flatMap((c) => c.recebimentos).filter((p) => !p.estornado).reduce((a, p) => a + p.valor, 0);
    return { previstoSaida, previstoEntrada, realizadoSaida, realizadoEntrada };
  }, [state, empresaId]);

  if (!isAdmin) return <p className="p-6 text-sm text-mute">Financeiro visível apenas para o administrador.</p>;

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Financeiro"
        title="Visão gerencial"
        description="DRE gerencial com categorias e grupos, nos regimes Caixa, Competência e Vendas/Compras. Impostos ficam de fora até definir o regime tributário."
        actions={
          <>
            <Link href="/financeiro/plano-gerencial"><Button variant="ghost">Plano gerencial</Button></Link>
            <Link href="/financeiro/despesas"><Button variant="ghost">Despesas</Button></Link>
            <Link href="/financeiro/receitas"><Button>Receita de vendas</Button></Link>
          </>
        }
      />
      <div className="flex flex-wrap gap-2">
        <Select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} className="max-w-56">
          {state.empresas.filter((e) => e.ativa).map((e) => (
            <option key={e.id} value={e.id}>{e.nome}</option>
          ))}
        </Select>
        <Select value={comp} onChange={(e) => setComp(e.target.value)} className="max-w-36">
          {Array.from(new Set([...comps, "2026-10", "2026-09", "2026-08", comp])).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
        <Select value={regime} onChange={(e) => setRegime(e.target.value as DreRegime)} className="max-w-48">
          {(Object.keys(REGIME_LABEL) as DreRegime[]).map((r) => (
            <option key={r} value={r}>{REGIME_LABEL[r]}</option>
          ))}
        </Select>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Receita de vendas"
          value={brl.format(dre.receitaBruta)}
          tone="mint"
          hint={`${REGIME_LABEL[regime]} · ${comp}`}
        />
        <Stat
          label="Lucro bruto"
          value={brl.format(dre.lucroBruto)}
          hint={`Margem ${dre.margemBrutaPct.toFixed(1)}%`}
        />
        <Stat
          label="Resultado operacional"
          value={brl.format(dre.resultadoOperacional)}
          hint="Após despesas e financeiro"
        />
        <Stat
          label="Margem líquida"
          value={`${dre.margemLiquidaPct.toFixed(1)}%`}
          tone={dre.resultadoLiquido >= 0 ? "mint" : "rose"}
          hint={brl.format(dre.resultadoLiquido)}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-5">
        <Card className="p-4 lg:col-span-3">
          <p className="kicker mb-3">Receita de vendas · últimos meses</p>
          <BarChartMensal
            items={receitaSerie}
            highlight={labelComp(comp)}
          />
        </Card>
        <Card className="p-4 lg:col-span-2">
          <p className="kicker mb-3">Categorias · vs mês anterior</p>
          <DespesaBreakdown items={despesaItems} />
        </Card>
      </div>

      <div>
        <p className="kicker mb-3">Fluxo de caixa — previsto × realizado</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Entradas previstas" value={brl.format(fluxo.previstoEntrada)} hint="Em aberto" />
          <Stat label="Entradas realizadas" value={brl.format(fluxo.realizadoEntrada)} tone="mint" />
          <Stat label="Saídas previstas" value={brl.format(fluxo.previstoSaida)} />
          <Stat label="Saídas realizadas" value={brl.format(fluxo.realizadoSaida)} tone="rose" />
        </div>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="kicker">DRE Gerencial · {REGIME_LABEL[regime]} · {comp}</p>
          <div className="flex items-center gap-2">
            {orc ? (
              <Badge tone={orc.status === "fechado" ? "mint" : orc.status === "aprovado" ? "sky" : "amber"}>
                Orç. {orcamentoLabel[orc.status]}
              </Badge>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const next: Record<string, boolean> = {};
                for (const l of dre.linhas) {
                  if (l.tipo === "grupo") next[l.id] = true;
                }
                setExpand(next);
              }}
            >
              Expandir categorias
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          {dre.linhas.map((linha) => {
            const open = expand[linha.id];
            const hasCats = !!linha.categorias?.length;
            return (
              <div key={linha.id}>
                <button
                  type="button"
                  disabled={!hasCats}
                  onClick={() => setExpand((e) => ({ ...e, [linha.id]: !e[linha.id] }))}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-[13px]",
                    linha.tipo === "total"
                      ? "border border-line-strong bg-elevated"
                      : linha.tipo === "subtotal"
                        ? "bg-panel"
                        : "bg-elevated/40 hover:bg-elevated/70",
                    hasCats && "cursor-pointer",
                  )}
                >
                  <span className={cn(linha.destaque ? "font-semibold text-ink" : "text-mute")}>
                    {hasCats ? (open ? "▾ " : "▸ ") : ""}
                    {linha.label}
                  </span>
                  <span className="flex items-baseline gap-3">
                    {linha.pctReceita != null && linha.tipo !== "total" ? (
                      <span className="text-[11px] tabular-nums text-faint">{linha.pctReceita.toFixed(1)}%</span>
                    ) : null}
                    <span
                      className={cn(
                        "min-w-[7rem] text-right font-semibold tabular-nums tracking-tight",
                        linha.valor < 0 ? "text-rose" : "text-ink",
                        linha.tipo === "grupo" ? "text-[13px] font-medium" : "text-[15px]",
                      )}
                    >
                      {brl.format(linha.valor)}
                    </span>
                  </span>
                </button>
                {open && hasCats ? (
                  <div className="mb-1 ml-3 space-y-0.5 border-l border-line pl-3">
                    {linha.categorias!.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-2 py-1 text-[12px]">
                        <Link
                          href={
                            c.valor >= 0 && linha.grupoId === "gdre-receita-bruta"
                              ? "/financeiro/receitas"
                              : "/financeiro/despesas"
                          }
                          className="text-mute hover:text-sky hover:underline"
                        >
                          {c.nome}
                        </Link>
                        <span className="flex items-baseline gap-3">
                          <span className="tabular-nums text-faint">{c.pctReceita.toFixed(1)}%</span>
                          <span className="min-w-[6rem] text-right tabular-nums text-ink">
                            {brl.format(linha.valor < 0 ? -c.valor : c.valor)}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[12px] text-faint">
          Caixa = quitações no período · Competência = lançamentos pela competência · Vendas/compras = faturamento na data.
          Impostos não deduzidos.{" "}
          <Link href="/financeiro/plano-gerencial" className="text-sky hover:underline">Plano gerencial</Link>.
        </p>
      </Card>

      <Orcamentos />
    </div>
  );
}

function Orcamentos() {
  const { state, dispatch } = useStore();
  const [copyComp, setCopyComp] = useState("2026-10");
  return (
    <Card className="p-4">
      <p className="kicker mb-3">Orçamento da DRE · Rascunho → Aprovado → Fechado</p>
      <div className="space-y-2">
        {state.orcamentos.map((o) => {
          const emp = state.empresas.find((e) => e.id === o.empresaId);
          return (
            <div key={o.id} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-[13px]">
              <span className="min-w-0 truncate font-medium">{emp?.nome}</span>
              <span className="shrink-0 text-mute">{o.competencia}</span>
              <Badge tone={o.status === "fechado" ? "mint" : "amber"}>{orcamentoLabel[o.status]}</Badge>
              <span className="ml-auto shrink-0 tabular-nums text-mute">{brl.format(o.receitaBruta)}</span>
              {o.status !== "fechado" ? (
                <Button size="sm" variant="soft" onClick={() => dispatch({ type: "CYCLE_ORCAMENTO", id: o.id })}>
                  Avançar status
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "COPY_ORCAMENTO", id: o.id, competencia: copyComp })}>
                Copiar
              </Button>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[12px] text-mute">
        Copiar para
        <Select value={copyComp} onChange={(e) => setCopyComp(e.target.value)} className="w-32">
          <option>2026-10</option>
          <option>2026-11</option>
          <option>2026-12</option>
        </Select>
      </div>
    </Card>
  );
}
