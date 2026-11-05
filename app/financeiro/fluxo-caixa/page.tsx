"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ListTree } from "lucide-react";
import { LinhaChart, MovimentoChart } from "@/components/financeiro/fluxo-charts";
import {
  Badge,
  Button,
  Card,
  DataTable,
  DateInput,
  Empty,
  Input,
  Modal,
  PageHeader,
  Select,
  Stat,
  TabPanel,
  Tabs,
  Td,
  cn,
} from "@/components/ui";
import { brl, competenciaAtual, formatDate } from "@/lib/format";
import { calcularFluxo, diasNoMes, type DiaFluxo } from "@/lib/financeiro";
import { useStore } from "@/lib/store/store";

type Aba = "previsto" | "realizado" | "comparativo";

function valorCls(v: number) {
  return cn("tabular-nums", v < 0 ? "text-rose" : "text-ink");
}

export default function FluxoCaixaPage() {
  const { state, isAdmin } = useStore();
  const [aba, setAba] = useState<Aba>("previsto");
  const [empresaId, setEmpresaId] = useState("todas");
  const [mes, setMes] = useState(competenciaAtual());
  const [personalizado, setPersonalizado] = useState(false);
  const [de, setDe] = useState(`${competenciaAtual()}-01`);
  const [ate, setAte] = useState(`${competenciaAtual()}-${String(diasNoMes(competenciaAtual())).padStart(2, "0")}`);
  const [soMovimento, setSoMovimento] = useState(true);
  const [detalhe, setDetalhe] = useState<{ dia: string; tipo: "previsto" | "realizado" } | null>(null);

  const periodo = personalizado
    ? { de: de <= ate ? de : ate, ate: de <= ate ? ate : de }
    : { de: `${mes}-01`, ate: `${mes}-${String(diasNoMes(mes)).padStart(2, "0")}` };

  const fluxo = useMemo(
    () => calcularFluxo(state, empresaId, periodo.de, periodo.ate),
    [state, empresaId, periodo.de, periodo.ate],
  );
  const dias = fluxo.previsto.map((d) => d.data);

  const totais = useMemo(() => {
    const soma = (rows: DiaFluxo[], k: "debito" | "credito") => rows.reduce((a, r) => a + r[k], 0);
    return {
      prevDeb: soma(fluxo.previsto, "debito"),
      prevCred: soma(fluxo.previsto, "credito"),
      realDeb: soma(fluxo.realizado, "debito"),
      realCred: soma(fluxo.realizado, "credito"),
      prevFinal: fluxo.previsto.at(-1)?.acumulado ?? fluxo.abertura,
      realFinal: fluxo.realizado.at(-1)?.acumulado ?? fluxo.abertura,
    };
  }, [fluxo]);

  if (!isAdmin) return <p className="p-6 text-sm text-mute">Acesso restrito.</p>;

  const rowsAba = aba === "realizado" ? fluxo.realizado : fluxo.previsto;
  const visiveis = (rows: DiaFluxo[]) => (soMovimento ? rows.filter((r) => r.debito || r.credito) : rows);
  const comparativo = fluxo.previsto.map((p, i) => ({ p, r: fluxo.realizado[i] }));
  const comparativoVis = soMovimento
    ? comparativo.filter(({ p, r }) => p.debito || p.credito || r.debito || r.credito)
    : comparativo;
  const diaDetalhe = detalhe
    ? (detalhe.tipo === "realizado" ? fluxo.realizado : fluxo.previsto).find((d) => d.data === detalhe.dia)
    : undefined;

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Financeiro"
        title="Fluxo de caixa"
        description="Controle diário. Débito = tudo que está em Despesas; crédito = tudo que está em Receitas."
        actions={
          <>
            <Link href="/financeiro/despesas"><Button variant="ghost">Despesas</Button></Link>
            <Link href="/financeiro/receitas"><Button variant="ghost">Receitas</Button></Link>
          </>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} className="w-full sm:w-52">
          <option value="todas">Todas as empresas</option>
          {state.empresas.map((e) => (
            <option key={e.id} value={e.id}>{e.nome}</option>
          ))}
        </Select>
        <Select
          value={personalizado ? "custom" : "mes"}
          onChange={(e) => setPersonalizado(e.target.value === "custom")}
          className="w-full sm:w-52"
        >
          <option value="mes">Dias de um mês</option>
          <option value="custom">Intervalo de datas</option>
        </Select>
        {personalizado ? (
          <>
            <DateInput value={de} onChange={(e) => setDe(e.target.value)} className="w-full sm:w-44" />
            <DateInput value={ate} onChange={(e) => setAte(e.target.value)} className="w-full sm:w-44" />
          </>
        ) : (
          <Input type="month" value={mes} onChange={(e) => setMes(e.target.value || competenciaAtual())} className="w-full sm:w-44" aria-label="Mês" />
        )}
        <label className="flex items-center gap-2 text-[12px] text-mute">
          <input type="checkbox" checked={soMovimento} onChange={(e) => setSoMovimento(e.target.checked)} />
          Ocultar dias sem movimento
        </label>
      </div>

      <Tabs
        value={aba}
        onChange={setAba}
        items={[
          { id: "previsto", label: "Previsto diário" },
          { id: "realizado", label: "Realizado" },
          { id: "comparativo", label: "Comparativo" },
        ]}
      />

      <TabPanel value={aba} className="space-y-4">
      {aba !== "comparativo" ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Saldo de abertura" value={brl.format(fluxo.abertura)} hint="Contas bancárias + realizado antes do período" />
            <Stat label="Créditos" value={brl.format(aba === "previsto" ? totais.prevCred : totais.realCred)} />
            <Stat label="Débitos" value={brl.format(aba === "previsto" ? totais.prevDeb : totais.realDeb)} />
            <Stat
              label="Saldo final"
              value={brl.format(aba === "previsto" ? totais.prevFinal : totais.realFinal)}
              tone={(aba === "previsto" ? totais.prevFinal : totais.realFinal) < 0 ? "rose" : "ink"}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="p-4">
              <p className="kicker mb-2">Movimento diário · {aba === "previsto" ? "previsto" : "realizado"}</p>
              <MovimentoChart
                dias={dias}
                credito={rowsAba.map((r) => r.credito)}
                debito={rowsAba.map((r) => r.debito)}
                onSelect={(dia) => setDetalhe({ dia, tipo: aba === "realizado" ? "realizado" : "previsto" })}
              />
            </Card>
            <Card className="p-4">
              <p className="kicker mb-2">Saldo acumulado · {aba === "previsto" ? "previsto" : "realizado"}</p>
              <LinhaChart
                dias={dias}
                ariaLabel="Saldo acumulado por dia"
                series={[
                  {
                    id: "acc",
                    label: "Saldo acumulado",
                    values: rowsAba.map((r) => r.acumulado),
                    color: aba === "previsto" ? "var(--amber)" : "var(--sky)",
                    dashed: aba === "previsto",
                  },
                ]}
              />
            </Card>
          </div>

          {visiveis(rowsAba).length ? (
            <DataTable headers={["Data", "Débito", "Crédito", "Saldo do dia", "Saldo acumulado", "Ações"]}>
              {visiveis(rowsAba).map((r) => (
                <tr key={r.data}>
                  <Td className="tabular-nums">{formatDate(r.data)}</Td>
                  <Td className="tabular-nums">{r.debito ? brl.format(r.debito) : "—"}</Td>
                  <Td className="tabular-nums">{r.credito ? brl.format(r.credito) : "—"}</Td>
                  <Td className={valorCls(r.saldoDia)}>{brl.format(r.saldoDia)}</Td>
                  <Td className={valorCls(r.acumulado)}>{brl.format(r.acumulado)}</Td>
                  <Td>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!r.lancamentos.length}
                        onClick={() => setDetalhe({ dia: r.data, tipo: aba === "realizado" ? "realizado" : "previsto" })}
                      >
                        <ListTree size={12} /> {r.lancamentos.length} lançamento{r.lancamentos.length === 1 ? "" : "s"}
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <Empty title="Sem movimento no período" />
          )}
        </>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Crédito previsto × real" value={brl.format(totais.realCred - totais.prevCred)} hint={`${brl.format(totais.prevCred)} → ${brl.format(totais.realCred)}`} />
            <Stat label="Débito previsto × real" value={brl.format(totais.realDeb - totais.prevDeb)} hint={`${brl.format(totais.prevDeb)} → ${brl.format(totais.realDeb)}`} />
            <Stat label="Acumulado previsto" value={brl.format(totais.prevFinal)} />
            <Stat
              label="Diferença no fim do período"
              value={brl.format(totais.realFinal - totais.prevFinal)}
              tone={totais.realFinal - totais.prevFinal < 0 ? "rose" : "mint"}
              hint="Real − previsto"
            />
          </div>
          <Card className="p-4">
            <p className="kicker mb-2">Saldo acumulado · previsto × realizado</p>
            <LinhaChart
              dias={dias}
              height={260}
              ariaLabel="Saldo acumulado previsto versus realizado"
              series={[
                { id: "prev", label: "Previsto", values: fluxo.previsto.map((r) => r.acumulado), color: "var(--amber)", dashed: true },
                { id: "real", label: "Realizado", values: fluxo.realizado.map((r) => r.acumulado), color: "var(--sky)" },
              ]}
            />
          </Card>
          {comparativoVis.length ? (
            <DataTable
              headers={[
                "Data",
                "Débito previsto",
                "Crédito previsto",
                "Débito real",
                "Crédito real",
                "Acum. previsto",
                "Acum. real",
                "Diferença",
              ]}
            >
              {comparativoVis.map(({ p, r }) => {
                const diff = Number((r.acumulado - p.acumulado).toFixed(2));
                return (
                  <tr key={p.data}>
                    <Td className="tabular-nums">{formatDate(p.data)}</Td>
                    <Td className="tabular-nums">{p.debito ? brl.format(p.debito) : "—"}</Td>
                    <Td className="tabular-nums">{p.credito ? brl.format(p.credito) : "—"}</Td>
                    <Td className="tabular-nums">{r.debito ? brl.format(r.debito) : "—"}</Td>
                    <Td className="tabular-nums">{r.credito ? brl.format(r.credito) : "—"}</Td>
                    <Td className={valorCls(p.acumulado)}>{brl.format(p.acumulado)}</Td>
                    <Td className={valorCls(r.acumulado)}>{brl.format(r.acumulado)}</Td>
                    <Td className={cn("tabular-nums", diff < 0 ? "text-rose" : diff > 0 ? "text-mint" : "text-faint")}>
                      {diff > 0 ? "+" : ""}
                      {brl.format(diff)}
                    </Td>
                  </tr>
                );
              })}
            </DataTable>
          ) : (
            <Empty title="Sem movimento no período" />
          )}
        </>
      )}
      </TabPanel>

      {diaDetalhe ? (
        <Modal
          open
          size="lg"
          title={`${detalhe!.tipo === "previsto" ? "Previsto" : "Realizado"} · ${formatDate(diaDetalhe.data)}`}
          onClose={() => setDetalhe(null)}
        >
          {diaDetalhe.lancamentos.length ? (
            <div className="space-y-3">
              {(["debito", "credito"] as const).map((tipo) => {
                const itens = diaDetalhe.lancamentos.filter((l) => l.tipo === tipo);
                if (!itens.length) return null;
                return (
                  <div key={tipo}>
                    <p className="kicker mb-1.5">{tipo === "debito" ? "Despesas (débito)" : "Receitas (crédito)"}</p>
                    <ul className="divide-y divide-line rounded-md border border-line">
                      {itens.map((l) => (
                        <li key={l.id} className="flex items-center gap-2 px-3 py-2 text-[13px]">
                          <span className="min-w-0 flex-1">
                            <Link href={l.href} className="hover:text-sky hover:underline">{l.descricao}</Link>
                            <span className="block text-[11px] text-faint">{l.favorecido}</span>
                          </span>
                          {l.fonte === "op" ? <Badge tone="violet">OP a faturar</Badge> : null}
                          <span className="tabular-nums">{brl.format(l.valor)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              <p className="flex justify-between border-t border-line pt-2 text-[13px]">
                <span className="text-mute">Saldo do dia</span>
                <span className={valorCls(diaDetalhe.saldoDia)}>{brl.format(diaDetalhe.saldoDia)}</span>
              </p>
            </div>
          ) : (
            <p className="text-[13px] text-faint">Nenhum lançamento neste dia.</p>
          )}
        </Modal>
      ) : null}
    </div>
  );
}
