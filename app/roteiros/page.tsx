"use client";

import Link from "next/link";
import { ButtonLink, DataTable, PageHeader, Td } from "@/components/ui";
import { resumoRoteiro } from "@/components/ops/roteiro-builder";
import { useStore } from "@/lib/store/store";

export default function RoteirosPage() {
  const { state, isAdmin } = useStore();

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Produção"
        title="Roteiros"
        description="Modelos do caminho da peça. Use na OP ou crie um na hora."
        actions={isAdmin ? <ButtonLink href="/roteiros/novo">Novo roteiro</ButtonLink> : null}
      />
      {state.roteiros.length ? (
        <DataTable headers={["Nome", "Etapas", "Caminho"]}>
          {state.roteiros.map((r) => (
            <tr key={r.id}>
              <Td>
                <Link href={`/roteiros/${r.id}`} className="text-sky hover:underline">
                  {r.nome}
                </Link>
              </Td>
              <Td>{r.etapas.length}</Td>
              <Td>
                <p className="max-w-xl truncate text-mute">{resumoRoteiro(r.etapas) || "—"}</p>
              </Td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <p className="rounded-md border border-dashed border-line px-4 py-8 text-center text-[13px] text-mute">
          Nenhum roteiro ainda. Crie o primeiro para reutilizar nas OPs.
        </p>
      )}
    </div>
  );
}
