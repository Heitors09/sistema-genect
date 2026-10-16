"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Field, Input, PageHeader, Select, DataTable, Td } from "@/components/ui";
import { uid } from "@/lib/format";
import type { TipoGrupoDre } from "@/lib/types";
import { useStore } from "@/lib/store/store";

const tipoLabel: Record<TipoGrupoDre, string> = {
  receita: "Receita",
  deducao: "Dedução",
  custo: "Custo",
  despesa: "Despesa",
  resultado: "Resultado",
};

export default function GruposDrePage() {
  const { state, dispatch, isAdmin } = useStore();
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoGrupoDre>("despesa");
  const [ordem, setOrdem] = useState("60");
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

  if (!isAdmin) return <p className="p-6 text-sm text-mute">Acesso restrito.</p>;

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Financeiro"
        title="Grupo DRE"
        description="Grupos fixos no padrão Sensio (receita, deduções, CPV, despesas operacionais/vendas/admin/financeiras e receitas financeiras). Impostos ficam de fora."
      />

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
          <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="06" required />
        </Field>
        <Field label="Nome">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
        </Field>
        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoGrupoDre)}>
            {(Object.keys(tipoLabel) as TipoGrupoDre[]).map((t) => (
              <option key={t} value={t}>{tipoLabel[t]}</option>
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
            <Td>{g.nome}</Td>
            <Td>{tipoLabel[g.tipo]}</Td>
            <Td>{g.sinal === 1 ? "+" : "−"}</Td>
            <Td className="tabular-nums">{contasPorGrupo.get(g.id) ?? 0}</Td>
            <Td>
              <div className="flex items-center justify-end gap-2">
                <Badge tone={g.ativo ? "mint" : "amber"}>{g.ativo ? "ativo" : "inativo"}</Badge>
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
              </div>
            </Td>
          </tr>
        ))}
      </DataTable>

      <p className="text-[12px] text-faint">
        Categorias financeiras apontam para estes grupos. Sem grupo, a categoria não aparece no DRE. Ordem: receita →
        deduções → líquida → CPV → lucro bruto → despesas (op./vendas/admin) → despesas financeiras → receitas
        financeiras → lucro/prejuízo operacional.
      </p>
    </div>
  );
}
