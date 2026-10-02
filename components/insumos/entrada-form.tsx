"use client";

import { useState, type FormEvent } from "react";
import { readAsDataUrl } from "@/lib/files";
import { todayISO, uid } from "@/lib/format";
import { useStore } from "@/lib/store/store";
import { Button, CreatableSelect, DateInput, Field, FileInput, Input, Modal, Select } from "../ui";

export function EntradaInsumoModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open={open} title="Lançar entrada" onClose={onClose}>
      {open ? <EntradaInsumoFields onClose={onClose} /> : null}
    </Modal>
  );
}

function EntradaInsumoFields({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [insumoId, setInsumoId] = useState(state.insumos[0]?.id ?? "");
  const insumo = state.insumos.find((i) => i.id === insumoId);
  const [qtd, setQtd] = useState("");
  const [preco, setPreco] = useState("");
  const [nf, setNf] = useState("");
  const [anexoNf, setAnexoNf] = useState("");
  const [data, setData] = useState(todayISO());
  const [fornecedorId, setFornecedor] = useState(insumo?.fornecedorId ?? state.fornecedores[0]?.id ?? "");
  const [refFornecedor, setRef] = useState(insumo?.refFornecedor ?? "");
  const [cor, setCor] = useState(insumo?.cor ?? "");

  function escolherInsumo(id: string) {
    const atual = state.insumos.find((i) => i.id === id);
    setInsumoId(id);
    setFornecedor(atual?.fornecedorId ?? state.fornecedores[0]?.id ?? "");
    setRef(atual?.refFornecedor ?? "");
    setCor(atual?.cor ?? "");
  }

  function save(e: FormEvent) {
    e.preventDefault();
    if (!insumoId) return;
    const quantidade = Number(qtd) || 0;
    if (quantidade <= 0) return;
    dispatch({
      type: "ENTRADA_LOTE",
      payload: {
        insumoId,
        quantidade,
        preco: Number(preco) || 0,
        nf,
        anexoNf,
        dataEntrada: data,
        fornecedorId,
        refFornecedor,
        cor,
      },
    });
    onClose();
  }

  return (
    <form className="grid gap-3" onSubmit={save}>
      <Field label="Insumo">
        <Select value={insumoId} onChange={(e) => escolherInsumo(e.target.value)}>
          {state.insumos.map((i) => (
            <option key={i.id} value={i.id}>{i.codigo} · {i.descricao}</option>
          ))}
        </Select>
      </Field>
      <Field label="Fornecedor" hint="Atualiza o cadastro deste insumo">
        <CreatableSelect
          value={fornecedorId}
          options={state.fornecedores.map((f) => ({ value: f.id, label: f.razaoSocial }))}
          addLabel="+ Novo fornecedor"
          addPlaceholder="Razão social"
          onChange={setFornecedor}
          onAdd={(nova) => {
            const nome = nova.trim();
            const existente = state.fornecedores.find((f) => f.razaoSocial.toLowerCase() === nome.toLowerCase());
            if (existente) {
              setFornecedor(existente.id);
              return;
            }
            const id = uid("for");
            dispatch({
              type: "SAVE_FORNECEDOR",
              fornecedor: { id, razaoSocial: nome, contato: "", ativo: true },
            });
            setFornecedor(id);
          }}
        />
      </Field>
      <Field label="Referência do fornecedor" hint="Opcional. Atualiza o cadastro">
        <Input value={refFornecedor} onChange={(e) => setRef(e.target.value)} />
      </Field>
      <Field label="Cor" hint="Opcional. Atualiza o cadastro se o lote vier diferente">
        <Input value={cor} onChange={(e) => setCor(e.target.value)} placeholder="Preto" />
      </Field>
      <Field label="Número da NF" hint="Opcional">
        <Input value={nf} onChange={(e) => setNf(e.target.value)} />
      </Field>
      <Field label="Anexo da NF" hint="Opcional">
        <FileInput
          accept="image/*,application/pdf"
          emptyLabel="Nenhum arquivo selecionado"
          actionLabel="Escolher"
          onFiles={async (files) => {
            const file = files?.[0];
            setAnexoNf(file ? await readAsDataUrl(file) : "");
          }}
        />
      </Field>
      <Field label="Quantidade" hint={insumo ? `Na unidade de compra (${insumo.unidadeCompra})` : undefined}>
        <Input type="number" step="0.01" min={0} value={qtd} onChange={(e) => setQtd(e.target.value)} required />
      </Field>
      <Field label="Preço unitário">
        <Input type="number" step="0.01" min={0} value={preco} onChange={(e) => setPreco(e.target.value)} required />
      </Field>
      <Field label="Data da compra">
        <DateInput value={data} onChange={(e) => setData(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit">Confirmar compra</Button>
      </div>
    </form>
  );
}
