"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Field, Input, Select, DataTable, Td } from "@/components/ui";
import { uid } from "@/lib/format";
import type { NaturezaConta, TipoCategoriaFinanceira, TipoGrupoDre } from "@/lib/types";
import { useStore } from "@/lib/store/store";

const tipoGrupoLabel: Record<TipoGrupoDre, string> = {
  receita: "Receita",
  deducao: "Dedução",
  custo: "Custo",
  despesa: "Despesa",
  resultado: "Resultado",
};

export function CategoriasPanel() {
  const { state, dispatch } = useStore();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoCategoriaFinanceira>("despesa_custo");
  const [grupoDreId, setGrupo] = useState(state.gruposDre.find((g) => g.tipo === "despesa")?.id ?? "");
  const [parentId, setParent] = useState("");
  const [filtro, setFiltro] = useState("todos");

  const grupos = useMemo(
    () => [...state.gruposDre].filter((g) => g.ativo).sort((a, b) => a.ordem - b.ordem),
    [state.gruposDre],
  );
  /** Grupos compatíveis com o tipo: receita → grupos de receita; despesa → dedução/custo/despesa. */
  const gruposDoTipo = useMemo(
    () => grupos.filter((g) => (tipo === "receita" ? g.tipo === "receita" : g.tipo !== "receita" && g.tipo !== "resultado")),
    [grupos, tipo],
  );
  function contaDoGrupo(gid: string) {
    return state.planoContas.find((c) => c.ativa && c.aceitaLancamento && c.grupoDreId === gid)?.id;
  }
  const pais = useMemo(
    () => state.categoriasFinanceiras.filter((c) => c.ativa && !c.parentId),
    [state.categoriasFinanceiras],
  );
  const rows = useMemo(() => {
    return [...state.categoriasFinanceiras]
      .filter((c) => {
        if (filtro === "receita") return c.tipo === "receita";
        if (filtro === "despesa") return c.tipo === "despesa_custo";
        if (filtro === "sem_dre") return !c.grupoDreId;
        return true;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [state.categoriasFinanceiras, filtro]);

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-mute">
        O lançamento usa a categoria; ela liga ao grupo DRE e ao plano. Sem grupo, não entra no relatório.
      </p>
      <form
        className="grid gap-3 surface rounded-md p-4 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          const parent = parentId ? state.categoriasFinanceiras.find((c) => c.id === parentId) : undefined;
          dispatch({
            type: "SAVE_CATEGORIA",
            categoria: {
              id: uid("cat"),
              nome,
              tipo: parent?.tipo ?? tipo,
              grupoDreId: parent?.grupoDreId ?? (grupoDreId || undefined),
              contaPlanoId: parent?.contaPlanoId ?? (grupoDreId ? contaDoGrupo(grupoDreId) : undefined),
              parentId: parentId || undefined,
              ativa: true,
            },
          });
          setNome("");
          setParent("");
        }}
      >
        <Field label="Nome">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
        </Field>
        <Field label="Tipo">
          <Select
            value={tipo}
            onChange={(e) => {
              const t = e.target.value as TipoCategoriaFinanceira;
              setTipo(t);
              setGrupo(grupos.find((g) => (t === "receita" ? g.tipo === "receita" : g.tipo === "despesa"))?.id ?? "");
            }}
            disabled={!!parentId}
          >
            <option value="receita">Receita</option>
            <option value="despesa_custo">Despesa / custo</option>
          </Select>
        </Field>
        <Field label="Subcategoria de">
          <Select value={parentId} onChange={(e) => setParent(e.target.value)}>
            <option value="">— categoria raiz —</option>
            {pais.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </Select>
        </Field>
        <Field label="Grupo DRE">
          <Select value={grupoDreId} onChange={(e) => setGrupo(e.target.value)} disabled={!!parentId}>
            <option value="">— não entra no DRE —</option>
            {gruposDoTipo.map((g) => (
              <option key={g.id} value={g.id}>{g.codigo} · {g.nome}</option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end">
          <Button type="submit">Cadastrar categoria</Button>
        </div>
      </form>

      <Select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="max-w-56">
        <option value="todos">Todas</option>
        <option value="receita">Receitas</option>
        <option value="despesa">Despesas / custos</option>
        <option value="sem_dre">Fora do DRE</option>
      </Select>

      <DataTable headers={["Nome", "Tipo", "Grupo DRE", "Padrões", "Status"]}>
        {rows.map((c) => {
          const g = state.gruposDre.find((x) => x.id === c.grupoDreId);
          const parent = state.categoriasFinanceiras.find((x) => x.id === c.parentId);
          const pads = [
            c.padraoVendas && "vendas",
            c.padraoReceber && "receber",
            c.padraoCompras && "compras",
            c.padraoPagar && "pagar",
          ].filter(Boolean);
          return (
            <tr key={c.id}>
              <Td>
                <span className={parent ? "pl-3 text-mute" : ""}>
                  {parent ? `↳ ${c.nome}` : c.nome}
                </span>
              </Td>
              <Td>{c.tipo === "receita" ? "Receita" : "Despesa/custo"}</Td>
              <Td className="text-mute">
                {parent ? (
                  g ? g.nome : "—"
                ) : (
                  <Select
                    value={c.grupoDreId ?? ""}
                    className="min-w-44"
                    onChange={(e) =>
                      dispatch({
                        type: "SAVE_CATEGORIA",
                        categoria: {
                          ...c,
                          grupoDreId: e.target.value || undefined,
                          contaPlanoId: e.target.value ? contaDoGrupo(e.target.value) ?? c.contaPlanoId : undefined,
                        },
                      })
                    }
                  >
                    <option value="">— fora do DRE —</option>
                    {grupos
                      .filter((x) => (c.tipo === "receita" ? x.tipo === "receita" : x.tipo !== "receita" && x.tipo !== "resultado"))
                      .map((x) => (
                        <option key={x.id} value={x.id}>{x.codigo} · {x.nome}</option>
                      ))}
                  </Select>
                )}
              </Td>
              <Td className="text-[11px] text-faint">{pads.length ? pads.join(", ") : "—"}</Td>
              <Td>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <Badge tone={c.ativa ? "mint" : "amber"}>{c.ativa ? "ativa" : "inativa"}</Badge>
                  {c.tipo === "receita" ? (
                    <>
                      <Button
                        size="sm"
                        variant={c.padraoVendas ? "soft" : "ghost"}
                        onClick={() =>
                          dispatch({
                            type: "SAVE_CATEGORIA",
                            categoria: { ...c, padraoVendas: !c.padraoVendas },
                          })
                        }
                      >
                        Padrão vendas
                      </Button>
                      <Button
                        size="sm"
                        variant={c.padraoReceber ? "soft" : "ghost"}
                        onClick={() =>
                          dispatch({
                            type: "SAVE_CATEGORIA",
                            categoria: { ...c, padraoReceber: !c.padraoReceber },
                          })
                        }
                      >
                        Padrão receber
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant={c.padraoCompras ? "soft" : "ghost"}
                        onClick={() =>
                          dispatch({
                            type: "SAVE_CATEGORIA",
                            categoria: { ...c, padraoCompras: !c.padraoCompras },
                          })
                        }
                      >
                        Padrão compras
                      </Button>
                      <Button
                        size="sm"
                        variant={c.padraoPagar ? "soft" : "ghost"}
                        onClick={() =>
                          dispatch({
                            type: "SAVE_CATEGORIA",
                            categoria: { ...c, padraoPagar: !c.padraoPagar },
                          })
                        }
                      >
                        Padrão pagar
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      dispatch({
                        type: "SAVE_CATEGORIA",
                        categoria: { ...c, ativa: !c.ativa },
                      })
                    }
                  >
                    {c.ativa ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </Td>
            </tr>
          );
        })}
      </DataTable>
    </div>
  );
}

export function PlanoContasPanel() {
  const { state, dispatch } = useStore();
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [grupoDreId, setGrupo] = useState(state.gruposDre[0]?.id ?? "");
  const [natureza, setNatureza] = useState<NaturezaConta>("despesa");
  const [filtroGrupo, setFiltroGrupo] = useState("todos");

  const grupos = useMemo(
    () => [...state.gruposDre].filter((g) => g.ativo).sort((a, b) => a.ordem - b.ordem),
    [state.gruposDre],
  );
  const rows = useMemo(() => {
    return [...state.planoContas]
      .filter((c) => filtroGrupo === "todos" || c.grupoDreId === filtroGrupo)
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [state.planoContas, filtroGrupo]);

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-mute">
        Contas gerenciais finais. Categorias vinculam a estas contas.
      </p>
      <form
        className="grid gap-3 surface rounded-md p-4 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          dispatch({
            type: "SAVE_PLANO_CONTA",
            conta: {
              id: uid("pc"),
              codigo,
              nome,
              grupoDreId,
              natureza,
              ativa: true,
              aceitaLancamento: true,
            },
          });
          setCodigo("");
          setNome("");
        }}
      >
        <Field label="Código">
          <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="4.1.05" required />
        </Field>
        <Field label="Nome">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
        </Field>
        <Field label="Grupo DRE">
          <Select value={grupoDreId} onChange={(e) => setGrupo(e.target.value)}>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>{g.codigo} · {g.nome}</option>
            ))}
          </Select>
        </Field>
        <Field label="Natureza">
          <Select value={natureza} onChange={(e) => setNatureza(e.target.value as NaturezaConta)}>
            <option value="receita">Receita</option>
            <option value="custo">Custo</option>
            <option value="despesa">Despesa</option>
          </Select>
        </Field>
        <div className="flex items-end">
          <Button type="submit">Adicionar conta</Button>
        </div>
      </form>

      <Select value={filtroGrupo} onChange={(e) => setFiltroGrupo(e.target.value)} className="max-w-72">
        <option value="todos">Todos os grupos</option>
        {grupos.map((g) => (
          <option key={g.id} value={g.id}>{g.codigo} · {g.nome}</option>
        ))}
      </Select>

      <DataTable headers={["Código", "Nome", "Grupo DRE", "Natureza", "Status"]}>
        {rows.map((c) => {
          const g = state.gruposDre.find((x) => x.id === c.grupoDreId);
          return (
            <tr key={c.id}>
              <Td className="font-mono text-[12px]">{c.codigo}</Td>
              <Td>{c.nome}</Td>
              <Td className="text-mute">{g ? `${g.codigo} ${g.nome}` : "—"}</Td>
              <Td>{c.natureza}</Td>
              <Td>
                <div className="flex items-center justify-end gap-2">
                  <Badge tone={c.ativa ? "mint" : "amber"}>{c.ativa ? "ativa" : "inativa"}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      dispatch({
                        type: "SAVE_PLANO_CONTA",
                        conta: { ...c, ativa: !c.ativa },
                      })
                    }
                  >
                    {c.ativa ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </Td>
            </tr>
          );
        })}
      </DataTable>
    </div>
  );
}

