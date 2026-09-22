"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { tipoNegocioLabel, uid } from "@/lib/format";
import { fichaLinhas } from "@/lib/ficha";
import type { Produto, StageKind, TipoNegocio } from "@/lib/types";
import { useStore } from "@/lib/store/store";
import { Button, CreatableSelect, Field, Input, Select, Textarea } from "../ui";

const kinds: StageKind[] = ["corte", "costura", "faccao", "acabamento", "revisao", "embalagem", "expedicao"];

export function ProdutoForm({ initial }: { initial?: Produto }) {
  const router = useRouter();
  const { state, dispatch, isAdmin } = useStore();
  const [referencia, setReferencia] = useState(initial?.referencia ?? "");
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [tipoNegocio, setTipoNegocio] = useState<TipoNegocio>(initial?.tipoNegocio ?? "servico");
  const [categoria, setCategoria] = useState(initial?.categoria ?? "");
  const [linha, setLinha] = useState(initial?.linha ?? "");
  const [cores, setCores] = useState<string[]>(initial?.cores ?? []);
  const [corSel, setCorSel] = useState(initial?.cores[0] ?? "");
  const [tamanhos, setTamanhos] = useState(initial?.tamanhos.join(", ") ?? "");
  const [insumosSel, setInsumosSel] = useState(initial ? fichaLinhas(initial) : []);
  const [roteiro, setRoteiro] = useState(initial?.roteiro ?? []);
  const [custo, setCusto] = useState(initial?.custoEstimado ? String(initial.custoEstimado) : "");
  const [preco, setPreco] = useState(initial?.precoVenda ? String(initial.precoVenda) : "");
  const [fotoHint, setFotoHint] = useState(initial?.fotoHint ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!referencia.trim()) e.referencia = "Obrigatório — é o número usado na OP";
    if (!nome.trim()) e.nome = "Obrigatório";
    if (!cores.length) e.cores = "Adicione ao menos uma cor";
    const venda = Number(preco);
    if (!preco.trim() || Number.isNaN(venda) || venda <= 0) e.preco = "Preço de venda obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function save(e: FormEvent) {
    e.preventDefault();
    if (!isAdmin || !validate()) return;
    const linhas = insumosSel.filter((a) => a.insumoId && a.consumoPorPeca > 0);
    const tecido = linhas.find((l) => state.insumos.find((i) => i.id === l.insumoId)?.categoria === "tecido");
    const produto: Produto = {
      id: initial?.id ?? uid("prod"),
      referencia: referencia.trim(),
      nome: nome.trim(),
      tipoNegocio,
      categoria: categoria.trim(),
      linha: linha.trim(),
      cores,
      tamanhos: tamanhos.split(",").map((s) => s.trim()).filter(Boolean),
      materiaPrimaId: tecido?.insumoId ?? "",
      consumoTecidoPorPeca: tecido?.consumoPorPeca ?? 0,
      aviamentos: linhas,
      roteiro,
      custoEstimado: Number(custo) || 0,
      precoVenda: Number(preco) || 0,
      fotoHint,
    };
    dispatch({ type: "SAVE_PRODUCT", produto });
    router.push("/produtos");
  }

  return (
    <form onSubmit={save} className="grid gap-3">
      <div className="grid gap-3 surface rounded-md p-4 sm:grid-cols-2">
        <Field label="Número / referência" error={errors.referencia} hint="Aparece no dropdown da OP">
          <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="REF-452" required />
        </Field>
        <Field label="Nome do modelo" error={errors.nome}>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
        </Field>
        <Field
          label="Modelo de negócio"
          hint="Serviço é o mais comum: o cliente já manda o material cortado"
        >
          <Select value={tipoNegocio} onChange={(e) => setTipoNegocio(e.target.value as TipoNegocio)}>
            <option value="servico">{tipoNegocioLabel.servico}</option>
            <option value="fabricacao">{tipoNegocioLabel.fabricacao}</option>
          </Select>
        </Field>
        <Field label="Categoria" hint="Opcional">
          <Input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Feminino > Vestidos" />
        </Field>
        <Field label="Coleção" hint="Opcional">
          <Input value={linha} onChange={(e) => setLinha(e.target.value)} />
        </Field>
        <Field label="Cor" error={errors.cores} hint="Obrigatório. Selecione ou adicione cores">
          <CreatableSelect
            value={corSel}
            emptyLabel={cores.length ? "Selecione a cor" : "Nenhuma cor"}
            options={cores.map((c) => ({ value: c, label: c }))}
            addLabel="+ Nova cor"
            addPlaceholder="Ex.: Preto"
            onChange={setCorSel}
            onAdd={(nova) => {
              setCores((prev) => (prev.some((c) => c.toLowerCase() === nova.toLowerCase()) ? prev : [...prev, nova]));
              setCorSel(nova);
            }}
          />
          {cores.length ? (
            <div className="flex flex-wrap gap-1.5">
              {cores.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="inline-flex h-7 cursor-pointer items-center rounded-md border border-line bg-elevated/80 px-2 text-[11px] text-ink transition-transform duration-150 ease-out active:scale-[0.96]"
                  onClick={() => {
                    setCores((prev) => prev.filter((x) => x !== c));
                    setCorSel((atual) => (atual === c ? "" : atual));
                  }}
                >
                  {c} ×
                </button>
              ))}
            </div>
          ) : null}
        </Field>
        <Field label="Grade de tamanhos" hint="Opcional">
          <Input value={tamanhos} onChange={(e) => setTamanhos(e.target.value)} placeholder="P, M, G" />
        </Field>
        <Field label="Custo estimado" hint="Opcional">
          <Input type="number" step="0.01" value={custo} onChange={(e) => setCusto(e.target.value)} />
        </Field>
        <Field label="Preço de venda" error={errors.preco} hint="Obrigatório — preenche a OP">
          <Input type="number" step="0.01" min={0} value={preco} onChange={(e) => setPreco(e.target.value)} required />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Foto / croqui" hint="Opcional">
            <Textarea value={fotoHint} onChange={(e) => setFotoHint(e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="surface rounded-md p-4">
        <p className="kicker mb-1">Insumos da ficha técnica</p>
        <p className="mb-3 text-[12px] text-faint">
          {tipoNegocio === "servico"
            ? "Opcional. Use só quando a Genect compra algum item (ex.: linha de um cliente). Na maioria dos serviços o cliente já envia tecido, botão, zíper e linha."
            : "Fabricação: tecido, serviços de fora, linha, zíper e botão para o custo. Pode ficar vazio se ainda não for calcular."}
        </p>
        {insumosSel.length ? (
          <div className="mb-1 grid grid-cols-[1fr_140px] gap-2 text-[10px] uppercase tracking-wide text-faint">
            <span>Insumo</span>
            <span>Consumo / peça</span>
          </div>
        ) : null}
        {insumosSel.map((a, i) => (
          <div key={`${a.insumoId}-${i}`} className="mb-2 grid grid-cols-[1fr_140px] gap-2">
            <Select
              value={a.insumoId}
              onChange={(e) =>
                setInsumosSel((prev) => prev.map((x, idx) => (idx === i ? { ...x, insumoId: e.target.value } : x)))
              }
            >
              <option value="">Selecionar insumo</option>
              {state.insumos.map((ins) => (
                <option key={ins.id} value={ins.id}>
                  {ins.codigo} · {ins.descricao}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              step="0.01"
              value={a.consumoPorPeca}
              onChange={(e) =>
                setInsumosSel((prev) =>
                  prev.map((x, idx) => (idx === i ? { ...x, consumoPorPeca: Number(e.target.value) } : x)),
                )
              }
            />
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setInsumosSel((p) => [...p, { insumoId: "", consumoPorPeca: 1 }])}
        >
          Adicionar insumo
        </Button>
      </div>

      <div className="surface rounded-md p-4">
        <p className="kicker mb-1">Roteiro de produção</p>
        <p className="mb-3 text-[12px] text-faint">Opcional. Tempo estimado por etapa.</p>
        {roteiro.map((r, i) => (
          <div key={r.id} className="mb-2 grid grid-cols-[1fr_140px_90px] gap-2">
            <Input
              value={r.nome}
              onChange={(e) => setRoteiro((p) => p.map((x, idx) => (idx === i ? { ...x, nome: e.target.value } : x)))}
            />
            <Select
              value={r.kind}
              onChange={(e) =>
                setRoteiro((p) => p.map((x, idx) => (idx === i ? { ...x, kind: e.target.value as StageKind } : x)))
              }
            >
              {kinds.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </Select>
            <Input
              type="number"
              value={r.minutos}
              onChange={(e) =>
                setRoteiro((p) => p.map((x, idx) => (idx === i ? { ...x, minutos: Number(e.target.value) } : x)))
              }
            />
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setRoteiro((p) => [...p, { id: uid("r"), nome: "Etapa", kind: "custom", minutos: 5 }])}
        >
          Adicionar etapa
        </Button>
      </div>

      {isAdmin ? (
        <div className="flex justify-end">
          <Button type="submit">Salvar produto</Button>
        </div>
      ) : null}
    </form>
  );
}
