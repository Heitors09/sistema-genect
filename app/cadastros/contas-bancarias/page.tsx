"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Badge, Button, DataTable, Empty, Field, Input, Modal, PageHeader, Select, Td } from "@/components/ui";
import { brl, saldoConta, uid } from "@/lib/format";
import { tipoContaBancariaLabel } from "@/lib/financeiro";
import type { ContaBancaria, TipoContaBancaria } from "@/lib/types";
import { useStore } from "@/lib/store/store";

export default function ContasBancariasPage() {
  const { state, dispatch, isAdmin } = useStore();
  const [edit, setEdit] = useState<ContaBancaria | null>(null);

  if (!isAdmin) return <p className="p-6 text-sm text-mute">Acesso restrito.</p>;

  function nova(): ContaBancaria {
    return {
      id: "",
      empresaId: state.empresas.find((e) => e.ativa)?.id ?? "",
      nome: "",
      banco: "",
      tipo: "corrente",
      saldoInicial: 0,
      ativa: true,
    };
  }

  /** Saldo atual = inicial + recebimentos − pagamentos vinculados à conta. */
  function saldoAtual(c: ContaBancaria) {
    const entradas = state.contasReceber
      .filter((r) => r.contaBancariaId === c.id)
      .reduce((a, r) => a + (r.valor - saldoConta(r.valor, r.recebimentos)), 0);
    const saidas = state.contasPagar
      .filter((p) => p.contaBancariaId === c.id)
      .reduce((a, p) => a + (p.valor - saldoConta(p.valor, p.pagamentos)), 0);
    return c.saldoInicial + entradas - saidas;
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <Link href="/cadastros" className="mb-2 inline-flex items-center gap-1 text-[12px] text-mute hover:text-ink">
          <ChevronLeft size={14} /> Cadastros
        </Link>
        <PageHeader
          kicker="Cadastros"
          title="Contas bancárias"
          description="Bancos e contas para vincular aos lançamentos de despesas e receitas."
          actions={<Button onClick={() => setEdit(nova())}>Nova conta</Button>}
        />
      </div>

      {state.contasBancarias.length ? (
        <DataTable headers={["Conta", "Banco", "Agência / conta", "Tipo", "Empresa", "Saldo inicial", "Saldo atual", "Status"]}>
          {state.contasBancarias.map((c) => (
            <tr key={c.id}>
              <Td>
                <button type="button" className="text-sky hover:underline" onClick={() => setEdit(c)}>
                  {c.nome}
                </button>
              </Td>
              <Td>{c.banco || "—"}</Td>
              <Td className="font-mono text-[12px] text-mute">
                {[c.agencia, c.conta].filter(Boolean).join(" / ") || "—"}
              </Td>
              <Td className="text-mute">{tipoContaBancariaLabel[c.tipo]}</Td>
              <Td className="text-mute">{state.empresas.find((e) => e.id === c.empresaId)?.nome ?? "—"}</Td>
              <Td className="tabular-nums">{brl.format(c.saldoInicial)}</Td>
              <Td className="tabular-nums">{brl.format(saldoAtual(c))}</Td>
              <Td>
                <div className="flex items-center justify-end gap-2">
                  <Badge tone={c.ativa ? "mint" : "mute"}>{c.ativa ? "Ativa" : "Inativa"}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dispatch({ type: "SAVE_CONTA_BANCARIA", conta: { ...c, ativa: !c.ativa } })}
                  >
                    {c.ativa ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <Empty title="Nenhuma conta cadastrada" hint="Cadastre bancos, caixa e cartões." />
      )}

      {edit ? (
        <ContaModal
          inicial={edit}
          onClose={() => setEdit(null)}
          onSave={(conta) => {
            dispatch({ type: "SAVE_CONTA_BANCARIA", conta: { ...conta, id: conta.id || uid("cb") } });
            setEdit(null);
          }}
        />
      ) : null}
    </div>
  );
}

function ContaModal({
  inicial,
  onClose,
  onSave,
}: {
  inicial: ContaBancaria;
  onClose: () => void;
  onSave: (c: ContaBancaria) => void;
}) {
  const { state } = useStore();
  const [c, setC] = useState(inicial);
  return (
    <Modal open title={inicial.id ? "Editar conta" : "Nova conta bancária"} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!c.nome.trim()) return;
          onSave({ ...c, nome: c.nome.trim() });
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome da conta">
            <Input value={c.nome} onChange={(e) => setC({ ...c, nome: e.target.value })} placeholder="Itaú PJ" required />
          </Field>
          <Field label="Banco">
            <Input value={c.banco} onChange={(e) => setC({ ...c, banco: e.target.value })} />
          </Field>
          <Field label="Agência">
            <Input value={c.agencia ?? ""} onChange={(e) => setC({ ...c, agencia: e.target.value })} />
          </Field>
          <Field label="Conta">
            <Input value={c.conta ?? ""} onChange={(e) => setC({ ...c, conta: e.target.value })} />
          </Field>
          <Field label="Tipo">
            <Select value={c.tipo} onChange={(e) => setC({ ...c, tipo: e.target.value as TipoContaBancaria })}>
              {(Object.keys(tipoContaBancariaLabel) as TipoContaBancaria[]).map((t) => (
                <option key={t} value={t}>{tipoContaBancariaLabel[t]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Empresa">
            <Select value={c.empresaId} onChange={(e) => setC({ ...c, empresaId: e.target.value })}>
              {state.empresas.filter((e) => e.ativa).map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </Select>
          </Field>
          <Field label="Saldo inicial" hint="Ponto de partida do fluxo de caixa">
            <Input
              type="number"
              step="0.01"
              value={String(c.saldoInicial)}
              onChange={(e) => setC({ ...c, saldoInicial: Number(e.target.value) || 0 })}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}
