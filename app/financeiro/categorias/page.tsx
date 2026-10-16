"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Field, Input, PageHeader, Select, DataTable, Td } from "@/components/ui";
import { uid } from "@/lib/format";
import type { TipoCategoriaFinanceira } from "@/lib/types";
import { useStore } from "@/lib/store/store";

export default function CategoriasPage() {
  const { state, dispatch, isAdmin } = useStore();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoCategoriaFinanceira>("despesa_custo");
  const [grupoDreId, setGrupo] = useState(state.gruposDre.find((g) => g.tipo === "despesa")?.id ?? "");
  const [contaPlanoId, setConta] = useState("");
  const [parentId, setParent] = useState("");
  const [filtro, setFiltro] = useState("todos");

  const grupos = useMemo(
    () => [...state.gruposDre].filter((g) => g.ativo).sort((a, b) => a.ordem - b.ordem),
    [state.gruposDre],
  );

  const contasFolha = useMemo(
    () => state.planoContas.filter((c) => c.ativa && c.aceitaLancamento),
    [state.planoContas],
  );

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

  if (!isAdmin) return <p className="p-6 text-sm text-mute">Acesso restrito.</p>;

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Financeiro"
        title="Categorias financeiras"
        description="Como no Sensio: o lançamento usa a categoria; ela liga ao grupo DRE e ao plano de contas. Sem grupo DRE, a categoria não entra no relatório."
      />

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
              contaPlanoId: parent?.contaPlanoId ?? (contaPlanoId || undefined),
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
            onChange={(e) => setTipo(e.target.value as TipoCategoriaFinanceira)}
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
          <Select
            value={grupoDreId}
            onChange={(e) => setGrupo(e.target.value)}
            disabled={!!parentId}
          >
            <option value="">— não entra no DRE —</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>{g.codigo} · {g.nome}</option>
            ))}
          </Select>
        </Field>
        <Field label="Plano de contas">
          <Select
            value={contaPlanoId}
            onChange={(e) => setConta(e.target.value)}
            disabled={!!parentId}
          >
            <option value="">— opcional —</option>
            {contasFolha.map((c) => (
              <option key={c.id} value={c.id}>{c.codigo} · {c.nome}</option>
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

      <DataTable headers={["Nome", "Tipo", "Grupo DRE", "Plano", "Padrões", "Status"]}>
        {rows.map((c) => {
          const g = state.gruposDre.find((x) => x.id === c.grupoDreId);
          const p = state.planoContas.find((x) => x.id === c.contaPlanoId);
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
              <Td className="text-mute">{g ? g.nome : "—"}</Td>
              <Td className="font-mono text-[11px] text-mute">{p?.codigo ?? "—"}</Td>
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
