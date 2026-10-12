"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { tipoNegocioLabel, uid } from "@/lib/format";
import { readFiles } from "@/lib/files";
import { fichaLinhas } from "@/lib/ficha";
import type { Produto, TipoNegocio } from "@/lib/types";
import { useStore } from "@/lib/store/store";
import { Button, CreatableSelect, Field, FileInput, Input, Select, Textarea } from "../ui";

function destinoAposSalvar(voltar?: string | null) {
  if (!voltar || !voltar.startsWith("/") || voltar.startsWith("//")) return "/produtos";
  return voltar;
}

export function ProdutoForm({ initial, voltar }: { initial?: Produto; voltar?: string | null }) {
  const router = useRouter();
  const { state, dispatch, isAdmin } = useStore();
  const [referencia, setReferencia] = useState(initial?.referencia ?? "");
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [tipoNegocio, setTipoNegocio] = useState<TipoNegocio>(initial?.tipoNegocio ?? "servico");
  const [categoria, setCategoria] = useState(initial?.categoria ?? "");
  const [linha, setLinha] = useState(initial?.linha ?? "");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [tamanhos, setTamanhos] = useState<string[]>(initial?.tamanhos ?? []);
  const [tamSel, setTamSel] = useState(initial?.tamanhos[0] ?? "");
  const [cores, setCores] = useState<string[]>(initial?.cores ?? []);
  const [corSel, setCorSel] = useState(initial?.cores[0] ?? "");
  const [variacoes, setVariacoes] = useState(
    (initial?.variacoes ?? []).map((v) => ({ ...v, id: uid("var") })),
  );
  const [insumosSel, setInsumosSel] = useState(
    (initial ? fichaLinhas(initial) : [{ insumoId: "", consumoPorPeca: 0 }]).map((a) => ({
      ...a,
      id: uid("insf"),
    })),
  );
  const [preco, setPreco] = useState(initial?.precoVenda ? String(initial.precoVenda) : "");
  const [imagens, setImagens] = useState<string[]>(initial?.imagens ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const opcoesTamanho = useMemo(() => {
    const set = new Set([...state.tamanhosPadrao, ...tamanhos, ...variacoes.map((v) => v.tamanho)]);
    return [...set].filter(Boolean);
  }, [state.tamanhosPadrao, tamanhos, variacoes]);

  const opcoesCor = useMemo(() => {
    const set = new Set<string>([...(state.coresPadrao ?? []), ...cores]);
    for (const v of variacoes) for (const c of v.cores) if (c) set.add(c);
    return [...set].filter(Boolean);
  }, [state.coresPadrao, cores, variacoes]);

  function addTamanho(val: string) {
    if (!val) return;
    setTamSel(val);
    setTamanhos((prev) => (prev.includes(val) ? prev : [...prev, val]));
  }

  function removeTamanhoChip(val: string) {
    setTamanhos((prev) => prev.filter((x) => x !== val));
    if (tamSel === val) setTamSel("");
  }

  function addCorProduto(val: string) {
    const nomeCor = val.trim();
    if (!nomeCor) return;
    setCorSel(nomeCor);
    setCores((prev) => (prev.some((c) => c.toLowerCase() === nomeCor.toLowerCase()) ? prev : [...prev, nomeCor]));
  }

  function removeCorChip(val: string) {
    setCores((prev) => prev.filter((x) => x !== val));
    if (corSel === val) setCorSel("");
  }

  function removeVariacao(id: string) {
    setVariacoes((prev) => prev.filter((x) => x.id !== id));
  }

  function addVariacao() {
    setVariacoes((prev) => [
      ...prev,
      { id: uid("var"), tamanho: tamSel || tamanhos[0] || "", cores: [] },
    ]);
  }

  function addCor(id: string, cor: string) {
    const nomeCor = cor.trim();
    if (!nomeCor) return;
    setCores((prev) => (prev.some((c) => c.toLowerCase() === nomeCor.toLowerCase()) ? prev : [...prev, nomeCor]));
    setVariacoes((prev) =>
      prev.map((x) => {
        if (x.id !== id) return x;
        if (x.cores.some((c) => c.toLowerCase() === nomeCor.toLowerCase())) return x;
        return { ...x, cores: [...x.cores, nomeCor] };
      }),
    );
  }

  function removeInsumo(id: string) {
    setInsumosSel((prev) => prev.filter((x) => x.id !== id));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!referencia.trim()) e.referencia = "Obrigatório — é o número usado na OP";
    if (!nome.trim()) e.nome = "Obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function save(e: FormEvent) {
    e.preventDefault();
    if (!isAdmin || !validate()) return;
    const linhas = insumosSel.filter((a) => a.insumoId && a.consumoPorPeca > 0);
    const tecido = linhas.find((l) => state.insumos.find((i) => i.id === l.insumoId)?.categoria === "tecido");
    const gradeVars = variacoes.filter((v) => v.tamanho);
    const coresSalvas = [...new Set([...cores, ...gradeVars.flatMap((v) => v.cores)])];
    const tamanhosSalvos = [
      ...new Set([...tamanhos, ...gradeVars.map((v) => v.tamanho)].filter(Boolean)),
    ];
    const produto: Produto = {
      id: initial?.id ?? uid("prod"),
      referencia: referencia.trim(),
      nome: nome.trim(),
      tipoNegocio,
      categoria: categoria.trim(),
      linha: linha.trim(),
      cores: coresSalvas,
      tamanhos: tamanhosSalvos,
      // Opcional: só persiste se o usuário montou variações tamanho→cores
      variacoes: gradeVars.map(({ tamanho, cores: cs }) => ({ tamanho, cores: cs })),
      materiaPrimaId: tecido?.insumoId ?? "",
      consumoTecidoPorPeca: tecido?.consumoPorPeca ?? 0,
      aviamentos: linhas.map(({ insumoId, consumoPorPeca }) => ({ insumoId, consumoPorPeca })),
      precoVenda: Number(preco) || 0,
      descricao: descricao.trim(),
      imagens,
    };
    dispatch({ type: "SAVE_PRODUCT", produto });
    router.push(destinoAposSalvar(voltar));
  }

  return (
    <form onSubmit={save} className="grid gap-3">
      <div className="grid gap-3 surface rounded-md p-4 sm:grid-cols-2">
        <Field label="Número / referência" error={errors.referencia}>
          <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="REF-452" required />
        </Field>
        <Field label="Nome do modelo" error={errors.nome}>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
        </Field>
        <Field label="Modelo de negócio">
          <Select value={tipoNegocio} onChange={(e) => setTipoNegocio(e.target.value as TipoNegocio)}>
            <option value="servico">{tipoNegocioLabel.servico}</option>
            <option value="fabricacao">{tipoNegocioLabel.fabricacao}</option>
          </Select>
        </Field>
        <Field label="Categoria" hint="Opcional">
          <Input value={categoria} onChange={(e) => setCategoria(e.target.value)} />
        </Field>
        <Field label="Coleção" hint="Opcional">
          <Input value={linha} onChange={(e) => setLinha(e.target.value)} />
        </Field>
        <Field label="Preço de venda" hint="Opcional">
          <Input type="number" step="0.01" min={0} value={preco} onChange={(e) => setPreco(e.target.value)} />
        </Field>
        <Field label="Grade de tamanhos" hint="Aparece na OP — lista + espaço para novo">
          <CreatableSelect
            value={tamSel}
            emptyLabel={tamanhos.length ? "Selecione o tamanho" : "Nenhum tamanho"}
            options={opcoesTamanho.map((t) => ({ value: t, label: t }))}
            addLabel="+ Novo tamanho"
            addPlaceholder="Ex.: P"
            onChange={addTamanho}
            onAdd={(novo) => {
              dispatch({ type: "ADD_TAMANHO", tamanho: novo });
              addTamanho(novo);
            }}
          />
          {tamanhos.length ? (
            <div className="flex flex-wrap gap-1.5">
              {tamanhos.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="h-7 rounded-md border border-line px-2 text-[11px] hover:border-rose hover:text-rose"
                  onClick={() => removeTamanhoChip(t)}
                >
                  {t} ×
                </button>
              ))}
            </div>
          ) : null}
        </Field>
        <Field label="Cores" hint="Predefinidas + opção de cadastrar">
          <CreatableSelect
            value={corSel}
            emptyLabel={cores.length ? "Selecione a cor" : "Nenhuma cor"}
            options={opcoesCor.map((c) => ({ value: c, label: c }))}
            addLabel="+ Nova cor"
            addPlaceholder="Ex.: Azul Marinho"
            onChange={addCorProduto}
            onAdd={(nova) => {
              dispatch({ type: "ADD_COR", cor: nova });
              addCorProduto(nova);
            }}
          />
          {cores.length ? (
            <div className="flex flex-wrap gap-1.5">
              {cores.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="h-7 rounded-md border border-line px-2 text-[11px] hover:border-rose hover:text-rose"
                  onClick={() => removeCorChip(c)}
                >
                  {c} ×
                </button>
              ))}
            </div>
          ) : null}
        </Field>
        <div className="sm:col-span-2">
          <Field label="Descrição" hint="Opcional">
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Foto do produto" hint="Uma ou mais imagens">
            <FileInput
              accept="image/*"
              multiple
              emptyLabel="Nenhuma foto"
              actionLabel="Escolher"
              onFiles={async (files) => {
                const urls = await readFiles(files);
                setImagens((p) => [...p, ...urls]);
              }}
            />
            {imagens.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {imagens.map((src, i) => (
                  <div key={`${src.slice(0, 24)}-${i}`} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-20 w-20 rounded-md object-cover" />
                    <button
                      type="button"
                      className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border border-line bg-surface text-faint hover:text-rose"
                      aria-label="Remover foto"
                      onClick={() => setImagens((p) => p.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </Field>
        </div>
      </div>

      <div className="surface rounded-md p-4">
        <p className="kicker mb-1">Variações de estoque</p>
        <p className="mb-3 text-[12px] text-faint">
          Opcional. Se preencher, a OP usa tamanho×cor (ex.: P com preto e azul). Sem isso, a OP usa só a grade de tamanhos.
        </p>
        {variacoes.map((v) => (
          <div key={v.id} className="mb-2">
            <div className="grid grid-cols-[minmax(0,140px)_1fr_auto] items-center gap-2">
              <CreatableSelect
                value={v.tamanho}
                emptyLabel="Tamanho"
                options={opcoesTamanho.map((t) => ({ value: t, label: t }))}
                addLabel="+ Tamanho"
                addPlaceholder="P"
                onChange={(val) => {
                  setVariacoes((prev) => prev.map((x) => (x.id === v.id ? { ...x, tamanho: val } : x)));
                  setTamanhos((prev) => (prev.includes(val) ? prev : [...prev, val]));
                  setTamSel(val);
                }}
                onAdd={(novo) => {
                  dispatch({ type: "ADD_TAMANHO", tamanho: novo });
                  setVariacoes((prev) => prev.map((x) => (x.id === v.id ? { ...x, tamanho: novo } : x)));
                  setTamanhos((prev) => (prev.includes(novo) ? prev : [...prev, novo]));
                  setTamSel(novo);
                }}
              />
              <CreatableSelect
                value=""
                emptyLabel="Adicionar cor"
                options={opcoesCor
                  .filter((c) => !v.cores.some((x) => x.toLowerCase() === c.toLowerCase()))
                  .map((c) => ({ value: c, label: c }))}
                addLabel="+ Nova cor"
                addPlaceholder="Ex.: Azul Marinho"
                onChange={(val) => addCor(v.id, val)}
                onAdd={(nova) => {
                  dispatch({ type: "ADD_COR", cor: nova });
                  addCor(v.id, nova);
                }}
              />
              <button
                type="button"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-faint hover:bg-elevated hover:text-rose"
                aria-label="Remover variação"
                onClick={() => removeVariacao(v.id)}
              >
                <Trash2 size={13} />
              </button>
            </div>
            {v.cores.length ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5 pl-[calc(140px+0.5rem)]">
                {v.cores.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="h-7 rounded-md border border-line px-2 text-[11px] hover:border-rose hover:text-rose"
                    onClick={() =>
                      setVariacoes((prev) =>
                        prev.map((x) => (x.id === v.id ? { ...x, cores: x.cores.filter((cor) => cor !== c) } : x)),
                      )
                    }
                  >
                    {c} ×
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        <Button type="button" size="sm" variant="ghost" onClick={addVariacao}>
          Adicionar variação
        </Button>
      </div>

      <div className="surface rounded-md p-4">
        <p className="kicker mb-1">Insumos da ficha técnica</p>
        <p className="mb-3 text-[12px] text-faint">
          Consumo na unidade cadastrada do insumo. A cor vem preenchida do cadastro dele.
        </p>
        {insumosSel.map((a) => {
          const ins = state.insumos.find((x) => x.id === a.insumoId);
          const un = ins?.unidadeConsumo ?? "—";
          return (
            <div key={a.id} className="mb-2 grid grid-cols-[minmax(0,1fr)_110px_110px_auto] items-center gap-2">
              <Select
                value={a.insumoId}
                onChange={(e) => {
                  const id = e.target.value;
                  setInsumosSel((prev) =>
                    prev.map((x) =>
                      x.id === a.id ? { ...x, insumoId: id, consumoPorPeca: x.consumoPorPeca || 1 } : x,
                    ),
                  );
                }}
              >
                <option value="">Selecionar insumo</option>
                {state.insumos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.codigo} · {item.descricao}
                  </option>
                ))}
              </Select>
              <div className="flex min-w-0">
                <Input
                  type="number"
                  min={0}
                  step={ins?.unidadeConsumo === "un" || ins?.unidadeConsumo === "cx" ? 1 : 0.01}
                  value={a.consumoPorPeca || ""}
                  onChange={(e) =>
                    setInsumosSel((prev) =>
                      prev.map((x) => (x.id === a.id ? { ...x, consumoPorPeca: Number(e.target.value) } : x)),
                    )
                  }
                  className="rounded-r-none"
                />
                <span className="well grid min-w-[2.5rem] place-items-center rounded-l-none rounded-r-md border border-l-0 border-line px-2 text-[11px] text-mute">
                  {un}
                </span>
              </div>
              <Input readOnly value={ins?.cor || "—"} className="cursor-default text-mute" />
              <button
                type="button"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-faint hover:bg-elevated hover:text-rose"
                aria-label="Remover insumo"
                onClick={() => removeInsumo(a.id)}
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setInsumosSel((p) => [...p, { id: uid("insf"), insumoId: "", consumoPorPeca: 0 }])}
        >
          Adicionar insumo
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
