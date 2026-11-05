"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, RefreshCw } from "lucide-react";
import { BaixaModal } from "@/components/financeiro/baixa-modal";
import { DespesaModal } from "@/components/financeiro/despesa-modal";
import { FaltaModal } from "@/components/rh/falta-modal";
import { Badge, Button, DataTable, Empty, Input, PageHeader, Select, Stat, Td } from "@/components/ui";
import { brl, competenciaAtual, formatDate, saldoConta, statusConta } from "@/lib/format";
import { funcionarioAtivoEm, resumoFolha, tipoFolhaLabel } from "@/lib/financeiro";
import { useStore } from "@/lib/store/store";

export default function FolhaPage() {
  const { state, dispatch, isAdmin } = useStore();
  const [comp, setComp] = useState(competenciaAtual());
  const [empresaId, setEmpresaId] = useState("todas");
  const [despesaPara, setDespesaPara] = useState<string | null>(null);
  const [faltaPara, setFaltaPara] = useState<string | null>(null);
  const [payId, setPayId] = useState<string | null>(null);

  const resumos = useMemo(
    () =>
      state.funcionarios
        .filter((f) => (empresaId === "todas" || f.empresaId === empresaId) && funcionarioAtivoEm(f, comp))
        .map((f) => resumoFolha(state, f, comp))
        .sort((a, b) => a.funcionario.nome.localeCompare(b.funcionario.nome, "pt-BR")),
    [state, comp, empresaId],
  );
  const faltaGerar = resumos.some((r) => !r.salario);

  const lancamentos = useMemo(
    () =>
      state.contasPagar
        .filter(
          (c) =>
            c.origem === "folha" &&
            c.competencia === comp &&
            (empresaId === "todas" || c.empresaId === empresaId),
        )
        .sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
    [state.contasPagar, comp, empresaId],
  );

  const totais = useMemo(() => {
    const bruto = resumos.reduce((a, r) => a + r.bruto, 0);
    const faltas = resumos.reduce((a, r) => a + r.descontoFaltas, 0);
    const adiant = resumos.reduce((a, r) => a + r.totalAdiantamentos, 0);
    const liquido = resumos.reduce((a, r) => a + r.liquido, 0);
    const aberto = lancamentos.reduce((a, c) => a + saldoConta(c.valor, c.pagamentos), 0);
    return { bruto, faltas, adiant, liquido, aberto };
  }, [resumos, lancamentos]);

  if (!isAdmin) return <p className="p-6 text-sm text-mute">Acesso restrito.</p>;

  return (
    <div className="space-y-4 p-4">
      <div>
        <Link href="/financeiro/despesas" className="mb-2 inline-flex items-center gap-1 text-[12px] text-mute hover:text-ink">
          <ChevronLeft size={14} /> Despesas
        </Link>
        <PageHeader
          kicker="Despesas · Recursos Humanos"
          title="Folha de pagamento"
          description="Salário gerado automaticamente todo mês. Faltas não justificadas e adiantamentos abatem do líquido."
          actions={
            <>
              <Button variant="ghost" onClick={() => setFaltaPara("")}>Registrar falta</Button>
              <Button onClick={() => setDespesaPara("")}>Despesa com funcionário</Button>
            </>
          }
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Input type="month" value={comp} onChange={(e) => setComp(e.target.value || competenciaAtual())} className="w-full sm:w-44" aria-label="Competência" />
        <Select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} className="w-full sm:w-52">
          <option value="todas">Todas as empresas</option>
          {state.empresas.map((e) => (
            <option key={e.id} value={e.id}>{e.nome}</option>
          ))}
        </Select>
        {faltaGerar ? (
          <Button variant="soft" onClick={() => dispatch({ type: "GERAR_SALARIOS", competencias: [comp] })}>
            <RefreshCw size={13} /> Gerar salários de {comp}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Salários brutos" value={brl.format(totais.bruto)} hint={`${resumos.length} funcionário(s)`} />
        <Stat label="Desconto de faltas" value={brl.format(totais.faltas)} tone="rose" />
        <Stat label="Adiantamentos / vales" value={brl.format(totais.adiant)} tone="amber" />
        <Stat label="Líquido a pagar" value={brl.format(totais.liquido)} hint={`Em aberto ${brl.format(totais.aberto)}`} />
      </div>

      {resumos.length ? (
        <DataTable headers={["Funcionário", "Cargo", "Salário (mês)", "Faltas", "Adiantamentos", "Outros", "Líquido", "Salário"]}>
          {resumos.map((r) => {
            const f = r.funcionario;
            const st = r.salario ? statusConta(r.salario.valor, r.salario.pagamentos) : null;
            const outros = r.outros.reduce((a, c) => a + c.valor, 0);
            return (
              <tr key={f.id}>
                <Td>
                  <span className="font-medium">{f.nome}</span>
                  {f.dataDemissao ? <p className="text-[10px] text-faint">demissão {formatDate(f.dataDemissao)}</p> : null}
                </Td>
                <Td className="text-mute">{f.cargo}</Td>
                <Td className="tabular-nums">
                  {brl.format(r.bruto)}
                  {r.diasTrabalhaveis < r.diasNoMes ? (
                    <p className="text-[10px] text-faint">{r.diasTrabalhaveis}/{r.diasNoMes} dias</p>
                  ) : null}
                </Td>
                <Td className="tabular-nums">
                  <button type="button" className="hover:text-sky" onClick={() => setFaltaPara(f.id)}>
                    {r.faltas.length}
                    {r.descontoFaltas ? <span className="text-rose"> · −{brl.format(r.descontoFaltas)}</span> : null}
                  </button>
                </Td>
                <Td className="tabular-nums">{r.totalAdiantamentos ? `−${brl.format(r.totalAdiantamentos)}` : "—"}</Td>
                <Td className="tabular-nums">{outros ? brl.format(outros) : "—"}</Td>
                <Td className="tabular-nums font-medium">{brl.format(r.liquido)}</Td>
                <Td>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {st ? (
                      <Badge tone={st === "quitado" ? "mint" : st === "parcial" ? "amber" : "rose"}>
                        {st === "quitado" ? "Pago" : st === "parcial" ? "Parcial" : `Vence ${formatDate(r.salario!.vencimento)}`}
                      </Badge>
                    ) : (
                      <Badge>Não gerado</Badge>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setDespesaPara(f.id)}>
                      Adiantamento
                    </Button>
                    {r.salario && r.saldo > 0 ? (
                      <Button size="sm" variant="soft" onClick={() => setPayId(r.salario!.id)}>
                        Pagar
                      </Button>
                    ) : null}
                  </div>
                </Td>
              </tr>
            );
          })}
        </DataTable>
      ) : (
        <Empty
          title="Nenhum funcionário ativo nesta competência"
          hint="Cadastre funcionários em Cadastros → Funcionário."
        />
      )}

      <div>
        <p className="kicker mb-2">Lançamentos da folha · {comp}</p>
        {lancamentos.length ? (
          <DataTable headers={["Funcionário", "Tipo", "Descrição", "Vencimento", "Valor", "Status"]}>
            {lancamentos.map((c) => {
              const st = statusConta(c.valor, c.pagamentos);
              const saldo = saldoConta(c.valor, c.pagamentos);
              return (
                <tr key={c.id}>
                  <Td>{state.funcionarios.find((f) => f.id === c.funcionarioId)?.nome ?? "—"}</Td>
                  <Td className="text-mute">{c.tipoFolha ? tipoFolhaLabel[c.tipoFolha] : "Folha"}</Td>
                  <Td>{c.descricao}</Td>
                  <Td className="tabular-nums">{formatDate(c.vencimento)}</Td>
                  <Td className="tabular-nums">{brl.format(c.valor)}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-2">
                      <Badge tone={st === "quitado" ? "mint" : st === "parcial" ? "amber" : "rose"}>
                        {st === "quitado" ? "Pago" : st === "parcial" ? "Parcial" : "Em aberto"}
                      </Badge>
                      {saldo > 0 ? (
                        <Button size="sm" variant="ghost" onClick={() => setPayId(c.id)}>Pagar</Button>
                      ) : null}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </DataTable>
        ) : (
          <p className="text-[13px] text-faint">Nenhum lançamento de folha nesta competência.</p>
        )}
      </div>

      <DespesaModal
        open={despesaPara !== null}
        onClose={() => setDespesaPara(null)}
        funcionarioInicial={despesaPara || undefined}
        somenteFuncionario
      />
      {faltaPara !== null ? (
        <FaltaModal funcionarioId={faltaPara || undefined} onClose={() => setFaltaPara(null)} />
      ) : null}
      <BaixaModal tipo="pagar" contaId={payId} onClose={() => setPayId(null)} />
    </div>
  );
}
