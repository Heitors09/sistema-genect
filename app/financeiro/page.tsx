"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, PageHeader, Select, Stat, cn } from "@/components/ui";
import { brl, competenciaAtual, orcamentoLabel, saldoConta } from "@/lib/format";
import { useStore } from "@/lib/store/store";

export default function FinanceiroPage() {
  const { state, isAdmin } = useStore();
  const [empresaId, setEmpresaId] = useState(state.empresas[0]?.id ?? "");
  const [comp, setComp] = useState(competenciaAtual());
  const orc = state.orcamentos.find((o) => o.empresaId === empresaId && o.competencia === comp);

  const dre = useMemo(() => {
    const fats = state.faturamentos.filter((f) => f.empresaId === empresaId && f.competencia === comp);
    const receitaBruta = fats.reduce((a, f) => a + f.valor, 0);
    const varDesp = state.contasPagar
      .filter((c) => c.empresaId === empresaId && c.competencia === comp && (c.origem === "faccao" || c.origem === "compra"))
      .reduce((a, c) => a + c.valor, 0);
    const fixas = orc?.despesasFixas ?? 0;
    const fin = orc?.resultadoFinanceiro ?? 0;
    const trib = orc ? orc.tributos : receitaBruta * 0.09;
    const margem = receitaBruta - varDesp;
    const liquido = margem - fixas + fin - trib;
    return { receitaBruta, varDesp, margem, fixas, fin, trib, liquido };
  }, [state, empresaId, comp, orc]);

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
        description="Fluxo de caixa (previsto × realizado) separado da DRE. OP não entra como receita sem faturamento."
        actions={
          <>
            <Link href="/financeiro/pagar"><Button variant="ghost">Contas a pagar</Button></Link>
            <Link href="/financeiro/receber"><Button>Faturar e receber</Button></Link>
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
          <option value="2026-09">2026-09</option>
          <option value="2026-08">2026-08</option>
          <option value="2026-10">2026-10</option>
        </Select>
      </div>

      <div>
        <p className="kicker mb-3">Fluxo de caixa — não é saldo bancário</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Entradas previstas" value={brl.format(fluxo.previstoEntrada)} hint="Vencimentos em aberto" />
          <Stat label="Entradas realizadas" value={brl.format(fluxo.realizadoEntrada)} tone="mint" hint="Recebimentos" />
          <Stat label="Saídas previstas" value={brl.format(fluxo.previstoSaida)} hint="Contas em aberto" />
          <Stat label="Saídas realizadas" value={brl.format(fluxo.realizadoSaida)} tone="rose" hint="Pagamentos" />
        </div>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="kicker">DRE gerencial · competência {comp}</p>
          {orc ? <Badge tone={orc.status === "fechado" ? "mint" : orc.status === "aprovado" ? "sky" : "amber"}>{orcamentoLabel[orc.status]}</Badge> : null}
        </div>
        <div className="grid gap-2 text-[13px] sm:grid-cols-2">
          <Row label="Receita bruta (faturada)" value={dre.receitaBruta} />
          <Row label="Despesas variáveis" value={dre.varDesp} negative />
          <Row label="Margem" value={dre.margem} />
          <Row label="Despesas fixas" value={dre.fixas} negative />
          <Row label="Resultado financeiro" value={dre.fin} />
          <Row label="Tributos" value={dre.trib} negative />
          <div className="sm:col-span-2 border-t border-line pt-2">
            <Row label="Resultado líquido" value={dre.liquido} />
          </div>
        </div>
        {orc ? (
          <p className="mt-3 text-[12px] text-faint">
            Orçado {brl.format(orc.receitaBruta)} × realizado {brl.format(dre.receitaBruta)} em receita.
          </p>
        ) : (
          <p className="mt-3 text-[12px] text-faint">Sem orçamento nesta competência. Copie um existente abaixo.</p>
        )}
      </Card>

      <Orcamentos />
    </div>
  );
}

function Row({ label, value, negative }: { label: string; value: number; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-panel px-3 py-2">
      <span className="text-[13px] text-mute">{label}</span>
      <span className={cn("text-[15px] font-semibold tabular-nums tracking-tight", value < 0 || negative ? "text-rose" : "text-ink")}>
        {brl.format(value)}
      </span>
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
