"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Field, Input, PageHeader, Select, DataTable, Td } from "@/components/ui";
import { uid } from "@/lib/format";
import type { NaturezaConta } from "@/lib/types";
import { useStore } from "@/lib/store/store";

export default function PlanoContasPage() {
  const { state, dispatch, isAdmin } = useStore();
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

  if (!isAdmin) return <p className="p-6 text-sm text-mute">Acesso restrito.</p>;

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Financeiro"
        title="Plano de contas"
        description="Cada conta liga a um grupo DRE. Receita de vendas é a conta padrão de faturamento."
      />

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