export function GruposDrePanel() {
  const { state, dispatch } = useStore();
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoGrupoDre>("despesa");
  const [ordem, setOrdem] = useState("90");
  const [sinal, setSinal] = useState<"1" | "-1">("-1");

  const rows = useMemo(
    () => [...state.gruposDre].sort((a, b) => a.ordem - b.ordem),
    [state.gruposDre],
  );
  const contasPorGrupo = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of state.planoContas) {
      if (!c.ativa) continue;
      map.set(c.grupoDreId, (map.get(c.grupoDreId) ?? 0) + 1);
    }
    return map;
  }, [state.planoContas]);

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-mute">
        Estrutura do DRE. Categorias sem grupo não aparecem no relatório. Impostos ficam de fora.
      </p>
      <form
        className="grid gap-3 surface rounded-md p-4 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          dispatch({
            type: "SAVE_GRUPO_DRE",
            grupo: {
              id: uid("gdre"),
              codigo,
              nome,
              tipo,
              ordem: Number(ordem) || 99,
              sinal: Number(sinal) as 1 | -1,
              ativo: true,
            },
          });
          setCodigo("");
          setNome("");
        }}
      >
        <Field label="Código">
          <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="09" required />
        </Field>
        <Field label="Nome">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
        </Field>
        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoGrupoDre)}>
            {(Object.keys(tipoGrupoLabel) as TipoGrupoDre[]).map((t) => (
              <option key={t} value={t}>{tipoGrupoLabel[t]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Ordem">
          <Input type="number" value={ordem} onChange={(e) => setOrdem(e.target.value)} />
        </Field>
        <Field label="Sinal no resultado">
          <Select value={sinal} onChange={(e) => setSinal(e.target.value as "1" | "-1")}>
            <option value="1">Soma (+)</option>
            <option value="-1">Subtrai (−)</option>
          </Select>
        </Field>
        <div className="flex items-end">
          <Button type="submit">Adicionar grupo</Button>
        </div>
      </form>

      <DataTable headers={["Ordem", "Código", "Nome", "Tipo", "Sinal", "Contas", "Status"]}>
        {rows.map((g) => (
          <tr key={g.id}>
            <Td className="tabular-nums">{g.ordem}</Td>
            <Td className="font-mono text-[12px]">{g.codigo}</Td>
            <Td>
              {g.nome}
              {g.fixo ? <span className="ml-1.5 text-[10px] text-faint">fixo</span> : null}
            </Td>
            <Td>{tipoGrupoLabel[g.tipo]}</Td>
            <Td>{g.sinal === 1 ? "+" : "−"}</Td>
            <Td className="tabular-nums">{contasPorGrupo.get(g.id) ?? 0}</Td>
            <Td>
              <div className="flex items-center justify-end gap-2">
                <Badge tone={g.ativo ? "mint" : "amber"}>{g.ativo ? "ativo" : "inativo"}</Badge>
                {!g.fixo ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      dispatch({
                        type: "SAVE_GRUPO_DRE",
                        grupo: { ...g, ativo: !g.ativo },
                      })
                    }
                  >
                    {g.ativo ? "Desativar" : "Ativar"}
                  </Button>
                ) : null}
              </div>
            </Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
