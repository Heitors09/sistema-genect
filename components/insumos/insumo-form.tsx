"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { labelCategoria, shortCode, uid } from "@/lib/format";
import type { Insumo, Unidade } from "@/lib/types";
import { useStore } from "@/lib/store/store";
import { Button, CreatableSelect, Field, Input, Select } from "../ui";

const uns: Unidade[] = ["kg", "m", "un", "cx", "milheiro", "cone", "g"];

export function InsumoForm({ initial }: { initial?: Insumo }) {
  const router = useRouter();
  const { state, dispatch, isAdmin } = useStore();
  const [codigo, setCodigo] = useState(initial?.codigo ?? "");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [categoria, setCategoria] = useState(initial?.categoria ?? "tecido");
  const [unidadeCompra, setUc] = useState<Unidade>(initial?.unidadeCompra ?? "kg");
  const [unidadeConsumo, setUcons] = useState<Unidade>(initial?.unidadeConsumo ?? "m");
  const [fator, setFator] = useState(String(initial?.fatorConversao ?? 1));
  const [minimo, setMinimo] = useState(String(initial?.estoqueMinimo ?? 0));
  const [cor, setCor] = useState(initial?.cor ?? "");
  const [fornecedorId, setFornecedor] = useState(initial?.fornecedorId ?? state.fornecedores[0]?.id ?? "");
  const [refFornecedor, setRef] = useState(initial?.refFornecedor ?? "");

  function save(e: FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    const insumo: Insumo = {
      id: initial?.id ?? uid("ins"),
      codigo: codigo.trim() || shortCode(),
      descricao,
      categoria,
      unidadeCompra,
      unidadeConsumo,
      fatorConversao: Number(fator) || 1,
      estoqueMinimo: Number(minimo) || 0,
      estoqueAtual: initial?.estoqueAtual ?? 0,
      reservado: initial?.reservado ?? 0,
      fornecedorId,
      refFornecedor,
      cor,
    };
    dispatch({ type: "SAVE_INSUMO", insumo });
    if (initial) return;
    router.push(`/insumos/${insumo.id}`);
  }

  return (
    <form onSubmit={save} className="grid gap-3 surface rounded-md p-4 sm:grid-cols-2">
      <Field label="Código" hint="Vazio gera 6 caracteres no estilo UUID (ex.: A3F91C)">
        <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Gerado automaticamente" />
      </Field>
      <Field label="Categoria">
        <CreatableSelect
          value={categoria}
          options={state.categoriasInsumo.map((c) => ({ value: c, label: labelCategoria(c) }))}
          addLabel="+ Nova categoria"
          addPlaceholder="Ex.: elástico"
          onChange={setCategoria}
          onAdd={(nova) => {
            const nome = nova.trim();
            const existente = state.categoriasInsumo.find((c) => c.toLowerCase() === nome.toLowerCase());
            if (existente) {
              setCategoria(existente);
              return;
            }
            dispatch({ type: "ADD_CATEGORIA_INSUMO", categoria: nome });
            setCategoria(nome);
          }}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Descrição detalhada">
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </Field>
      </div>
      <Field label="Cor do insumo" hint="Preenchida automaticamente na ficha do produto">
        <Input value={cor} onChange={(e) => setCor(e.target.value)} placeholder="Preto" />
      </Field>
      <Field label="Unidade de compra" hint="Listagem e compras">
        <Select value={unidadeCompra} onChange={(e) => setUc(e.target.value as Unidade)}>
          {uns.map((u) => <option key={u} value={u}>{u}</option>)}
        </Select>
      </Field>
      <Field label="Unidade de consumo" hint="Só na ficha do produto e na baixa da OP">
        <Select value={unidadeConsumo} onChange={(e) => setUcons(e.target.value as Unidade)}>
          {uns.map((u) => <option key={u} value={u}>{u}</option>)}
        </Select>
      </Field>
      <Field label="Fator de conversão" hint="Unidades de consumo em 1 unidade de compra (ex.: 2,4 m por kg)">
        <Input type="number" step="0.01" value={fator} onChange={(e) => setFator(e.target.value)} />
      </Field>
      <Field label="Estoque mínimo">
        <Input type="number" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
      </Field>
      <Field label="Fornecedor">
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
      <Field label="Referência do fornecedor">
        <Input value={refFornecedor} onChange={(e) => setRef(e.target.value)} />
      </Field>
      {isAdmin ? (
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit">{initial ? "Salvar alterações" : "Salvar insumo"}</Button>
        </div>
      ) : null}
    </form>
  );
}
