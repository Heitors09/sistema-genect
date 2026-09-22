"use client";

import { Badge, Card, DataTable, PageHeader, Td } from "@/components/ui";
import { useStore } from "@/lib/store/store";

export default function CadastrosPage() {
  const { state, isAdmin } = useStore();
  if (!isAdmin) return <p className="p-6 text-sm text-mute">Acesso restrito.</p>;

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Cadastros"
        title="Empresas, clientes e fornecedores"
        description="Cadastro único: OPs, estoque e financeiro reutilizam estes registros."
      />
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="p-4">
          <p className="kicker mb-3">Empresas</p>
          {state.empresas.map((e) => (
            <div key={e.id} className="flex items-center justify-between border-b border-line py-2 text-[13px]">
              {e.nome}
              <Badge tone={e.ativa ? "mint" : "mute"}>{e.ativa ? "Ativa" : "Inativa"}</Badge>
            </div>
          ))}
        </Card>
        <Card className="p-4">
          <p className="kicker mb-3">Clientes</p>
          {state.clientes.map((e) => (
            <div key={e.id} className="flex items-center justify-between border-b border-line py-2 text-[13px]">
              {e.nome}
              <Badge tone={e.ativo ? "mint" : "mute"}>{e.ativo ? "Ativo" : "Inativo"}</Badge>
            </div>
          ))}
        </Card>
        <Card className="p-4">
          <p className="kicker mb-3">Fornecedores</p>
          {state.fornecedores.map((e) => (
            <div key={e.id} className="border-b border-line py-2 text-[13px]">
              <p>{e.razaoSocial}</p>
              <p className="text-[12px] text-mute">{e.contato}</p>
            </div>
          ))}
        </Card>
      </div>
      <DataTable headers={["Terceirizado", "Especialidade", "R$/peça", "Status"]}>
        {state.terceirizados.map((t) => (
          <tr key={t.id}>
            <Td>{t.nome}</Td>
            <Td>{t.especialidade || "—"}</Td>
            <Td>{t.valorPorPeca > 0 ? t.valorPorPeca.toFixed(2) : "—"}</Td>
            <Td>{t.ativo ? "Ativo" : "Inativo"}</Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
