"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CATEGORIA_IDS } from "@/lib/dre-defaults";
import { brl, competenciaAtual, todayISO, uid } from "@/lib/format";
import { FORMAS_PAGAMENTO, formaPagamentoLabel, gerarParcelas } from "@/lib/financeiro";
import type { FormaPagamento, OrdemProducao, ParcelaPrevista } from "@/lib/types";
import { useStore } from "@/lib/store/store";
import { Button, DateInput, Field, Input, Modal, Select } from "../ui";
import { ParcelasEditor } from "./parcelas-editor";

export function valorOp(op: OrdemProducao) {
  return Number(((op.quantidadeProduzida || op.quantidade) * (op.precoUnitario || 0)).toFixed(2));
}

/** Modal "Faturar": várias OPs do mesmo pagamento viram lançamentos de receita. */
export function FaturarModal({ opIds, onClose, onDone }: { opIds: string[]; onClose: () => void; onDone: () => void }) {
  const { state, dispatch } = useStore();
  const ops = useMemo(
    () => opIds.map((id) => state.ops.find((o) => o.id === id)).filter((o): o is OrdemProducao => !!o),
    [opIds, state.ops],
  );
  const total = Number(ops.reduce((a, o) => a + valorOp(o), 0).toFixed(2));
  const clientes = [...new Set(ops.map((o) => o.clienteId))];
  const mistura = clientes.length > 1;

  // Pré-preenche com a condição definida na(s) OP(s).
  const unica = ops.length === 1 ? ops[0] : undefined;
  const primeiraPrev = ops
    .flatMap((o) => o.pagamento?.parcelas ?? [])
    .map((p) => p.vencimento)
    .sort()[0];
  const [dataPagamento, setDataPagamento] = useState(primeiraPrev ?? todayISO());
  const [dataFaturamento, setDataFaturamento] = useState(todayISO());
  const [competencia, setCompetencia] = useState(competenciaAtual());
  const [forma, setForma] = useState<FormaPagamento>(
    unica?.pagamento?.formaPagamento ?? ops.find((o) => o.pagamento)?.pagamento?.formaPagamento ?? "boleto",
  );
  const [contaBancariaId, setContaBancariaId] = useState("");
  const [parcelas, setParcelas] = useState<ParcelaPrevista[]>(() => {
    const prev = unica?.pagamento?.parcelas;
    if (prev?.length && Math.abs(prev.reduce((a, p) => a + p.valor, 0) - total) < 0.01) {
      return prev.map((p) => ({ ...p, id: uid("par") }));
    }
    const n = Math.max(1, ...ops.map((o) => o.pagamento?.parcelas?.length ?? 1));
    return gerarParcelas(total, n, primeiraPrev ?? todayISO());
  });

  const empresaId = ops[0]?.empresaId;
  const bancos = state.contasBancarias.filter((c) => c.ativa && c.empresaId === empresaId);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (mistura || !parcelas.length) return;
    dispatch({
      type: "FATURAR_OPS",
      opIds: ops.map((o) => o.id),
      dataFaturamento,
      competencia,
      formaPagamento: forma,
      contaBancariaId: contaBancariaId || undefined,
      parcelas: parcelas.map((p) => ({ valor: p.valor, vencimento: p.vencimento })),
    });
    onDone();
  }

  return (
    <Modal open title={`Faturar ${ops.length} OP${ops.length === 1 ? "" : "s"}`} onClose={onClose} size="lg">
      <form className="space-y-3" onSubmit={submit}>
        <ul className="divide-y divide-line rounded-md border border-line text-[13px]">
          {ops.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-2 px-3 py-1.5">
              <span className="font-mono text-[12px]">{o.numero}</span>
              <span className="min-w-0 flex-1 truncate text-mute">
                {state.clientes.find((c) => c.id === o.clienteId)?.nome}
              </span>
              <span className="tabular-nums">{brl.format(valorOp(o))}</span>
            </li>
          ))}
          <li className="flex justify-between px-3 py-1.5 font-medium">
            <span>Total</span>
            <span className="tabular-nums">{brl.format(total)}</span>
          </li>
        </ul>
        {mistura ? (
          <p className="rounded-md bg-rose/10 px-3 py-2 text-[12px] text-rose">
            As OPs selecionadas são de clientes diferentes. Um mesmo pagamento precisa ser de um único cliente.
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Data do pagamento" hint="1º vencimento — as próximas parcelas seguem mês a mês">
            <DateInput
              value={dataPagamento}
              onChange={(e) => {
                setDataPagamento(e.target.value);
                setParcelas(gerarParcelas(total, parcelas.length || 1, e.target.value));
              }}
            />
          </Field>
          <Field label="Forma de pagamento">
            <Select value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f} value={f}>{formaPagamentoLabel[f]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Data de faturamento">
            <DateInput value={dataFaturamento} onChange={(e) => setDataFaturamento(e.target.value)} />
          </Field>
          <Field label="Competência">
            <Input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Conta bancária de recebimento">
              <Select value={contaBancariaId} onChange={(e) => setContaBancariaId(e.target.value)}>
                <option value="">— não informada —</option>
                {bancos.map((b) => (
                  <option key={b.id} value={b.id}>{b.nome}</option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
        <div>
          <p className="kicker mb-2">Parcelas</p>
          <ParcelasEditor total={total} primeiroVencimento={dataPagamento} value={parcelas} onChange={setParcelas} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={mistura || !ops.length}>
            Confirmar faturamento
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Lançamento manual de receita (fora de OP). */
export function ReceitaModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore();
  const padraoRec =
    state.categoriasFinanceiras.find((c) => c.padraoReceber && c.ativa)?.id ??
    state.categoriasFinanceiras.find((c) => c.padraoVendas && c.ativa)?.id ??
    CATEGORIA_IDS.receitaVendas;
  const [empresaId, setEmpresaId] = useState(state.empresas.find((e) => e.ativa)?.id ?? "");
  const [clienteId, setClienteId] = useState(state.clientes.find((c) => c.ativo)?.id ?? "");
  const [categoriaId, setCategoriaId] = useState(padraoRec);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState(todayISO());
  const [competencia, setCompetencia] = useState(competenciaAtual());
  const [forma, setForma] = useState<FormaPagamento>("pix");
  const [contaBancariaId, setContaBancariaId] = useState("");
  const [recebida, setRecebida] = useState(false);
  const [dataRecebimento, setDataRecebimento] = useState(todayISO());

  const categorias = state.categoriasFinanceiras.filter((c) => c.ativa && c.tipo === "receita");
  const bancos = state.contasBancarias.filter((c) => c.ativa && c.empresaId === empresaId);

  return (
    <Modal open title="Nova receita" onClose={onClose} size="lg">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const v = Number(Number(valor).toFixed(2)) || 0;
          if (v <= 0 || !descricao.trim()) return;
          const cat = state.categoriasFinanceiras.find((c) => c.id === categoriaId);
          dispatch({
            type: "SAVE_CONTA_RECEBER",
            conta: {
              id: uid("cr"),
              empresaId,
              clienteId,
              descricao: descricao.trim(),
              origem: "manual",
              categoriaId,
              contaPlanoId: cat?.contaPlanoId,
              formaPagamento: forma,
              contaBancariaId: contaBancariaId || undefined,
              valor: v,
              vencimento,
              competencia,
              recebimentos: recebida ? [{ id: uid("rc"), valor: v, data: dataRecebimento, estornado: false }] : [],
            },
          });
          onClose();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Empresa">
            <Select value={empresaId} onChange={(e) => { setEmpresaId(e.target.value); setContaBancariaId(""); }}>
              {state.empresas.filter((e) => e.ativa).map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </Select>
          </Field>
          <Field label="Cliente">
            <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              {state.clientes.filter((c) => c.ativo).map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </Select>
          </Field>
          <Field label="Categoria">
            <Select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </Select>
          </Field>
          <Field label="Descrição">
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
          </Field>
          <Field label="Valor">
            <Input type="number" step="0.01" min={0} value={valor} onChange={(e) => setValor(e.target.value)} required />
          </Field>
          <Field label="Forma de pagamento">
            <Select value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f} value={f}>{formaPagamentoLabel[f]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Vencimento">
            <DateInput value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
          </Field>
          <Field label="Competência">
            <Input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} />
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
        <div className="rounded-md border border-line p-3">
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={recebida} onChange={(e) => setRecebida(e.target.checked)} />
            Já recebida
          </label>
          {recebida ? (
            <div className="mt-2 max-w-xs">
              <Field label="Data do recebimento">
                <DateInput value={dataRecebimento} onChange={(e) => setDataRecebimento(e.target.value)} />
              </Field>
            </div>
          ) : null}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Lançar receita</Button>
        </div>
      </form>
    </Modal>
  );
}
