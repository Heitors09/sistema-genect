"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { DespesaModal } from "@/components/financeiro/despesa-modal";
import { FaltaModal } from "@/components/rh/falta-modal";
import {
  Badge,
  Button,
  ButtonLink,
  DataTable,
  Empty,
  PageHeader,
  Stat,
  TabPanel,
  Tabs,
  Td,
} from "@/components/ui";
import { brl, competenciaAtual, formatDate, todayISO } from "@/lib/format";
import { funcionarioDemitido, resumoFolha, tipoFolhaLabel } from "@/lib/financeiro";
import type { Funcionario } from "@/lib/types";
import { useStore } from "@/lib/store/store";

type Aba = "ativos" | "demitidos" | "faltas" | "adiantamentos";

function tempoDeCasa(f: Funcionario, hoje: string) {
  const fim = f.dataDemissao && f.dataDemissao < hoje ? f.dataDemissao : hoje;
  const [y1, m1] = f.dataAdmissao.split("-").map(Number);
  const [y2, m2] = fim.split("-").map(Number);
  const meses = (y2 - y1) * 12 + (m2 - m1);
  if (meses < 1) return "menos de 1 mês";
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  return [anos ? `${anos} ano${anos > 1 ? "s" : ""}` : "", resto ? `${resto} ${resto > 1 ? "meses" : "mês"}` : ""]
    .filter(Boolean)
    .join(" e ");
}

