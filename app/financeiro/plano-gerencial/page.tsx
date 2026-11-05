"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CategoriasPanel,
  GruposDrePanel,
  PlanoContasPanel,
} from "@/components/financeiro/plano-gerencial-panels";
import { PageHeader, TabPanel, Tabs } from "@/components/ui";
import { useStore } from "@/lib/store/store";

const TABS = [
  { id: "categorias", label: "Categorias" },
  { id: "plano", label: "Plano de contas" },
  { id: "grupos", label: "Grupo DRE" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function parseTab(raw: string | null): TabId {
  if (raw === "plano" || raw === "plano-contas") return "plano";
  if (raw === "grupos" || raw === "grupos-dre" || raw === "grupo") return "grupos";
  return "categorias";
}

export default function PlanoGerencialPage() {
  const { isAdmin } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = useMemo(() => parseTab(searchParams.get("tab")), [searchParams]);

  const setTab = useCallback(
    (next: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  if (!isAdmin) return <p className="p-6 text-sm text-mute">Acesso restrito.</p>;

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Financeiro"
        title="Plano gerencial"
        description="Categorias, plano de contas e grupos da DRE. Cadastre na ordem: grupo → conta → categoria → lançamento."
      />

      <Tabs
        value={tab}
        onChange={setTab}
        items={[...TABS]}
        className="max-w-xl"
      />

      <TabPanel value={tab}>
        {tab === "categorias" ? <CategoriasPanel /> : null}
        {tab === "plano" ? <PlanoContasPanel /> : null}
        {tab === "grupos" ? <GruposDrePanel /> : null}
      </TabPanel>
    </div>
  );
}
