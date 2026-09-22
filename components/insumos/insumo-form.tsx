"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { categoriaLabel, uid } from "@/lib/format";
import type { Insumo, InsumoCategoria, Unidade } from "@/lib/types";
import { useStore } from "@/lib/store/store";
import { Button, Field, Input, Select } from "../ui";

const cats: InsumoCategoria[] = ["tecido", "linha", "botao", "ziper", "etiqueta", "embalagem", "aviamento"];
const uns: Unidade[] = ["kg", "m", "un", "cx", "milheiro", "cone", "g"];

export function InsumoForm({ initial }: { initial?: Insumo }) {
  const router = useRouter();
  const { state, dispatch, isAdmin } = useStore();
  const [codigo, setCodigo] = useState(initial?.codigo ?? "");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [categoria, setCategoria] = useState<InsumoCategoria>(initial?.categoria ?? "tecido");
  const [unidadeCompra, setUc] = useState<Unidade>(initial?.unidadeCompra ?? "kg");
  const [unidadeConsumo, setUcons] = useState<Unidade>(initial?.unidadeConsumo ?? "m");
  const [fator, setFator] = useState(String(initial?.fatorConversao ?? 1));
  const [minimo, setMinimo] = useState(String(initial?.estoqueMinimo ?? 0));
  const [custo, setCusto] = useState(String(initial?.custoMedio ?? 0));
  const [fornecedorId, setFornecedor] = useState(initial?.fornecedorId ?? state.fornecedores[0]?.id ?? "");
  const [refFornecedor, setRef] = useState(initial?.refFornecedor ?? "");

  function save(e: FormEvent) {
    e.preventDefault();
    if (!isAdmin || !codigo.trim()) return;
    const insumo: Insumo = {
      id: initial?.id ?? uid("ins"),
      codigo: codigo.trim(),
      descricao,
      categoria,
      unidadeCompra,
      unidadeConsumo,
      fatorConversao: Number(fator) || 1,
      estoqueMinimo: Number(minimo) || 0,
      custoMedio: Number(custo) || 0,
      estoqueAtual: initial?.estoqueAtual ?? 0,
      reservado: initial?.reservado ?? 0,
      fornecedorId,
      refFornecedor,
    };
    dispatch({ type: "SAVE_INSUMO", insumo });
    router.push("/insumos");
  }

  return (
    <form onSubmit={save} className="grid gap-3 surface rounded-md p-4 sm:grid-cols-2">
      <Field label="Código">
        <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="TEC-MAL-CAN-01" required />
      </Field>
      <Field label="Categoria">
        <Select value={categoria} onChange={(e) => setCategoria(e.target.value as InsumoCategoria)}>
          {cats.map((c) => (
            <option key={c} value={c}>{categoriaLabel[c]}</option>
          ))}
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Descrição detalhada">
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </Field>
      </div>
      <Field label="Unidade de compra">
        <Select value={unidadeCompra} onChange={(e) => setUc(e.target.value as Unidade)}>
          {uns.map((u) => <option key={u}>{u}</option>)}
        </Select>
      </Field>
      <Field label="Unidade de consumo">
        <Select value={unidadeConsumo} onChange={(e) => setUcons(e.target.value as Unidade)}>
          {uns.map((u) => <option key={u}>{u}</option>)}
        </Select>
      </Field>
      <Field label="Fator de conversão">
        <Input type="number" step="0.01" value={fator} onChange={(e) => setFator(e.target.value)} />
      </Field>
      <Field label="Estoque mínimo">
        <Input type="number" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
      </Field>
      <Field label="Custo médio">
        <Input type="number" step="0.01" value={custo} onChange={(e) => setCusto(e.target.value)} />
      </Field>
      <Field label="Fornecedor principal">
        <Select value={fornecedorId} onChange={(e) => setFornecedor(e.target.value)}>
          {state.fornecedores.map((f) => (
            <option key={f.id} value={f.id}>{f.razaoSocial}</option>
          ))}
        </Select>
      </Field>
      <Field label="Referência do fornecedor">
        <Input value={refFornecedor} onChange={(e) => setRef(e.target.value)} />
      </Field>
      {isAdmin ? (
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit">Salvar insumo</Button>
        </div>
      ) : null}
    </form>
  );
}
