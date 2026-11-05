"use client";

import { useState } from "react";
import { brl, saldoConta, todayISO } from "@/lib/format";
import { useStore } from "@/lib/store/store";
import { Button, DateInput, Field, Input, Modal, Select } from "../ui";

/** Registrar pagamento (despesa) ou recebimento (receita), com data e conta bancária. */
export function BaixaModal({
  tipo,
  contaId,
  onClose,
}: {
  tipo: "pagar" | "receber";
  contaId: string | null;
  onClose: () => void;
}) {
  if (!contaId) return null;
  return <BaixaBody tipo={tipo} contaId={contaId} onClose={onClose} />;
}

function BaixaBody({ tipo, contaId, onClose }: { tipo: "pagar" | "receber"; contaId: string; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const conta =
    tipo === "pagar"
      ? state.contasPagar.find((c) => c.id === contaId)
      : state.contasReceber.find((c) => c.id === contaId);
  const movs = conta ? ("pagamentos" in conta ? conta.pagamentos : conta.recebimentos) : [];
  const saldo = conta ? saldoConta(conta.valor, movs) : 0;
  const [valor, setValor] = useState(String(saldo));
  const [data, setData] = useState(todayISO());
  const [contaBancariaId, setContaBancariaId] = useState(conta?.contaBancariaId ?? "");
  if (!conta) return null;
  const bancos = state.contasBancarias.filter((c) => c.ativa && c.empresaId === conta.empresaId);

  return (
    <Modal open title={tipo === "pagar" ? "Registrar pagamento" : "Registrar recebimento"} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const v = Math.min(saldo, Number(valor) || 0);
          if (v <= 0) return;
          if (contaBancariaId !== (conta.contaBancariaId ?? "")) {
            if ("pagamentos" in conta) {
              dispatch({ type: "SAVE_CONTA_PAGAR", conta: { ...conta, contaBancariaId: contaBancariaId || undefined } });
            } else {
              dispatch({ type: "SAVE_CONTA_RECEBER", conta: { ...conta, contaBancariaId: contaBancariaId || undefined } });
            }
          }
          if (tipo === "pagar") dispatch({ type: "PAGAR", contaId, valor: v, data });
          else dispatch({ type: "RECEBER", contaId, valor: v, data });
          onClose();
        }}
      >
        <p className="text-[13px] text-mute">
          {conta.descricao} · saldo <span className="tabular-nums text-ink">{brl.format(saldo)}</span>
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Valor">
            <Input type="number" step="0.01" min={0} max={saldo} value={valor} onChange={(e) => setValor(e.target.value)} />
          </Field>
          <Field label={tipo === "pagar" ? "Data do pagamento" : "Data do recebimento"}>
            <DateInput value={data} onChange={(e) => setData(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Conta bancária">
              <Select value={contaBancariaId} onChange={(e) => setContaBancariaId(e.target.value)}>
                <option value="">— não informada —</option>
                {bancos.map((b) => (
                  <option key={b.id} value={b.id}>{b.nome}</option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Confirmar</Button>
        </div>
      </form>
    </Modal>
  );
}
