"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, DataTable, Field, Input, PageHeader, Select, Td } from "@/components/ui";
import { brl, formatDate, todayISO } from "@/lib/format";
import { useStore } from "@/lib/store/store";

export default function EstoquePage() {
  const { state, dispatch, isAdmin } = useStore();
  const [insumoId, setInsumoId] = useState(state.insumos[0]?.id ?? "");
  const [lote, setLote] = useState("");
  const [qtd, setQtd] = useState("");
  const [preco, setPreco] = useState("");
  const [nf, setNf] = useState("");
  const [data, setData] = useState(todayISO());
  const [fornecedorId, setFornecedor] = useState(state.fornecedores[0]?.id ?? "");
  const insumo = state.insumos.find((i) => i.id === insumoId);

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Insumos"
        title="Estoque e entradas"
        description="NF, fornecedor, lote do fabricante e quantidade. Tecidos entram com rastreio de banho."
        actions={
          <Link href="/insumos">
            <Button variant="ghost">Ver cadastro</Button>
          </Link>
        }
      />

      {isAdmin ? (
        <form
          className="grid gap-3 surface rounded-md p-4 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            dispatch({
              type: "ENTRADA_LOTE",
              payload: {
                insumoId,
                loteFabricante: lote,
                quantidade: Number(qtd) || 0,
                preco: Number(preco) || 0,
                nf,
                dataEntrada: data,
                fornecedorId,
              },
            });
            setLote("");
            setQtd("");
            setNf("");
          }}
        >
          <Field label="Insumo">
            <Select value={insumoId} onChange={(e) => setInsumoId(e.target.value)}>
              {state.insumos.map((i) => (
                <option key={i.id} value={i.id}>{i.codigo} · {i.descricao}</option>
              ))}
            </Select>
          </Field>
          <Field label="Fornecedor">
            <Select value={fornecedorId} onChange={(e) => setFornecedor(e.target.value)}>
              {state.fornecedores.map((f) => (
                <option key={f.id} value={f.id}>{f.razaoSocial}</option>
              ))}
            </Select>
          </Field>
          <Field label="Número da NF">
            <Input value={nf} onChange={(e) => setNf(e.target.value)} required />
          </Field>
          <Field label="Lote do fabricante">
            <Input value={lote} onChange={(e) => setLote(e.target.value)} required />
          </Field>
          <Field label="Quantidade">
            <Input type="number" step="0.01" value={qtd} onChange={(e) => setQtd(e.target.value)} required />
          </Field>
          <Field label="Preço unitário">
            <Input type="number" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} required />
          </Field>
          <Field label="Data de entrada">
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </Field>
          <Field label="Unidade">
            <Input readOnly value={insumo?.unidadeCompra ?? ""} />
          </Field>
          <div className="flex items-end">
            <Button type="submit">Lançar entrada</Button>
          </div>
        </form>
      ) : null}

      <DataTable headers={["Data", "Tipo", "Insumo", "Lote / NF", "Qtd", "OP"]}>
        {state.movimentos.map((m) => {
          const ins = state.insumos.find((i) => i.id === m.insumoId);
          const lt = state.lotes.find((l) => l.id === m.loteId);
          const op = state.ops.find((o) => o.id === m.opId);
          return (
            <tr key={m.id}>
              <Td>{formatDate(m.data)}</Td>
              <Td>{m.tipo}</Td>
              <Td>{ins?.codigo}</Td>
              <Td>{lt ? `${lt.loteFabricante} · ${m.nf ?? lt.nf}` : m.nf ?? "—"}</Td>
              <Td>{m.quantidade.toLocaleString("pt-BR")}</Td>
              <Td>{op ? <Link href={`/ops/${op.id}`} className="text-sky">{op.numero}</Link> : "—"}</Td>
            </tr>
          );
        })}
      </DataTable>
    </div>
  );
}