export default function RhPage() {
  const { state, isAdmin } = useStore();
  const [aba, setAba] = useState<Aba>("ativos");
  const [faltaPara, setFaltaPara] = useState<string | null>(null);
  const [adiantPara, setAdiantPara] = useState<string | null>(null);
  const hoje = todayISO();
  const comp = competenciaAtual();

  const ativos = useMemo(() => state.funcionarios.filter((f) => !funcionarioDemitido(f, hoje)), [state.funcionarios, hoje]);
  const demitidos = useMemo(() => state.funcionarios.filter((f) => funcionarioDemitido(f, hoje)), [state.funcionarios, hoje]);
  const folhaMes = useMemo(() => ativos.map((f) => resumoFolha(state, f, comp)), [state, ativos, comp]);
  const nome = (id: string) => state.funcionarios.find((f) => f.id === id)?.nome ?? "—";
  const faltas = [...state.faltas].sort((a, b) => b.data.localeCompare(a.data));
  const adiantamentos = state.contasPagar
    .filter((c) => c.origem === "folha" && c.tipoFolha && c.tipoFolha !== "salario")
    .sort((a, b) => b.vencimento.localeCompare(a.vencimento));

  if (!isAdmin) return <p className="p-6 text-sm text-mute">Acesso restrito.</p>;

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Recursos Humanos"
        title="Funcionários"
        description="Tudo sobre a equipe num lugar: cadastro, faltas, adiantamentos e folha. Demitidos ficam no histórico."
        actions={
          <>
            <ButtonLink href="/financeiro/folha" variant="ghost">Folha de pagamento</ButtonLink>
            <ButtonLink href="/cadastros?tipo=funcionario">
              <UserPlus size={14} /> Cadastrar funcionário
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Ativos" value={String(ativos.length)} />
        <Stat label="Folha bruta do mês" value={brl.format(folhaMes.reduce((a, r) => a + r.bruto, 0))} hint={comp} />
        <Stat label="Faltas no mês" value={String(state.faltas.filter((f) => f.competencia === comp).length)} tone="rose" />
        <Stat
          label="Adiantamentos no mês"
          value={brl.format(folhaMes.reduce((a, r) => a + r.totalAdiantamentos, 0))}
          tone="amber"
        />
      </div>

      <Tabs
        value={aba}
        onChange={setAba}
        items={[
          { id: "ativos", label: "Ativos", count: ativos.length },
          { id: "demitidos", label: "Demitidos", count: demitidos.length },
          { id: "faltas", label: "Faltas", count: state.faltas.length },
          { id: "adiantamentos", label: "Adiantamentos e outros", count: adiantamentos.length },
        ]}
      />

      <TabPanel value={aba} className="space-y-2">
      {aba === "ativos" || aba === "demitidos" ? (
        (aba === "ativos" ? ativos : demitidos).length ? (
          <DataTable headers={["Nome", "Cargo", "Salário", "Admissão", aba === "ativos" ? "Tempo de casa" : "Demissão", "Mês atual", ""]}>
            {(aba === "ativos" ? ativos : demitidos).map((f) => {
              const r = folhaMes.find((x) => x.funcionario.id === f.id);
              return (
                <tr key={f.id}>
                  <Td>
                    <span className="font-medium">{f.nome}</span>
                    <p className="text-[10px] text-faint">{state.empresas.find((e) => e.id === f.empresaId)?.nome}</p>
                  </Td>
                  <Td className="text-mute">{f.cargo}</Td>
                  <Td className="tabular-nums">{brl.format(f.salarioMensal)}</Td>
                  <Td className="tabular-nums">{formatDate(f.dataAdmissao)}</Td>
                  <Td className="tabular-nums">
                    {aba === "ativos" ? tempoDeCasa(f, hoje) : formatDate(f.dataDemissao ?? "")}
                  </Td>
                  <Td className="tabular-nums">
                    {r ? (
                      <>
                        {brl.format(r.liquido)} líquido
                        {r.faltas.length ? <p className="text-[10px] text-rose">{r.faltas.length} falta(s)</p> : null}
                      </>
                    ) : (
                      <span className="text-faint">{tempoDeCasa(f, hoje)} de casa</span>
                    )}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {aba === "ativos" ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => setFaltaPara(f.id)}>Falta</Button>
                          <Button size="sm" variant="ghost" onClick={() => setAdiantPara(f.id)}>Adiantamento</Button>
                        </>
                      ) : null}
                      <Link
                        href={`/cadastros?tipo=funcionario&editar=${f.id}`}
                        className="inline-flex h-7 items-center rounded-md px-2.5 text-[11px] text-sky hover:bg-elevated"
                      >
                        Editar
                      </Link>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </DataTable>
        ) : (
          <Empty title={aba === "ativos" ? "Nenhum funcionário ativo" : "Nenhum funcionário demitido"} />
        )
      ) : null}

      {aba === "faltas" ? (
        <div className="space-y-2">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setFaltaPara("")}>Registrar falta</Button>
          </div>
          {faltas.length ? (
            <DataTable headers={["Data", "Funcionário", "Competência", "Situação", "Impacto", "Motivo"]}>
              {faltas.map((x) => {
                const f = state.funcionarios.find((y) => y.id === x.funcionarioId);
                return (
                  <tr key={x.id}>
                    <Td className="tabular-nums">{formatDate(x.data)}</Td>
                    <Td>{nome(x.funcionarioId)}</Td>
                    <Td className="tabular-nums">{x.competencia}</Td>
                    <Td>
                      <Badge tone={x.justificada ? "mute" : "rose"}>{x.justificada ? "Justificada" : "Não justificada"}</Badge>
                    </Td>
                    <Td className="tabular-nums">{x.justificada || !f ? "—" : `−${brl.format(f.salarioMensal / 30)}`}</Td>
                    <Td className="text-mute">{x.motivo ?? "—"}</Td>
                  </tr>
                );
              })}
            </DataTable>
          ) : (
            <Empty title="Nenhuma falta registrada" />
          )}
        </div>
      ) : null}

      {aba === "adiantamentos" ? (
        <div className="space-y-2">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setAdiantPara("")}>Novo adiantamento</Button>
          </div>
          {adiantamentos.length ? (
            <DataTable headers={["Vencimento", "Funcionário", "Tipo", "Competência", "Valor"]}>
              {adiantamentos.map((c) => (
                <tr key={c.id}>
                  <Td className="tabular-nums">{formatDate(c.vencimento)}</Td>
                  <Td>{nome(c.funcionarioId ?? "")}</Td>
                  <Td className="text-mute">{c.tipoFolha ? tipoFolhaLabel[c.tipoFolha] : "—"}</Td>
                  <Td className="tabular-nums">{c.competencia}</Td>
                  <Td className="tabular-nums">{brl.format(c.valor)}</Td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <Empty title="Nenhum adiantamento lançado" hint="Adiantamentos são lançados como despesa com funcionário." />
          )}
        </div>
      ) : null}
      </TabPanel>

      {faltaPara !== null ? <FaltaModal funcionarioId={faltaPara || undefined} onClose={() => setFaltaPara(null)} /> : null}
      <DespesaModal
        open={adiantPara !== null}
        onClose={() => setAdiantPara(null)}
        funcionarioInicial={adiantPara || undefined}
        somenteFuncionario
      />
    </div>
  );
}
